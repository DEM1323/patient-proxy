import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import schema from "../schema";
import { admitWorkosUser } from "../membershipAccess/model";
import { modules } from "../test.setup";

// Synthetic identities only.
const environmentRoster = JSON.stringify({
  version: 1,
  entries: [
    { email: "admin@example.edu", institutionKey: "umb", roles: ["faculty"] },
    { email: "learner@example.edu", institutionKey: "umb", roles: ["learner"] },
    { email: "not-yet@example.edu", institutionKey: "umb", roles: ["learner"] },
  ],
});
const allRoles = ["learner", "faculty", "author", "institutionalAdmin"];

async function setup() {
  vi.stubEnv("PILOT_ROSTER_JSON", environmentRoster);
  const t = convexTest(schema, modules);
  const signIn = (workosUserId: string, email: string, emailVerified = true) =>
    t.run((ctx) =>
      admitWorkosUser(ctx, {
        workosUserId,
        email,
        emailVerified,
        rawRoster: process.env.PILOT_ROSTER_JSON,
      }),
    );
  // Admitted before cutover, through the environment roster.
  const admin = await signIn("user_admin", "admin@example.edu");
  const learner = await signIn("user_learner", "learner@example.edu");
  const adminId = (admin as { membership: { id: Id<"memberships"> } }).membership.id;
  const learnerId = (learner as { membership: { id: Id<"memberships"> } }).membership.id;
  // A Member who is absent from the environment roster.
  const unlisted = await t.run(async (ctx) =>
    ctx.db.insert("memberships", {
      workosUserId: "user_unlisted",
      rosterEmail: "unlisted@example.edu",
      institutionId: (await ctx.db.get(adminId))!.institutionId,
      roles: ["author"],
      createdAt: Date.now(),
    }),
  );
  const cutOver = () =>
    t.mutation(internal.institutionAdmin.operator.cutOverToDatabaseRoster, {});
  const bootstrap = (membershipId: Id<"memberships">) =>
    t.mutation(internal.institutionAdmin.operator.bootstrapInstitutionalAdmin, {
      membershipId,
    });
  const asAdmin = t.withIdentity({ subject: "user_admin" });
  const asLearner = t.withIdentity({ subject: "user_learner" });
  const preapprove = (email: string, roles: string[], as = asAdmin) =>
    as.mutation(api.institutionAdmin.access.preapprove, { email, roles });
  const members = (as = asAdmin) => as.query(api.institutionAdmin.access.members, {});
  const audits = (action: string) =>
    t.run(async (ctx) =>
      (await ctx.db.query("auditEvents").collect()).filter((event) => event.action === action),
    );
  return {
    t,
    signIn,
    adminId,
    learnerId,
    unlisted,
    cutOver,
    bootstrap,
    asAdmin,
    asLearner,
    preapprove,
    members,
    audits,
  };
}

async function ready() {
  const context = await setup();
  await context.cutOver();
  await context.bootstrap(context.adminId);
  return context;
}

describe("Add a Member", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("migrates once, keeping every existing Membership and importing pending identities", async () => {
    const { t, adminId, learnerId, unlisted, cutOver, audits } = await setup();
    const before = await t.run((ctx) => ctx.db.query("memberships").collect());

    expect(await cutOver()).toEqual({
      status: "cut_over",
      boundMemberships: 3,
      pendingApprovals: 1,
      alreadyPresent: 2,
    });
    expect(await cutOver()).toEqual({
      status: "already_cut_over",
      cutoverAt: expect.any(Number),
    });

    const entries = await t.run((ctx) => ctx.db.query("rosterEntries").collect());
    expect(
      entries.map(({ email, status, membershipId }) => [email, status, membershipId ?? null]),
    ).toEqual(
      expect.arrayContaining([
        ["admin@example.edu", "bound", adminId],
        ["learner@example.edu", "bound", learnerId],
        ["unlisted@example.edu", "bound", unlisted],
        ["not-yet@example.edu", "pending", null],
      ]),
    );
    expect(entries).toHaveLength(4);
    expect(await t.run((ctx) => ctx.db.query("memberships").collect())).toEqual(before);
    const [migration] = await audits("roster_migrated");
    expect(migration.counts).toEqual({
      boundMemberships: 3,
      pendingApprovals: 1,
      alreadyPresent: 2,
    });
    expect(JSON.stringify(migration)).not.toContain("@example.edu");
  });

  it("refuses to cut over from a missing, blank, or invalid roster without writing or exposing values", async () => {
    const { t, cutOver } = await setup();
    const duplicate = JSON.stringify({
      version: 1,
      entries: [
        { email: "twice@example.edu", institutionKey: "umb", roles: ["learner"] },
        { email: "twice@example.edu", institutionKey: "umb", roles: ["faculty"] },
      ],
    });
    for (const value of [undefined, "", "   ", "not json", duplicate]) {
      if (value === undefined) {
        vi.stubEnv("PILOT_ROSTER_JSON", undefined as unknown as string);
      } else {
        vi.stubEnv("PILOT_ROSTER_JSON", value);
      }
      const failure = await cutOver().then(
        () => null,
        (error: Error) => error.message,
      );
      expect(failure).toMatch(/refusing to cut over/);
      expect(failure).not.toContain("@example.edu");
    }
    const written = await t.run(async (ctx) => ({
      authority: await ctx.db.query("rosterAuthority").collect(),
      entries: await ctx.db.query("rosterEntries").collect(),
      audits: await ctx.db.query("auditEvents").collect(),
    }));
    expect(written).toEqual({ authority: [], entries: [], audits: [] });
  });

  it("never reconciles current roles from old roster values, and never falls back after cutover", async () => {
    const { t, signIn, learnerId, cutOver, members, bootstrap, adminId, asAdmin } = await setup();
    // The Learner's current roles differ from the stale environment entry.
    await t.run((ctx) => ctx.db.patch(learnerId, { roles: ["learner", "faculty"] }));
    await cutOver();
    await bootstrap(adminId);
    expect((await t.run((ctx) => ctx.db.get(learnerId)))!.roles).toEqual(["learner", "faculty"]);

    // Revoking the imported approval wins even though the env still lists it.
    const pending = (await members()).pending.find(({ email }) => email === "not-yet@example.edu")!;
    await asAdmin.mutation(api.institutionAdmin.access.revoke, { rosterEntryId: pending.id });
    expect(await signIn("user_not_yet", "not-yet@example.edu")).toEqual({
      status: "denied",
      reason: "not_on_roster",
    });
    // A bound Member whose WorkOS email later changes keeps the same Membership.
    expect(await signIn("user_learner", "renamed@example.edu")).toMatchObject({
      status: "admitted",
      membership: { id: learnerId, roles: ["learner", "faculty"] },
    });
  });

  it("bootstraps one explicitly designated Institutional Admin, preserving other roles", async () => {
    const { t, adminId, learnerId, cutOver, bootstrap, audits } = await setup();
    await cutOver();
    expect(await bootstrap(adminId)).toEqual({ status: "granted" });
    expect((await t.run((ctx) => ctx.db.get(adminId)))!.roles).toEqual([
      "faculty",
      "institutionalAdmin",
    ]);
    expect(await bootstrap(learnerId)).toEqual({ status: "institution_has_admin" });
    expect((await t.run((ctx) => ctx.db.get(learnerId)))!.roles).toEqual(["learner"]);
    const [grant] = await audits("institutional_admin_bootstrapped");
    expect(grant).toMatchObject({
      actor: { kind: "operator" },
      membershipId: adminId,
      before: { roles: ["faculty"] },
      after: { roles: ["faculty", "institutionalAdmin"] },
    });
  });

  it("pre-approves any combination of the four roles once, with an audit event and no Membership", async () => {
    const { t, preapprove, members, audits } = await ready();

    const first = await preapprove("  New.Member@Example.edu ", allRoles);
    expect(first.status).toBe("preapproved");
    expect(await preapprove("new.member@example.edu", [...allRoles].reverse())).toEqual(first);

    const view = await members();
    expect(view.pending.filter(({ email }) => email === "new.member@example.edu")).toEqual([
      expect.objectContaining({ roles: allRoles }),
    ]);
    expect(await audits("identity_preapproved")).toHaveLength(1);
    const memberships = await t.run((ctx) => ctx.db.query("memberships").collect());
    expect(memberships.map(({ rosterEmail }) => rosterEmail)).not.toContain("new.member@example.edu");

    expect(await preapprove("new.member@example.edu", ["learner"])).toEqual({
      status: "already_pending",
    });
    expect(await preapprove("learner@example.edu", ["faculty"])).toEqual({
      status: "already_member",
    });
    for (const roles of [[], ["learner", "learner"], ["superuser"]]) {
      expect(await preapprove("new2@example.edu", roles)).toEqual({ status: "invalid_roles" });
    }
    expect(await preapprove("not-an-email", ["learner"])).toEqual({ status: "invalid_email" });
  });

  it("binds a pending identity to exactly one Membership at first verified sign-in", async () => {
    const { t, signIn, preapprove, members } = await ready();
    await preapprove("new.member@example.edu", ["learner", "author"]);

    const [first, retried] = await Promise.all([
      signIn("user_new", "New.Member@example.edu"),
      signIn("user_new", "new.member@example.edu"),
    ]);
    expect(first).toMatchObject({ status: "admitted", membership: { roles: ["learner", "author"] } });
    expect(retried).toEqual(first);
    const bound = await t.run((ctx) =>
      ctx.db
        .query("memberships")
        .withIndex("by_workos_user_id", (q) => q.eq("workosUserId", "user_new"))
        .collect(),
    );
    expect(bound).toHaveLength(1);
    expect((await members()).pending.map(({ email }) => email)).not.toContain(
      "new.member@example.edu",
    );
    // Later authorization uses the stable WorkOS ID.
    expect(
      await t
        .withIdentity({ subject: "user_new" })
        .query(api.membershipAccess.access.currentMembership, {}),
    ).toMatchObject({ roles: ["learner", "author"], institution: { key: "umb" } });
  });

  it("denies unverified, lookalike, and second-account claims without creating or moving a Membership", async () => {
    const { t, signIn, preapprove } = await ready();
    await preapprove("claim@example.edu", ["learner"]);

    expect(await signIn("user_claim", "claim@example.edu", false)).toEqual({
      status: "denied",
      reason: "email_not_verified",
    });
    expect(await signIn("user_other", "other@example.edu")).toEqual({
      status: "denied",
      reason: "not_on_roster",
    });
    await signIn("user_claim", "claim@example.edu");
    expect(await signIn("user_second", "claim@example.edu")).toEqual({
      status: "denied",
      reason: "roster_entry_already_bound",
    });
    const claims = await t.run(async (ctx) =>
      (await ctx.db.query("memberships").collect()).filter(({ rosterEmail }) =>
        rosterEmail === "claim@example.edu",
      ),
    );
    expect(claims.map(({ workosUserId }) => workosUserId)).toEqual(["user_claim"]);
  });

  it("revokes a pending approval, but never an identity that was already bound", async () => {
    const { signIn, preapprove, asAdmin, audits } = await ready();
    const revoke = (rosterEntryId: string) =>
      asAdmin.mutation(api.institutionAdmin.access.revoke, { rosterEntryId });

    const pending = await preapprove("withdrawn@example.edu", ["faculty"]);
    const pendingId = (pending as { rosterEntryId: string }).rosterEntryId;
    expect(await revoke(pendingId)).toEqual({ status: "revoked" });
    expect(await revoke(pendingId)).toEqual({ status: "revoked" });
    expect(await audits("preapproval_revoked")).toHaveLength(1);
    expect(await signIn("user_withdrawn", "withdrawn@example.edu")).toEqual({
      status: "denied",
      reason: "not_on_roster",
    });
    // A revoked approval in the same institution can be renewed.
    expect((await preapprove("withdrawn@example.edu", ["faculty"])).status).toBe("preapproved");

    // Binding wins the race: the revoke cannot silently remove the Member.
    const raced = await preapprove("raced@example.edu", ["learner"]);
    await signIn("user_raced", "raced@example.edu");
    expect(await revoke((raced as { rosterEntryId: string }).rosterEntryId)).toEqual({
      status: "already_member",
    });
    expect(await signIn("user_raced", "raced@example.edu")).toMatchObject({ status: "admitted" });
  });

  it("keeps every list and change inside the caller's own Pilot Institution", async () => {
    const { t, asLearner, preapprove, members, asAdmin } = await ready();
    const foreign = await t.run(async (ctx) => {
      const institutionId = await ctx.db.insert("pilotInstitutions", { key: "other", name: "Other" });
      await ctx.db.insert("memberships", {
        workosUserId: "user_foreign_admin",
        rosterEmail: "foreign-admin@example.org",
        institutionId,
        roles: ["institutionalAdmin"],
        createdAt: Date.now(),
      });
      const entryId = await ctx.db.insert("rosterEntries", {
        institutionId,
        email: "foreign-pending@example.org",
        roles: ["learner"],
        status: "pending",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      return { entryId };
    });

    const view = await members();
    const emails = [...view.members, ...view.pending].map(({ email }) => email);
    expect(emails).not.toContain("foreign-admin@example.org");
    expect(emails).not.toContain("foreign-pending@example.org");
    expect(view.rosterSource).toBe("database");
    // Another institution's identities are unavailable, with no detail.
    expect(await preapprove("foreign-pending@example.org", ["learner"])).toEqual({
      status: "unavailable",
    });
    expect(await preapprove("foreign-admin@example.org", ["learner"])).toEqual({
      status: "unavailable",
    });
    for (const id of [foreign.entryId, "not-an-entry-id"]) {
      expect(
        await asAdmin.mutation(api.institutionAdmin.access.revoke, { rosterEntryId: id }),
      ).toEqual({ status: "not_found" });
    }
    expect(
      (await t.run((ctx) => ctx.db.get(foreign.entryId)))!.status,
    ).toBe("pending");

    // Institutional Admin only; nothing is exposed to other roles or anonymously.
    await expect(members(asLearner)).rejects.toThrow("Institutional Admin role required");
    await expect(preapprove("x@example.edu", ["learner"], asLearner)).rejects.toThrow(
      "Institutional Admin role required",
    );
    await expect(t.query(api.institutionAdmin.access.members, {})).rejects.toThrow(
      "Authentication required",
    );
  });

  it("refuses approvals until the database roster is authoritative", async () => {
    const { bootstrap, adminId, preapprove, members } = await setup();
    await bootstrap(adminId);
    expect((await members()).rosterSource).toBe("environment");
    expect(await preapprove("early@example.edu", ["learner"])).toEqual({
      status: "roster_not_migrated",
    });
  });
});
