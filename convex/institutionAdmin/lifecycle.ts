import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { endAttempt } from "../attemptStart/model";
import { requireRole } from "../membershipAccess/authorization";
import type { MembershipView } from "../membershipAccess/model";
import { sameRoles, sortRoles, validRoles } from "./model";
import { recordAudit } from "./roster";
import type {
  AuditAction,
  MemberChangeResult,
  PendingRolesResult,
} from "./validators";

type ReadContext = Pick<QueryCtx, "auth" | "db">;

const isActive = (membership: Doc<"memberships">) =>
  (membership.status ?? "active") === "active";

/**
 * Lifecycle rules (slice 2):
 * - Only a current, active Institutional Admin acts, within their own
 *   institution, and never on their own roles or status.
 * - No change may leave the institution without an active Institutional
 *   Admin. The check reads every Membership in the institution, so two
 *   admins changing each other at once conflict and one is re-run.
 * - Removing Learner or deactivating ends any Active Attempt once with
 *   access_suspended. Records, bindings, and group associations are kept;
 *   reactivation never resumes an Attempt.
 */
export async function setMemberRoles(
  ctx: MutationCtx,
  input: { membershipId: string; roles: string[] },
): Promise<MemberChangeResult> {
  const admin = await requireRole(ctx, "institutionalAdmin");
  const target = await findTarget(ctx, admin, input.membershipId);
  if (!target) {
    return { status: "not_found" };
  }
  if (target._id === admin.id) {
    return { status: "self_change" };
  }
  const roles = validRoles(input.roles);
  if (!roles) {
    return { status: "invalid_roles" };
  }
  if (sameRoles(target.roles, roles)) {
    return { status: "unchanged" };
  }
  if (
    isActive(target) &&
    target.roles.includes("institutionalAdmin") &&
    !roles.includes("institutionalAdmin") &&
    (await otherActiveAdmins(ctx, target)) === 0
  ) {
    return { status: "last_admin" };
  }

  const now = Date.now();
  await ctx.db.patch(target._id, { roles });
  if (target.roles.includes("learner") && !roles.includes("learner")) {
    await suspendActiveAttempt(ctx, target._id, now);
  }
  await audit(ctx, admin, target, "member_roles_changed", {
    before: { roles: sortRoles(target.roles) },
    after: { roles },
  });
  return { status: "updated" };
}

export async function deactivateMember(
  ctx: MutationCtx,
  input: { membershipId: string },
): Promise<MemberChangeResult> {
  const admin = await requireRole(ctx, "institutionalAdmin");
  const target = await findTarget(ctx, admin, input.membershipId);
  if (!target) {
    return { status: "not_found" };
  }
  if (target._id === admin.id) {
    return { status: "self_change" };
  }
  if (!isActive(target)) {
    return { status: "unchanged" };
  }
  if (
    target.roles.includes("institutionalAdmin") &&
    (await otherActiveAdmins(ctx, target)) === 0
  ) {
    return { status: "last_admin" };
  }

  const now = Date.now();
  // The binding (WorkOS ID and roster entry) is preserved, so the identity
  // cannot be claimed again while deactivated.
  await ctx.db.patch(target._id, { status: "inactive", statusChangedAt: now });
  await suspendActiveAttempt(ctx, target._id, now);
  await audit(ctx, admin, target, "member_deactivated", {
    before: { membershipStatus: "active" },
    after: { membershipStatus: "inactive" },
  });
  return { status: "updated" };
}

export async function reactivateMember(
  ctx: MutationCtx,
  input: { membershipId: string },
): Promise<MemberChangeResult> {
  const admin = await requireRole(ctx, "institutionalAdmin");
  const target = await findTarget(ctx, admin, input.membershipId);
  if (!target) {
    return { status: "not_found" };
  }
  if (target._id === admin.id) {
    return { status: "self_change" };
  }
  if (isActive(target)) {
    return { status: "unchanged" };
  }
  await ctx.db.patch(target._id, { status: "active", statusChangedAt: Date.now() });
  await audit(ctx, admin, target, "member_reactivated", {
    before: { membershipStatus: "inactive" },
    after: { membershipStatus: "active" },
  });
  return { status: "updated" };
}

// Changes the initial roles of an approval that has not been used yet.
export async function setPendingRoles(
  ctx: MutationCtx,
  input: { rosterEntryId: string; roles: string[] },
): Promise<PendingRolesResult> {
  const admin = await requireRole(ctx, "institutionalAdmin");
  const entryId = ctx.db.normalizeId("rosterEntries", input.rosterEntryId);
  const entry = entryId ? await ctx.db.get(entryId) : null;
  if (!entry || entry.institutionId !== admin.institution.id || entry.status === "revoked") {
    return { status: "not_found" };
  }
  if (entry.status === "bound") {
    return { status: "already_member" };
  }
  const roles = validRoles(input.roles);
  if (!roles) {
    return { status: "invalid_roles" };
  }
  if (sameRoles(entry.roles, roles)) {
    return { status: "unchanged" };
  }
  await ctx.db.patch(entry._id, { roles, updatedAt: Date.now() });
  await recordAudit(ctx, {
    institutionId: admin.institution.id,
    actor: { kind: "member", membershipId: admin.id },
    action: "preapproval_roles_changed",
    rosterEntryId: entry._id,
    before: { status: "pending", roles: sortRoles(entry.roles) },
    after: { status: "pending", roles },
  });
  return { status: "updated" };
}

export type AuditEntry = {
  id: Id<"auditEvents">;
  occurredAt: number;
  action: AuditAction;
  actor: "member" | "operator" | "admission";
  actorEmail: string | null;
  targetEmail: string | null;
  groupName: string | null;
  scenarioTitle: string | null;
  before: NonNullable<Doc<"auditEvents">["before"]> | null;
  after: NonNullable<Doc<"auditEvents">["after"]> | null;
  counts: NonNullable<Doc<"auditEvents">["counts"]> | null;
};

// The institution's most recent changes, newest first.
export async function listAuditEvents(ctx: ReadContext): Promise<AuditEntry[]> {
  const admin = await requireRole(ctx, "institutionalAdmin");
  const events = await ctx.db
    .query("auditEvents")
    .withIndex("by_institution_time", (query) =>
      query.eq("institutionId", admin.institution.id),
    )
    .order("desc")
    .take(100);
  const emailOf = async (
    membershipId?: Id<"memberships">,
    rosterEntryId?: Id<"rosterEntries">,
  ) => {
    const membership = membershipId ? await ctx.db.get(membershipId) : null;
    if (membership && membership.institutionId === admin.institution.id) {
      return membership.rosterEmail;
    }
    const entry = rosterEntryId ? await ctx.db.get(rosterEntryId) : null;
    return entry && entry.institutionId === admin.institution.id ? entry.email : null;
  };
  const nameOf = async (learningGroupId?: Id<"learningGroups">) => {
    const group = learningGroupId ? await ctx.db.get(learningGroupId) : null;
    return group && group.institutionId === admin.institution.id ? group.name : null;
  };
  const titleOf = async (scenarioId?: Id<"scenarios">) => {
    const scenario = scenarioId ? await ctx.db.get(scenarioId) : null;
    return scenario && scenario.institutionId === admin.institution.id ? scenario.title : null;
  };
  const entries: AuditEntry[] = [];
  for (const event of events) {
    entries.push({
      id: event._id,
      occurredAt: event.occurredAt,
      action: event.action,
      actor: event.actor.kind,
      actorEmail:
        event.actor.kind === "member" ? await emailOf(event.actor.membershipId) : null,
      targetEmail: await emailOf(event.membershipId, event.rosterEntryId),
      groupName: await nameOf(event.learningGroupId),
      scenarioTitle: await titleOf(event.scenarioId),
      before: event.before ?? null,
      after: event.after ?? null,
      counts: event.counts ?? null,
    });
  }
  return entries;
}

async function findTarget(
  ctx: Pick<QueryCtx, "db">,
  admin: MembershipView,
  rawMembershipId: string,
) {
  const membershipId = ctx.db.normalizeId("memberships", rawMembershipId);
  const target = membershipId ? await ctx.db.get(membershipId) : null;
  return target && target.institutionId === admin.institution.id ? target : null;
}

async function otherActiveAdmins(
  ctx: Pick<QueryCtx, "db">,
  target: Doc<"memberships">,
) {
  const members = await ctx.db
    .query("memberships")
    .withIndex("by_institution_id", (query) =>
      query.eq("institutionId", target.institutionId),
    )
    .collect();
  return members.filter(
    (member) =>
      member._id !== target._id &&
      isActive(member) &&
      member.roles.includes("institutionalAdmin"),
  ).length;
}

// Ends the Member's Active Attempt, if any, through the common terminal
// transition, which also abandons open exchanges so late replies append
// nothing. No Formative Feedback is generated for a suspension.
async function suspendActiveAttempt(
  ctx: MutationCtx,
  membershipId: Id<"memberships">,
  now: number,
) {
  const active = await ctx.db
    .query("attempts")
    .withIndex("by_learner_status", (query) =>
      query.eq("learnerMembershipId", membershipId).eq("status", "active"),
    )
    .unique();
  if (active) {
    await endAttempt(ctx, active, "access_suspended", now);
  }
}

async function audit(
  ctx: MutationCtx,
  admin: MembershipView,
  target: Doc<"memberships">,
  action: AuditAction,
  change: {
    before: Doc<"auditEvents">["before"];
    after: Doc<"auditEvents">["after"];
  },
) {
  await recordAudit(ctx, {
    institutionId: admin.institution.id,
    actor: { kind: "member", membershipId: admin.id },
    action,
    membershipId: target._id,
    ...change,
  });
}
