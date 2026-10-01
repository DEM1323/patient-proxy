import { v, type Infer } from "convex/values";
import { membershipRoleValidator } from "../membershipAccess/roles";

// pending: approved, not yet admitted. bound: consumed by exactly one
// Membership, kept permanently so the identity cannot be claimed again.
// revoked: approval withdrawn before admission.
export const rosterEntryStatusValidator = v.union(
  v.literal("pending"),
  v.literal("bound"),
  v.literal("revoked"),
);

export const auditActionValidator = v.union(
  v.literal("roster_migrated"),
  v.literal("identity_preapproved"),
  v.literal("preapproval_revoked"),
  v.literal("identity_bound"),
  v.literal("institutional_admin_bootstrapped"),
);

// Who made a change: an Institutional Admin, a restricted operator command
// run with the deployment's admin key, or first sign-in admission.
export const auditActorValidator = v.union(
  v.object({ kind: v.literal("member"), membershipId: v.id("memberships") }),
  v.object({ kind: v.literal("operator") }),
  v.object({ kind: v.literal("admission") }),
);

const auditStateValidator = v.object({
  status: v.optional(rosterEntryStatusValidator),
  roles: v.optional(v.array(membershipRoleValidator)),
});

export const auditEventFields = {
  institutionId: v.id("pilotInstitutions"),
  occurredAt: v.number(),
  actor: auditActorValidator,
  action: auditActionValidator,
  rosterEntryId: v.optional(v.id("rosterEntries")),
  membershipId: v.optional(v.id("memberships")),
  before: v.optional(auditStateValidator),
  after: v.optional(auditStateValidator),
  // Aggregate counts only; never roster values.
  counts: v.optional(
    v.object({
      boundMemberships: v.number(),
      pendingApprovals: v.number(),
      alreadyPresent: v.number(),
    }),
  ),
};

export const preapproveResultValidator = v.union(
  v.object({ status: v.literal("preapproved"), rosterEntryId: v.id("rosterEntries") }),
  // Already pending here with different roles; lifecycle changes come later.
  v.object({ status: v.literal("already_pending") }),
  v.object({ status: v.literal("already_member") }),
  // Held elsewhere; deliberately says nothing about where.
  v.object({ status: v.literal("unavailable") }),
  v.object({ status: v.literal("roster_not_migrated") }),
  v.object({ status: v.literal("invalid_email") }),
  // Not a nonempty set of the four roles, each once.
  v.object({ status: v.literal("invalid_roles") }),
);

export const revokeResultValidator = v.union(
  v.object({ status: v.literal("revoked") }),
  // Binding won the race; the Membership is managed separately.
  v.object({ status: v.literal("already_member") }),
  v.object({ status: v.literal("not_found") }),
);

export type RosterEntryStatus = Infer<typeof rosterEntryStatusValidator>;
export type AuditAction = Infer<typeof auditActionValidator>;
export type AuditActor = Infer<typeof auditActorValidator>;
export type PreapproveResult = Infer<typeof preapproveResultValidator>;
export type RevokeResult = Infer<typeof revokeResultValidator>;
