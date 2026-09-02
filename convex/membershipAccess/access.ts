import { WorkOS } from "@workos-inc/node";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import {
  action,
  internalMutation,
  internalQuery,
  query,
} from "../_generated/server";
import {
  admitWorkosUser,
  getCurrentMembership,
  getMembershipForWorkosUserId,
  type AdmissionResult,
  type MembershipView,
} from "./model";
import { membershipRoleValidator } from "./roles";

const membershipViewValidator = v.object({
  id: v.id("memberships"),
  institution: v.object({
    id: v.id("pilotInstitutions"),
    key: v.string(),
    name: v.string(),
  }),
  roles: v.array(membershipRoleValidator),
});

const admissionResultValidator = v.union(
  v.object({
    status: v.literal("admitted"),
    membership: membershipViewValidator,
  }),
  v.object({
    status: v.literal("denied"),
    reason: v.union(
      v.literal("email_not_verified"),
      v.literal("not_on_roster"),
      v.literal("roster_entry_already_bound"),
    ),
  }),
);

export const currentMembership = query({
  args: {},
  returns: v.union(v.null(), membershipViewValidator),
  handler: getCurrentMembership,
});

export const enterPilot = action({
  args: {},
  returns: admissionResultValidator,
  handler: async (ctx): Promise<AdmissionResult> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    const existingMembership: MembershipView | null = await ctx.runQuery(
      internal.membershipAccess.access.membershipByWorkosUserId,
      { workosUserId: identity.subject },
    );
    if (existingMembership) {
      return { status: "admitted" as const, membership: existingMembership };
    }

    const apiKey = process.env.WORKOS_API_KEY?.trim();
    if (!apiKey) {
      throw new Error("WORKOS_API_KEY is not configured");
    }

    const user = await new WorkOS(apiKey).userManagement.getUser(identity.subject);
    return await ctx.runMutation(
      internal.membershipAccess.access.bindPilotRosterEntry,
      {
        workosUserId: identity.subject,
        email: user.email,
        emailVerified: user.emailVerified,
      },
    );
  },
});

export const membershipByWorkosUserId = internalQuery({
  args: { workosUserId: v.string() },
  returns: v.union(v.null(), membershipViewValidator),
  handler: (ctx, { workosUserId }) =>
    getMembershipForWorkosUserId(ctx, workosUserId),
});

export const bindPilotRosterEntry = internalMutation({
  args: {
    workosUserId: v.string(),
    email: v.string(),
    emailVerified: v.boolean(),
  },
  returns: admissionResultValidator,
  handler: (ctx, input) => {
    const rawRoster = process.env.PILOT_ROSTER_JSON?.trim();
    if (!rawRoster) {
      throw new Error("PILOT_ROSTER_JSON is not configured");
    }
    return admitWorkosUser(ctx, { ...input, rawRoster });
  },
});
