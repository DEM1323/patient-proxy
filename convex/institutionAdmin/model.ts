import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { requireRole } from "../membershipAccess/authorization";
import { normalizeRosterEmail } from "../membershipAccess/roster";
import { isMembershipRole, type MembershipRole } from "../membershipAccess/roles";
import {
  databaseRosterIsAuthoritative,
  findRosterEntry,
  recordAudit,
} from "./roster";
import type { PreapproveResult, RevokeResult } from "./validators";

type ReadContext = Pick<QueryCtx, "auth" | "db">;

const roleOrder: MembershipRole[] = [
  "learner",
  "faculty",
  "author",
  "institutionalAdmin",
];
const maxEmailLength = 254;
const emailShape = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type MembersView = {
  // "environment" until the operator cutover; approvals need the database.
  rosterSource: "environment" | "database";
  members: {
    id: Id<"memberships">;
    email: string;
    roles: MembershipRole[];
    admittedAt: number;
  }[];
  pending: {
    id: Id<"rosterEntries">;
    email: string;
    roles: MembershipRole[];
    approvedAt: number;
  }[];
};

/**
 * Members and pending approvals in the caller's own Pilot Institution. The
 * institution always comes from the caller's Membership, never an argument.
 */
export async function getMembers(ctx: ReadContext): Promise<MembersView> {
  const admin = await requireRole(ctx, "institutionalAdmin");
  const institutionId = admin.institution.id;
  const memberships = await ctx.db
    .query("memberships")
    .withIndex("by_institution_id", (query) =>
      query.eq("institutionId", institutionId),
    )
    .collect();
  const pending = await ctx.db
    .query("rosterEntries")
    .withIndex("by_institution_status", (query) =>
      query.eq("institutionId", institutionId).eq("status", "pending"),
    )
    .collect();
  return {
    rosterSource: (await databaseRosterIsAuthoritative(ctx))
      ? "database"
      : "environment",
    members: memberships
      .map((membership) => ({
        id: membership._id,
        email: membership.rosterEmail,
        roles: sortRoles(membership.roles),
        admittedAt: membership.createdAt,
      }))
      .sort((a, b) => a.email.localeCompare(b.email)),
    pending: pending
      .map((entry) => ({
        id: entry._id,
        email: entry.email,
        roles: sortRoles(entry.roles),
        approvedAt: entry.createdAt,
      }))
      .sort((a, b) => a.email.localeCompare(b.email)),
  };
}

/**
 * Pre-approves an exact identity with any nonempty combination of the four
 * additive roles. No email is sent. Retrying the same approval is a no-op.
 */
export async function preapproveIdentity(
  ctx: MutationCtx,
  input: { email: string; roles: string[] },
): Promise<PreapproveResult> {
  const admin = await requireRole(ctx, "institutionalAdmin");
  const roles = validRoles(input.roles);
  if (!roles) {
    return { status: "invalid_roles" };
  }
  const email = normalizeRosterEmail(input.email);
  if (email.length > maxEmailLength || !emailShape.test(email)) {
    return { status: "invalid_email" };
  }
  if (!(await databaseRosterIsAuthoritative(ctx))) {
    return { status: "roster_not_migrated" };
  }

  const existing = await findRosterEntry(ctx, email);
  const alreadyMember = await ctx.db
    .query("memberships")
    .withIndex("by_roster_email", (query) => query.eq("rosterEmail", email))
    .first();
  const now = Date.now();
  if (alreadyMember || existing?.status === "bound") {
    const institutionId = alreadyMember?.institutionId ?? existing!.institutionId;
    return institutionId === admin.institution.id
      ? { status: "already_member" }
      : { status: "unavailable" };
  }
  if (existing && existing.institutionId !== admin.institution.id) {
    return { status: "unavailable" };
  }
  if (existing?.status === "pending") {
    return sameRoles(existing.roles, roles)
      ? { status: "preapproved", rosterEntryId: existing._id }
      : { status: "already_pending" };
  }

  let rosterEntryId: Id<"rosterEntries">;
  if (existing) {
    // A revoked, never-bound approval in this institution can be renewed.
    rosterEntryId = existing._id;
    await ctx.db.patch(existing._id, { roles, status: "pending", updatedAt: now });
  } else {
    rosterEntryId = await ctx.db.insert("rosterEntries", {
      institutionId: admin.institution.id,
      email,
      roles,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });
  }
  await recordAudit(ctx, {
    institutionId: admin.institution.id,
    actor: { kind: "member", membershipId: admin.id },
    action: "identity_preapproved",
    rosterEntryId,
    before: existing ? { status: existing.status, roles: existing.roles } : undefined,
    after: { status: "pending", roles },
  });
  return { status: "preapproved", rosterEntryId };
}

/**
 * Withdraws a pending approval. If admission bound the identity first, the
 * existing Membership is untouched; lifecycle changes are a separate slice.
 */
export async function revokePreapproval(
  ctx: MutationCtx,
  input: { rosterEntryId: string },
): Promise<RevokeResult> {
  const admin = await requireRole(ctx, "institutionalAdmin");
  const entryId = ctx.db.normalizeId("rosterEntries", input.rosterEntryId);
  const entry = entryId ? await ctx.db.get(entryId) : null;
  if (!entry || entry.institutionId !== admin.institution.id) {
    return { status: "not_found" };
  }
  if (entry.status === "bound") {
    return { status: "already_member" };
  }
  if (entry.status === "pending") {
    await ctx.db.patch(entry._id, { status: "revoked", updatedAt: Date.now() });
    await recordAudit(ctx, {
      institutionId: admin.institution.id,
      actor: { kind: "member", membershipId: admin.id },
      action: "preapproval_revoked",
      rosterEntryId: entry._id,
      before: { status: "pending", roles: entry.roles },
      after: { status: "revoked" },
    });
  }
  return { status: "revoked" };
}

// A nonempty set of the four roles, each once; null otherwise.
function validRoles(roles: string[]): MembershipRole[] | null {
  if (
    roles.length === 0 ||
    new Set(roles).size !== roles.length ||
    !roles.every(isMembershipRole)
  ) {
    return null;
  }
  return sortRoles(roles as MembershipRole[]);
}

function sortRoles(roles: MembershipRole[]) {
  return [...roles].sort((a, b) => roleOrder.indexOf(a) - roleOrder.indexOf(b));
}

function sameRoles(a: MembershipRole[], b: MembershipRole[]) {
  const sortedA = sortRoles(a);
  const sortedB = sortRoles(b);
  return sortedA.length === sortedB.length && sortedA.every((role, i) => role === sortedB[i]);
}
