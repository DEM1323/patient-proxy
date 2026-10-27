import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { internalMutation } from "../_generated/server";
import { ensurePilotInstitution } from "../membershipAccess/model";
import { parsePilotRoster } from "../membershipAccess/roster";
import { findRosterEntry, recordAudit } from "./roster";

/**
 * Restricted operator command (deployment admin key only):
 *
 *   npx convex run institutionAdmin/operator:cutOverToDatabaseRoster
 *
 * Imports the protected environment roster inside Convex and switches
 * admission to the database roster in one transaction, so no admission can
 * race the cutover. Every existing Membership keeps its ID, WorkOS binding,
 * institution, and current roles, and gains a bound entry, including Members
 * absent from the environment roster. Unbound roster identities become
 * pending approvals with their listed roles. Returns aggregate counts only;
 * rerunning after cutover changes nothing and reports when it happened. A
 * missing, blank, or invalid environment roster refuses before any write.
 */
export const cutOverToDatabaseRoster = internalMutation({
  args: {},
  returns: v.union(
    v.object({
      status: v.literal("cut_over"),
      boundMemberships: v.number(),
      pendingApprovals: v.number(),
      alreadyPresent: v.number(),
    }),
    // Nothing was imported by this run; the cutover happened at cutoverAt.
    v.object({ status: v.literal("already_cut_over"), cutoverAt: v.number() }),
  ),
  handler: async (ctx) => {
    const authority = await ctx.db
      .query("rosterAuthority")
      .withIndex("by_key", (query) => query.eq("key", "admission"))
      .unique();
    if (authority) {
      return { status: "already_cut_over" as const, cutoverAt: authority.cutoverAt };
    }
    // Validate the source before any write. A missing, blank, or invalid
    // roster must not cut over, or its pending identities would be lost for
    // good. Errors name the problem but never roster values.
    const raw = process.env.PILOT_ROSTER_JSON?.trim();
    if (!raw) {
      throw new Error(
        "PILOT_ROSTER_JSON is not configured; refusing to cut over. No changes were made.",
      );
    }
    let roster: ReturnType<typeof parsePilotRoster>;
    try {
      roster = parsePilotRoster(raw);
    } catch {
      throw new Error(
        "PILOT_ROSTER_JSON is invalid; refusing to cut over. Validate it privately. No changes were made.",
      );
    }

    const counts = { boundMemberships: 0, pendingApprovals: 0, alreadyPresent: 0 };
    const now = Date.now();
    const perInstitution = new Map<Id<"pilotInstitutions">, typeof counts>();
    const tally = (
      institutionId: Id<"pilotInstitutions">,
      key: keyof typeof counts,
    ) => {
      counts[key] += 1;
      const entry = perInstitution.get(institutionId) ?? {
        boundMemberships: 0,
        pendingApprovals: 0,
        alreadyPresent: 0,
      };
      entry[key] += 1;
      perInstitution.set(institutionId, entry);
    };

    // Bindings first: a Membership's current roles are authoritative and
    // are never reconciled from old roster values.
    for (const membership of await ctx.db.query("memberships").collect()) {
      if (await findRosterEntry(ctx, membership.rosterEmail)) {
        tally(membership.institutionId, "alreadyPresent");
        continue;
      }
      await ctx.db.insert("rosterEntries", {
        institutionId: membership.institutionId,
        email: membership.rosterEmail,
        roles: membership.roles,
        status: "bound",
        membershipId: membership._id,
        createdAt: membership.createdAt,
        updatedAt: now,
      });
      tally(membership.institutionId, "boundMemberships");
    }

    for (const entry of roster.entries) {
      const institution = await ensurePilotInstitution(ctx, entry.institutionKey);
      if (await findRosterEntry(ctx, entry.email)) {
        tally(institution._id, "alreadyPresent");
        continue;
      }
      await ctx.db.insert("rosterEntries", {
        institutionId: institution._id,
        email: entry.email,
        roles: entry.roles,
        status: "pending",
        createdAt: now,
        updatedAt: now,
      });
      tally(institution._id, "pendingApprovals");
    }

    await ctx.db.insert("rosterAuthority", {
      key: "admission",
      source: "database",
      cutoverAt: now,
    });
    for (const [institutionId, institutionCounts] of perInstitution) {
      await recordAudit(ctx, {
        institutionId,
        actor: { kind: "operator" },
        action: "roster_migrated",
        counts: institutionCounts,
      });
    }
    return { status: "cut_over" as const, ...counts };
  },
});

/**
 * Restricted operator command that makes one explicitly designated, already
 * admitted Membership its institution's first Institutional Admin:
 *
 *   npx convex run institutionAdmin/operator:bootstrapInstitutionalAdmin '{"membershipId":"..."}'
 *
 * Other roles are preserved. It refuses once the institution has an
 * Institutional Admin, who manages further roles inside Patient Proxy.
 */
export const bootstrapInstitutionalAdmin = internalMutation({
  args: { membershipId: v.id("memberships") },
  returns: v.union(
    v.object({ status: v.literal("granted") }),
    v.object({ status: v.literal("institution_has_admin") }),
  ),
  handler: async (ctx, { membershipId }) => {
    const membership = await ctx.db.get(membershipId);
    if (!membership) {
      throw new Error("Membership not found");
    }
    const members = await ctx.db
      .query("memberships")
      .withIndex("by_institution_id", (query) =>
        query.eq("institutionId", membership.institutionId),
      )
      .collect();
    if (members.some(({ roles }) => roles.includes("institutionalAdmin"))) {
      return { status: "institution_has_admin" as const };
    }
    const roles = [...membership.roles, "institutionalAdmin" as const];
    await ctx.db.patch(membershipId, { roles });
    await recordAudit(ctx, {
      institutionId: membership.institutionId,
      actor: { kind: "operator" },
      action: "institutional_admin_bootstrapped",
      membershipId,
      before: { roles: membership.roles },
      after: { roles },
    });
    return { status: "granted" as const };
  },
});

/**
 * Restricted, audited operator recovery (deployment admin key only), for an
 * institution whose administration is unusable, e.g. its only Institutional
 * Admin lost access:
 *
 *   npx convex run institutionAdmin/operator:recoverInstitutionalAdmin '{"membershipId":"..."}'
 *
 * Reactivates the explicitly designated Membership and adds the role,
 * preserving its other roles. There is no browser path to this command.
 */
export const recoverInstitutionalAdmin = internalMutation({
  args: { membershipId: v.id("memberships") },
  returns: v.object({ status: v.union(v.literal("recovered"), v.literal("unchanged")) }),
  handler: async (ctx, { membershipId }) => {
    const membership = await ctx.db.get(membershipId);
    if (!membership) {
      throw new Error("Membership not found");
    }
    const wasActive = (membership.status ?? "active") === "active";
    if (wasActive && membership.roles.includes("institutionalAdmin")) {
      return { status: "unchanged" as const };
    }
    const roles = membership.roles.includes("institutionalAdmin")
      ? membership.roles
      : [...membership.roles, "institutionalAdmin" as const];
    await ctx.db.patch(membershipId, {
      roles,
      status: "active",
      statusChangedAt: Date.now(),
    });
    await recordAudit(ctx, {
      institutionId: membership.institutionId,
      actor: { kind: "operator" },
      action: "institutional_admin_recovered",
      membershipId,
      before: {
        roles: membership.roles,
        membershipStatus: wasActive ? "active" : "inactive",
      },
      after: { roles, membershipStatus: "active" },
    });
    return { status: "recovered" as const };
  },
});
