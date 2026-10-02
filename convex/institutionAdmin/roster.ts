import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { AuditAction, AuditActor } from "./validators";

type DbContext = Pick<QueryCtx, "db">;

// True once the one-time cutover to the database Pilot Roster has run.
export async function databaseRosterIsAuthoritative(ctx: DbContext) {
  return Boolean(
    await ctx.db
      .query("rosterAuthority")
      .withIndex("by_key", (query) => query.eq("key", "admission"))
      .unique(),
  );
}

// Identities are unique across institutions: one entry, one binding.
export async function findRosterEntry(ctx: DbContext, email: string) {
  return await ctx.db
    .query("rosterEntries")
    .withIndex("by_email", (query) => query.eq("email", email))
    .unique();
}

export async function recordAudit(
  ctx: Pick<MutationCtx, "db">,
  event: {
    institutionId: Id<"pilotInstitutions">;
    actor: AuditActor;
    action: AuditAction;
    rosterEntryId?: Id<"rosterEntries">;
    membershipId?: Id<"memberships">;
    learningGroupId?: Id<"learningGroups">;
    scenarioId?: Id<"scenarios">;
    before?: Doc<"auditEvents">["before"];
    after?: Doc<"auditEvents">["after"];
    counts?: Doc<"auditEvents">["counts"];
  },
) {
  await ctx.db.insert("auditEvents", { ...event, occurredAt: Date.now() });
}
