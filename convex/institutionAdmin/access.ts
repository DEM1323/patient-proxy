import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import {
  membershipRoleValidator,
  membershipStatusValidator,
} from "../membershipAccess/roles";
import {
  deactivateMember,
  listAuditEvents,
  reactivateMember,
  setMemberRoles,
  setPendingRoles,
} from "./lifecycle";
import { getMembers, preapproveIdentity, revokePreapproval } from "./model";
import {
  auditActionValidator,
  auditCountsValidator,
  auditStateValidator,
  memberChangeResultValidator,
  pendingRolesResultValidator,
  preapproveResultValidator,
  revokeResultValidator,
} from "./validators";

// Every operation requires the caller's current, active Institutional Admin
// role and derives the Pilot Institution from that Membership; arguments
// never supply the actor or the scope. Identifiers arrive as plain strings
// so foreign and malformed ids get the same answer.
export const members = query({
  args: {},
  returns: v.object({
    rosterSource: v.union(v.literal("environment"), v.literal("database")),
    members: v.array(
      v.object({
        id: v.id("memberships"),
        email: v.string(),
        roles: v.array(membershipRoleValidator),
        admittedAt: v.number(),
        status: membershipStatusValidator,
        isYou: v.boolean(),
      }),
    ),
    pending: v.array(
      v.object({
        id: v.id("rosterEntries"),
        email: v.string(),
        roles: v.array(membershipRoleValidator),
        approvedAt: v.number(),
      }),
    ),
  }),
  handler: getMembers,
});

export const preapprove = mutation({
  args: { email: v.string(), roles: v.array(v.string()) },
  returns: preapproveResultValidator,
  handler: preapproveIdentity,
});

export const revoke = mutation({
  args: { rosterEntryId: v.string() },
  returns: revokeResultValidator,
  handler: revokePreapproval,
});

export const setPendingApprovalRoles = mutation({
  args: { rosterEntryId: v.string(), roles: v.array(v.string()) },
  returns: pendingRolesResultValidator,
  handler: setPendingRoles,
});

export const setRoles = mutation({
  args: { membershipId: v.string(), roles: v.array(v.string()) },
  returns: memberChangeResultValidator,
  handler: setMemberRoles,
});

export const deactivate = mutation({
  args: { membershipId: v.string() },
  returns: memberChangeResultValidator,
  handler: deactivateMember,
});

export const reactivate = mutation({
  args: { membershipId: v.string() },
  returns: memberChangeResultValidator,
  handler: reactivateMember,
});

export const auditLog = query({
  args: {},
  returns: v.array(
    v.object({
      id: v.id("auditEvents"),
      occurredAt: v.number(),
      action: auditActionValidator,
      actor: v.union(v.literal("member"), v.literal("operator"), v.literal("admission")),
      actorEmail: v.union(v.null(), v.string()),
      targetEmail: v.union(v.null(), v.string()),
      groupName: v.union(v.null(), v.string()),
      scenarioTitle: v.union(v.null(), v.string()),
      before: v.union(v.null(), auditStateValidator),
      after: v.union(v.null(), auditStateValidator),
      counts: v.union(v.null(), auditCountsValidator),
    }),
  ),
  handler: listAuditEvents,
});
