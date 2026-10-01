import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { membershipRoleValidator } from "../membershipAccess/roles";
import { getMembers, preapproveIdentity, revokePreapproval } from "./model";
import { preapproveResultValidator, revokeResultValidator } from "./validators";

// Every operation requires the caller's current Institutional Admin role and
// derives the Pilot Institution from that Membership; arguments never supply
// the actor or the scope.
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

// Entry identifiers arrive as plain strings so foreign and malformed ids get
// the same answer.
export const revoke = mutation({
  args: { rosterEntryId: v.string() },
  returns: revokeResultValidator,
  handler: revokePreapproval,
});
