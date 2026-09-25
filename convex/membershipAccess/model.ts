import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import {
  pilotInstitutionNames,
  type PilotInstitutionKey,
} from "./pilotInstitutions";
import { normalizeRosterEmail, parsePilotRoster } from "./roster";
import type { MembershipRole } from "./roles";

export type MembershipView = {
  id: Id<"memberships">;
  institution: {
    id: Id<"pilotInstitutions">;
    key: string;
    name: string;
  };
  roles: MembershipRole[];
};

export type AdmissionResult =
  | { status: "admitted"; membership: MembershipView }
  | {
      status: "denied";
      reason:
        | "email_not_verified"
        | "not_on_roster"
        | "roster_entry_already_bound";
    };

export type MembershipReadContext = Pick<QueryCtx, "auth" | "db">;

export async function getCurrentMembership(ctx: MembershipReadContext) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Authentication required");
  }

  const membership = await findMembershipByWorkosUserId(ctx, identity.subject);
  return membership ? await toMembershipView(ctx, membership) : null;
}

export async function getMembershipForWorkosUserId(
  ctx: Pick<MembershipReadContext, "db">,
  workosUserId: string,
) {
  const membership = await findMembershipByWorkosUserId(ctx, workosUserId);
  return membership ? await toMembershipView(ctx, membership) : null;
}

export async function admitWorkosUser(
  ctx: MutationCtx,
  input: {
    workosUserId: string;
    email: string;
    emailVerified: boolean;
    rawRoster: string;
  },
): Promise<AdmissionResult> {
  const existingMembership = await findMembershipByWorkosUserId(
    ctx,
    input.workosUserId,
  );
  if (existingMembership) {
    return {
      status: "admitted",
      membership: await toMembershipView(ctx, existingMembership),
    };
  }

  if (!input.emailVerified) {
    return { status: "denied", reason: "email_not_verified" };
  }

  const roster = parsePilotRoster(input.rawRoster);
  const rosterEmail = normalizeRosterEmail(input.email);
  const rosterEntry = roster.entries.find((entry) => entry.email === rosterEmail);
  if (!rosterEntry) {
    return { status: "denied", reason: "not_on_roster" };
  }

  const consumedEntry = await ctx.db
    .query("memberships")
    .withIndex("by_roster_email", (query) => query.eq("rosterEmail", rosterEmail))
    .unique();
  if (consumedEntry) {
    return { status: "denied", reason: "roster_entry_already_bound" };
  }

  const institution = await ensurePilotInstitution(ctx, rosterEntry.institutionKey);
  const membershipId = await ctx.db.insert("memberships", {
    workosUserId: input.workosUserId,
    rosterEmail,
    institutionId: institution._id,
    roles: rosterEntry.roles,
    createdAt: Date.now(),
  });

  return {
    status: "admitted",
    membership: {
      id: membershipId,
      institution: {
        id: institution._id,
        key: institution.key,
        name: institution.name,
      },
      roles: rosterEntry.roles,
    },
  };
}

async function findMembershipByWorkosUserId(
  ctx: Pick<MembershipReadContext, "db">,
  workosUserId: string,
) {
  return await ctx.db
    .query("memberships")
    .withIndex("by_workos_user_id", (query) =>
      query.eq("workosUserId", workosUserId),
    )
    .unique();
}

export async function ensurePilotInstitution(
  ctx: MutationCtx,
  institutionKey: PilotInstitutionKey,
) {
  const existing = await ctx.db
    .query("pilotInstitutions")
    .withIndex("by_key", (query) => query.eq("key", institutionKey))
    .unique();
  if (existing) {
    return existing;
  }

  const name = pilotInstitutionNames[institutionKey];
  const institutionId = await ctx.db.insert("pilotInstitutions", {
    key: institutionKey,
    name,
  });
  return (await ctx.db.get(institutionId))!;
}

async function toMembershipView(
  ctx: Pick<MembershipReadContext, "db">,
  membership: Doc<"memberships">,
): Promise<MembershipView> {
  const institution = await ctx.db.get(membership.institutionId);
  if (!institution) {
    throw new Error("Membership Pilot Institution is missing");
  }

  return {
    id: membership._id,
    institution: {
      id: institution._id,
      key: institution.key,
      name: institution.name,
    },
    roles: membership.roles,
  };
}
