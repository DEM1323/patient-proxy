import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import schema from "../schema";
import { admitWorkosUser } from "../membershipAccess/model";
import { modules } from "../test.setup";

// Unit tests never call live Gemini.
vi.mock("../attemptInteraction/gemini", () => ({
  completePatientReply: vi.fn(async () => "Mm... okay."),
  completeFeedback: vi.fn(async () =>
    JSON.stringify({
      summary: [{ text: "You greeted Elena.", evidence: [2] }],
      strengths: [],
      priorities: [{ text: "Reassurance was not observed in this Attempt.", evidence: [], observed: false }],
      criteria: [],
      suggestions: ["Tell Elena where she is.", "Explain each action aloud."],
    }),
  ),
}));

// Synthetic identities only.
const environmentRoster = JSON.stringify({
  version: 1,
  entries: [
    { email: "admin@example.edu", institutionKey: "umb", roles: ["faculty"] },
    { email: "second-admin@example.edu", institutionKey: "umb", roles: ["faculty"] },
    { email: "learner@example.edu", institutionKey: "umb", roles: ["learner"] },
  ],
});

async function setup() {
  vi.stubEnv("PILOT_ROSTER_JSON", environmentRoster);
  const t = convexTest(schema, modules);
  const signIn = (workosUserId: string, email: string) =>
    t.run((ctx) =>
      admitWorkosUser(ctx, {
        workosUserId,
        email,
        emailVerified: true,
        rawRoster: process.env.PILOT_ROSTER_JSON,
      }),
    );
  const idOf = async (subject: string, email: string) =>
    ((await signIn(subject, email)) as { membership: { id: Id<"memberships"> } }).membership.id;
  const adminId = await idOf("user_admin", "admin@example.edu");
  const secondAdminId = await idOf("user_second", "second-admin@example.edu");
  const learnerId = await idOf("user_learner", "learner@example.edu");
  await t.mutation(internal.institutionAdmin.operator.cutOverToDatabaseRoster, {});
  await t.mutation(internal.institutionAdmin.operator.bootstrapInstitutionalAdmin, {
    membershipId: adminId,
  });
  await t.mutation(internal.attemptStart.pilotProvisioning.provision, {});

  const asAdmin = t.withIdentity({ subject: "user_admin" });
  const asSecond = t.withIdentity({ subject: "user_second" });
  const asLearner = t.withIdentity({ subject: "user_learner" });
  type Caller = typeof asAdmin;
  const setRoles = (membershipId: string, roles: string[], as: Caller = asAdmin) =>
    as.mutation(api.institutionAdmin.access.setRoles, { membershipId, roles });
  const deactivate = (membershipId: string, as: Caller = asAdmin) =>
    as.mutation(api.institutionAdmin.access.deactivate, { membershipId });
  const reactivate = (membershipId: string, as: Caller = asAdmin) =>
    as.mutation(api.institutionAdmin.access.reactivate, { membershipId });
  const runScheduled = async () => {
    vi.advanceTimersByTime(1);
    await t.finishInProgressScheduledFunctions();
  };
  const scenarioId = async () =>
    (await asLearner.query(api.attemptStart.access.availableScenarios, {}))[0].scenarioId;
  const startAttempt = async (endActiveAttemptId?: Id<"attempts">) =>
    (
      (await asLearner.mutation(api.attemptStart.access.start, {
        scenarioId: await scenarioId(),
        clientRequestId: crypto.randomUUID(),
        endActiveAttemptId,
      })) as { attemptId: Id<"attempts"> }
    ).attemptId;
  const endDeliberately = async (attemptId: Id<"attempts">) => {
    await asLearner.mutation(api.attemptInteraction.access.send, {
      attemptId,
      clientRequestId: `message-${attemptId}`,
      text: "Hello, Elena.",
    });
    await runScheduled();
    await asLearner.mutation(api.attemptInteraction.access.takeAction, {
      attemptId,
      clientRequestId: `action-${attemptId}`,
      actionKey: "hand_hygiene",
    });
    await asLearner.mutation(api.attemptEnding.access.end, { attemptId, confirmed: true });
  };
  const membership = (id: Id<"memberships">) => t.run((ctx) => ctx.db.get(id));
  const audits = (action: string) =>
    t.run(async (ctx) =>
      (await ctx.db.query("auditEvents").collect()).filter((event) => event.action === action),
    );
  return {
    t,
    signIn,
    adminId,
    secondAdminId,
    learnerId,
    asAdmin,
    asSecond,
    asLearner,
    setRoles,
    deactivate,
    reactivate,
    runScheduled,
    startAttempt,
    endDeliberately,
    membership,
    audits,
  };
}

describe("Manage participation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("changes another Member's roles immediately and audits it, but never the admin's own", async () => {
    const { adminId, learnerId, asLearner, setRoles, membership, audits } = await setup();
    const allRoles = ["learner", "faculty", "author", "institutionalAdmin"];

    expect(await setRoles(learnerId, allRoles)).toEqual({ status: "updated" });
    expect((await membership(learnerId))!.roles).toEqual(allRoles);
    // Enforcement is immediate: the next read sees the new roles.
    expect(await asLearner.query(api.attemptReview.access.reviewableAttempts, {})).toEqual([]);
    expect((await asLearner.query(api.institutionAdmin.access.members, {})).members).toHaveLength(3);
    const [change] = await audits("member_roles_changed");
    expect(change).toMatchObject({
      actor: { kind: "member", membershipId: adminId },
      membershipId: learnerId,
      before: { roles: ["learner"] },
      after: { roles: allRoles },
    });

    expect(await setRoles(learnerId, [...allRoles].reverse())).toEqual({ status: "unchanged" });
    expect(await setRoles(adminId, ["learner"])).toEqual({ status: "self_change" });
    expect(await setRoles(learnerId, [])).toEqual({ status: "invalid_roles" });
    expect(await setRoles("not-a-membership", ["learner"])).toEqual({ status: "not_found" });
    expect((await membership(adminId))!.roles).toContain("institutionalAdmin");
  });

  it("always leaves an active Institutional Admin, even when two admins change each other at once", async () => {
    const { adminId, secondAdminId, asSecond, setRoles, deactivate, membership } = await setup();
    await setRoles(secondAdminId, ["faculty", "institutionalAdmin"]);

    const outcomes = await Promise.allSettled([
      setRoles(secondAdminId, ["faculty"]),
      setRoles(adminId, ["faculty"], asSecond),
    ]);
    expect(outcomes.filter(({ status }) => status === "fulfilled" )).toHaveLength(1);
    const admins = [await membership(adminId), await membership(secondAdminId)].filter((m) =>
      m!.roles.includes("institutionalAdmin"),
    );
    expect(admins).toHaveLength(1);
    // The remaining admin cannot remove or deactivate themselves.
    expect(await deactivate(admins[0]!._id, admins[0]!._id === adminId ? undefined : asSecond)).toEqual({
      status: "self_change",
    });
  });

  it("denies a deactivated Member despite a valid session while keeping the binding and records", async () => {
    const t0 = await setup();
    const { t, signIn, learnerId, asLearner, asAdmin, deactivate, reactivate, membership, audits } = t0;
    const ended = await t0.startAttempt();
    await t0.endDeliberately(ended);
    await t0.runScheduled();
    const active = await t0.startAttempt();

    expect(await deactivate(learnerId)).toEqual({ status: "updated" });
    expect(await deactivate(learnerId)).toEqual({ status: "unchanged" });
    await expect(asLearner.query(api.learnerAttemptHistory.access.ownEndedAttempts, {})).rejects.toThrow(
      "Pilot Membership is deactivated",
    );
    // Known, not unregistered: the session still resolves to the same Membership.
    expect(await asLearner.query(api.membershipAccess.access.currentMembership, {})).toMatchObject({
      id: learnerId,
      status: "inactive",
    });
    expect(await signIn("user_learner", "learner@example.edu")).toMatchObject({
      status: "admitted",
      membership: { id: learnerId, status: "inactive" },
    });
    const entry = await t.run(async (ctx) =>
      ctx.db
        .query("rosterEntries")
        .withIndex("by_email", (q) => q.eq("email", "learner@example.edu"))
        .unique(),
    );
    expect(entry).toMatchObject({ status: "bound", membershipId: learnerId });

    // The Active Attempt ended once, as a suspension, with no feedback.
    const attempts = await t.run((ctx) => ctx.db.query("attempts").collect());
    expect(attempts.find(({ _id }) => _id === active)).toMatchObject({
      status: "ended",
      endReason: "access_suspended",
    });
    expect(attempts.find(({ _id }) => _id === ended)).toMatchObject({ endReason: "learner_ended" });
    const feedbackFor = await t.run(async (ctx) =>
      (await ctx.db.query("formativeFeedback").collect()).map(({ attemptId }) => attemptId),
    );
    expect(feedbackFor).toEqual([ended]);
    // Records stay reviewable by the institution.
    expect(
      (await asAdmin.query(api.attemptReview.access.reviewableAttempts, {})).map(({ id }) => id),
    ).toEqual(expect.arrayContaining([ended, active]));
    expect(await audits("member_deactivated")).toHaveLength(1);

    // Reactivation restores access but never resumes the Attempt.
    expect(await reactivate(learnerId)).toEqual({ status: "updated" });
    expect((await membership(learnerId))!.status).toBe("active");
    expect(
      await asLearner.query(api.attemptStart.access.ownAttempt, { attemptId: active }),
    ).toMatchObject({ status: "ended", endReason: "access_suspended", canEnd: false });
    expect(
      await asLearner.query(api.attemptDebrief.access.ownDebrief, { attemptId: active }),
    ).toEqual({ status: "not_available", reason: "suspended" });
    expect(await audits("member_reactivated")).toHaveLength(1);
  });

  it("suspends the Active Attempt when Learner is removed, and late replies append nothing", async () => {
    const { t, learnerId, asLearner, setRoles, runScheduled, startAttempt } = await setup();
    const attemptId = await startAttempt();
    await asLearner.mutation(api.attemptInteraction.access.send, {
      attemptId,
      clientRequestId: "message-1",
      text: "Can you hear me?",
    });

    expect(await setRoles(learnerId, ["faculty"])).toEqual({ status: "updated" });
    await runScheduled();
    const events = await t.run((ctx) =>
      ctx.db
        .query("attemptEvents")
        .withIndex("by_attempt_sequence", (q) => q.eq("attemptId", attemptId))
        .collect(),
    );
    expect(events.map(({ kind }) => kind)).toEqual([
      "attempt_started",
      "learner_message",
      "attempt_ended",
    ]);
    await expect(
      asLearner.query(api.learnerAttemptHistory.access.ownEndedAttempts, {}),
    ).rejects.toThrow("Learner role required");

    await setRoles(learnerId, ["learner", "faculty"]);
    expect(await asLearner.query(api.learnerAttemptHistory.access.ownEndedAttempts, {})).toEqual([
      expect.objectContaining({ id: attemptId, endReason: "access_suspended", debrief: "none" }),
    ]);
  });

  it("lets feedback already pending for an earlier learner-ended Attempt complete after deactivation", async () => {
    const { t, learnerId, deactivate, runScheduled, startAttempt, endDeliberately } = await setup();
    const attemptId = await startAttempt();
    await endDeliberately(attemptId);
    await deactivate(learnerId);
    await runScheduled();

    const [feedback] = await t.run((ctx) => ctx.db.query("formativeFeedback").collect());
    expect(feedback).toMatchObject({ attemptId, status: "completed" });
  });

  it("changes the roles of a pending approval before first sign-in", async () => {
    const { signIn, asAdmin, audits } = await setup();
    const approved = await asAdmin.mutation(api.institutionAdmin.access.preapprove, {
      email: "pending@example.edu",
      roles: ["learner"],
    });
    const rosterEntryId = (approved as { rosterEntryId: string }).rosterEntryId;
    const setPending = (roles: string[]) =>
      asAdmin.mutation(api.institutionAdmin.access.setPendingApprovalRoles, {
        rosterEntryId,
        roles,
      });

    expect(await setPending(["faculty", "author"])).toEqual({ status: "updated" });
    expect(await setPending(["author", "faculty"])).toEqual({ status: "unchanged" });
    expect(await audits("preapproval_roles_changed")).toHaveLength(1);
    expect(await signIn("user_pending", "pending@example.edu")).toMatchObject({
      membership: { roles: ["faculty", "author"] },
    });
    expect(await setPending(["learner"])).toEqual({ status: "already_member" });
    expect(
      await asAdmin.mutation(api.institutionAdmin.access.setPendingApprovalRoles, {
        rosterEntryId: "not-an-entry",
        roles: ["learner"],
      }),
    ).toEqual({ status: "not_found" });
  });

  it("keeps the audit log to the institution's active Institutional Admins", async () => {
    const { t, learnerId, secondAdminId, asAdmin, asLearner, asSecond, setRoles, deactivate } =
      await setup();
    await setRoles(learnerId, ["learner", "faculty"]);
    await t.run(async (ctx) => {
      const other = await ctx.db.insert("pilotInstitutions", { key: "other", name: "Other" });
      await ctx.db.insert("auditEvents", {
        institutionId: other,
        occurredAt: Date.now(),
        actor: { kind: "operator" },
        action: "roster_migrated",
      });
    });

    const log = await asAdmin.query(api.institutionAdmin.access.auditLog, {});
    expect(log[0]).toMatchObject({
      action: "member_roles_changed",
      actor: "member",
      actorEmail: "admin@example.edu",
      targetEmail: "learner@example.edu",
      before: { roles: ["learner"] },
      after: { roles: ["learner", "faculty"] },
    });
    expect(log.map(({ action }) => action)).toEqual([
      "member_roles_changed",
      "institutional_admin_bootstrapped",
      "roster_migrated",
    ]);
    await expect(asLearner.query(api.institutionAdmin.access.auditLog, {})).rejects.toThrow(
      "Institutional Admin role required",
    );
    // A deactivated admin can no longer read or act.
    await setRoles(secondAdminId, ["faculty", "institutionalAdmin"]);
    await deactivate(secondAdminId);
    await expect(asSecond.query(api.institutionAdmin.access.auditLog, {})).rejects.toThrow(
      "Pilot Membership is deactivated",
    );
    await expect(setRoles(learnerId, ["learner"], asSecond)).rejects.toThrow(
      "Pilot Membership is deactivated",
    );
  });

  it("recovers an Institutional Admin only through the restricted operator command", async () => {
    const { t, adminId, secondAdminId, asSecond, setRoles, deactivate, membership, audits } =
      await setup();
    await setRoles(secondAdminId, ["faculty", "institutionalAdmin"]);
    await deactivate(adminId, asSecond);

    expect(
      await t.mutation(internal.institutionAdmin.operator.recoverInstitutionalAdmin, {
        membershipId: adminId,
      }),
    ).toEqual({ status: "recovered" });
    expect(await membership(adminId)).toMatchObject({
      status: "active",
      roles: ["faculty", "institutionalAdmin"],
    });
    expect(
      await t.mutation(internal.institutionAdmin.operator.recoverInstitutionalAdmin, {
        membershipId: adminId,
      }),
    ).toEqual({ status: "unchanged" });
    const [recovery] = await audits("institutional_admin_recovered");
    expect(recovery).toMatchObject({
      actor: { kind: "operator" },
      before: { membershipStatus: "inactive" },
      after: { membershipStatus: "active" },
    });
  });
});
