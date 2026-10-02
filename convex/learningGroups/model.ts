import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { recordAudit } from "../institutionAdmin/roster";
import {
  requireMembership,
  requireRole,
} from "../membershipAccess/authorization";
import type { MembershipView } from "../membershipAccess/model";
import type { MembershipRole, MembershipStatus } from "../membershipAccess/roles";

type ReadContext = Pick<QueryCtx, "auth" | "db">;

const maxGroupNameLength = 80;

export type LearningGroupsView = {
  // Institutional Admins manage groups and enrollment; Faculty only change
  // availability for groups they belong to.
  canManageGroups: boolean;
  groups: {
    id: Id<"learningGroups">;
    name: string;
    canChangeAvailability: boolean;
    members: {
      id: Id<"memberships">;
      email: string;
      roles: MembershipRole[];
      status: MembershipStatus;
    }[];
    availableScenarioIds: Id<"scenarios">[];
  }[];
  // Published Scenarios that can be made available.
  scenarios: { id: Id<"scenarios">; title: string }[];
  // Active enrollment candidates; Institutional Admins only.
  institutionMembers: {
    id: Id<"memberships">;
    email: string;
    roles: MembershipRole[];
    status: MembershipStatus;
  }[];
};

/**
 * The caller's Learning Groups: every group in the Pilot Institution for an
 * Institutional Admin, otherwise the groups a Faculty Member currently
 * belongs to. Other roles are refused.
 */
export async function getLearningGroups(
  ctx: ReadContext,
): Promise<LearningGroupsView> {
  const { member, isAdmin } = await requireGroupReader(ctx);
  const institutionId = member.institution.id;
  const groups = isAdmin
    ? await ctx.db
        .query("learningGroups")
        .withIndex("by_institution_key", (query) =>
          query.eq("institutionId", institutionId),
        )
        .collect()
    : await groupsOf(ctx, member);

  const views: LearningGroupsView["groups"] = [];
  for (const group of groups.sort((a, b) => a.name.localeCompare(b.name))) {
    const memberRows = await ctx.db
      .query("learningGroupMembers")
      .withIndex("by_group_membership", (query) =>
        query.eq("learningGroupId", group._id),
      )
      .collect();
    const members = [];
    for (const row of memberRows) {
      const membership = await ctx.db.get(row.membershipId);
      if (membership && membership.institutionId === institutionId) {
        members.push(toMemberView(membership));
      }
    }
    const availability = await ctx.db
      .query("scenarioAvailabilities")
      .withIndex("by_group_scenario", (query) =>
        query.eq("learningGroupId", group._id),
      )
      .collect();
    views.push({
      id: group._id,
      name: group.name,
      // Faculty see only their own groups, so they can change each one.
      canChangeAvailability: true,
      members: members.sort((a, b) => a.email.localeCompare(b.email)),
      availableScenarioIds: availability
        .filter((row) => row.institutionId === institutionId)
        .map(({ scenarioId }) => scenarioId),
    });
  }

  const scenarios = await ctx.db
    .query("scenarios")
    .withIndex("by_institution_key", (query) =>
      query.eq("institutionId", institutionId),
    )
    .collect();
  const institutionMembers = isAdmin
    ? (
        await ctx.db
          .query("memberships")
          .withIndex("by_institution_id", (query) =>
            query.eq("institutionId", institutionId),
          )
          .collect()
      )
        .map(toMemberView)
        .filter(({ status }) => status === "active")
        .sort((a, b) => a.email.localeCompare(b.email))
    : [];

  return {
    canManageGroups: isAdmin,
    groups: views,
    scenarios: scenarios
      .filter(isPublished)
      .map(({ _id, title }) => ({ id: _id, title }))
      .sort((a, b) => a.title.localeCompare(b.title)),
    institutionMembers,
  };
}

export async function createLearningGroup(
  ctx: MutationCtx,
  input: { name: string },
): Promise<
  | { status: "created"; learningGroupId: Id<"learningGroups"> }
  | { status: "invalid_name" }
  | { status: "duplicate_name" }
> {
  const admin = await requireRole(ctx, "institutionalAdmin");
  const name = input.name.trim().replace(/\s+/g, " ");
  if (name.length === 0 || name.length > maxGroupNameLength) {
    return { status: "invalid_name" };
  }
  const existing = await ctx.db
    .query("learningGroups")
    .withIndex("by_institution_key", (query) =>
      query.eq("institutionId", admin.institution.id),
    )
    .collect();
  if (existing.some((group) => group.name.toLowerCase() === name.toLowerCase())) {
    return { status: "duplicate_name" };
  }
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "group";
  const keys = new Set(existing.map(({ key }) => key));
  let key = base;
  for (let suffix = 2; keys.has(key); suffix += 1) {
    key = `${base}-${suffix}`;
  }
  const learningGroupId = await ctx.db.insert("learningGroups", {
    institutionId: admin.institution.id,
    key,
    name,
  });
  await recordAudit(ctx, {
    institutionId: admin.institution.id,
    actor: { kind: "member", membershipId: admin.id },
    action: "learning_group_created",
    learningGroupId,
  });
  return { status: "created", learningGroupId };
}

// Enrolls or removes a Member. Removal revokes Faculty review through this
// group immediately, but never ends an Active Attempt. A deactivated Member
// can be removed but not enrolled, so reactivation never grants a group the
// admin added while they were inactive.
export async function setGroupMembership(
  ctx: MutationCtx,
  input: { learningGroupId: string; membershipId: string; enrolled: boolean },
): Promise<{ status: "updated" | "unchanged" | "not_found" | "inactive" }> {
  const admin = await requireRole(ctx, "institutionalAdmin");
  const group = await findGroup(ctx, admin, input.learningGroupId);
  const membershipId = ctx.db.normalizeId("memberships", input.membershipId);
  const membership = membershipId ? await ctx.db.get(membershipId) : null;
  if (!group || !membership || membership.institutionId !== admin.institution.id) {
    return { status: "not_found" };
  }
  const existing = await ctx.db
    .query("learningGroupMembers")
    .withIndex("by_group_membership", (query) =>
      query.eq("learningGroupId", group._id).eq("membershipId", membership._id),
    )
    .first();
  if (Boolean(existing) === input.enrolled) {
    return { status: "unchanged" };
  }
  if (input.enrolled && membership.status === "inactive") {
    return { status: "inactive" };
  }
  if (existing) {
    await ctx.db.delete(existing._id);
  } else {
    await ctx.db.insert("learningGroupMembers", {
      institutionId: admin.institution.id,
      learningGroupId: group._id,
      membershipId: membership._id,
    });
  }
  await recordAudit(ctx, {
    institutionId: admin.institution.id,
    actor: { kind: "member", membershipId: admin.id },
    action: input.enrolled ? "group_member_added" : "group_member_removed",
    learningGroupId: group._id,
    membershipId: membership._id,
  });
  return { status: "updated" };
}

/**
 * Makes a Published Scenario available to a Learning Group, or removes it.
 * Institutional Admins may change any group in the institution; Faculty only
 * groups they currently belong to (accepted policy, issue #4). Removal blocks
 * future starts and revokes Faculty review through this group immediately,
 * but never ends an Active Attempt.
 */
export async function setScenarioAvailability(
  ctx: MutationCtx,
  input: { learningGroupId: string; scenarioId: string; available: boolean },
): Promise<{ status: "updated" | "unchanged" | "not_found" }> {
  const { member, isAdmin } = await requireGroupReader(ctx);
  const group = await findGroup(ctx, member, input.learningGroupId);
  const scenarioId = ctx.db.normalizeId("scenarios", input.scenarioId);
  const scenario = scenarioId ? await ctx.db.get(scenarioId) : null;
  if (
    !group ||
    !scenario ||
    scenario.institutionId !== member.institution.id ||
    !isPublished(scenario)
  ) {
    return { status: "not_found" };
  }
  if (!isAdmin && !(await belongsTo(ctx, member, group._id))) {
    // Faculty outside the group get the same answer as a foreign group.
    return { status: "not_found" };
  }
  const existing = await ctx.db
    .query("scenarioAvailabilities")
    .withIndex("by_group_scenario", (query) =>
      query.eq("learningGroupId", group._id).eq("scenarioId", scenario._id),
    )
    .first();
  if (Boolean(existing) === input.available) {
    return { status: "unchanged" };
  }
  if (existing) {
    await ctx.db.delete(existing._id);
  } else {
    await ctx.db.insert("scenarioAvailabilities", {
      institutionId: member.institution.id,
      learningGroupId: group._id,
      scenarioId: scenario._id,
    });
  }
  await recordAudit(ctx, {
    institutionId: member.institution.id,
    actor: { kind: "member", membershipId: member.id },
    action: input.available ? "scenario_made_available" : "scenario_availability_removed",
    learningGroupId: group._id,
    scenarioId: scenario._id,
  });
  return { status: "updated" };
}

async function requireGroupReader(ctx: ReadContext) {
  const member = await requireMembership(ctx);
  const isAdmin = member.roles.includes("institutionalAdmin");
  if (!isAdmin && !member.roles.includes("faculty")) {
    throw new Error("Faculty or Institutional Admin role required");
  }
  return { member, isAdmin };
}

async function findGroup(
  ctx: Pick<QueryCtx, "db">,
  member: MembershipView,
  rawGroupId: string,
) {
  const groupId = ctx.db.normalizeId("learningGroups", rawGroupId);
  const group = groupId ? await ctx.db.get(groupId) : null;
  return group && group.institutionId === member.institution.id ? group : null;
}

async function groupsOf(ctx: Pick<QueryCtx, "db">, member: MembershipView) {
  const rows = await ctx.db
    .query("learningGroupMembers")
    .withIndex("by_membership", (query) => query.eq("membershipId", member.id))
    .collect();
  const groups: Doc<"learningGroups">[] = [];
  for (const row of rows) {
    const group = await ctx.db.get(row.learningGroupId);
    if (group && group.institutionId === member.institution.id) {
      groups.push(group);
    }
  }
  return groups;
}

async function belongsTo(
  ctx: Pick<QueryCtx, "db">,
  member: MembershipView,
  learningGroupId: Id<"learningGroups">,
) {
  const row = await ctx.db
    .query("learningGroupMembers")
    .withIndex("by_group_membership", (query) =>
      query.eq("learningGroupId", learningGroupId).eq("membershipId", member.id),
    )
    .first();
  return Boolean(row && row.institutionId === member.institution.id);
}

function isPublished(scenario: Doc<"scenarios">) {
  return scenario.status === "published" && Boolean(scenario.currentVersionId);
}

function toMemberView(membership: Doc<"memberships">) {
  return {
    id: membership._id,
    email: membership.rosterEmail,
    roles: membership.roles,
    status: membership.status ?? ("active" as const),
  };
}
