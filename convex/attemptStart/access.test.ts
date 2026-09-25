import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import schema from "../schema";
import { admitWorkosUser } from "../membershipAccess/model";
import { modules } from "../test.setup";
import { initialPacuAssessment } from "./scenarioContent";

const roster = JSON.stringify({
  version: 1,
  entries: [
    { email: "learner@example.edu", institutionKey: "umb", roles: ["learner"] },
    { email: "peer@example.edu", institutionKey: "umb", roles: ["learner"] },
    { email: "faculty@example.edu", institutionKey: "umb", roles: ["faculty"] },
  ],
});

async function setup() {
  const t = convexTest(schema, modules);
  const admit = async (subject: string, email: string) => {
    await t.run((ctx) =>
      admitWorkosUser(ctx, {
        workosUserId: subject,
        email,
        emailVerified: true,
        rawRoster: roster,
      }),
    );
    return t.withIdentity({ subject });
  };
  const asLearner = await admit("user_learner", "learner@example.edu");
  const asPeer = await admit("user_peer", "peer@example.edu");
  const asFaculty = await admit("user_faculty", "faculty@example.edu");
  await t.mutation(internal.attemptStart.pilotProvisioning.provision, {});
  const [scenario] = await asLearner.query(
    api.attemptStart.access.availableScenarios,
    {},
  );
  return { t, asLearner, asPeer, asFaculty, scenarioId: scenario.scenarioId };
}

async function allAttempts(t: Awaited<ReturnType<typeof setup>>["t"]) {
  return await t.run((ctx) => ctx.db.query("attempts").collect());
}

function expectNoClinicalTruth(response: unknown) {
  const serialized = JSON.stringify(response);
  expect(serialized).not.toContain("clinicalTruth");
  for (const hiddenFact of [
    "RR 8",
    "SpO2 93%",
    "124/84",
    "5/10",
    "unsure where she is",
    "nausea",
    "aspiration",
    ...initialPacuAssessment.clinicalTruth.learningObjectives,
  ]) {
    expect(serialized).not.toContain(hiddenFact);
  }
}

describe("Start the PACU Attempt", () => {
  it("lists Initial PACU Assessment only through current Learning Group availability", async () => {
    const { t, asLearner } = await setup();

    expect(
      await asLearner.query(api.attemptStart.access.availableScenarios, {}),
    ).toEqual([
      expect.objectContaining({
        title: "Initial PACU Assessment",
        patientName: "Elena Ruiz",
      }),
    ]);

    await t.run(async (ctx) => {
      for (const availability of await ctx.db
        .query("scenarioAvailabilities")
        .collect()) {
        await ctx.db.delete(availability._id);
      }
    });
    expect(
      await asLearner.query(api.attemptStart.access.availableScenarios, {}),
    ).toEqual([]);
  });

  it("shows the scenario list and Learner Brief without Clinical Truth", async () => {
    const { asLearner, scenarioId } = await setup();

    const list = await asLearner.query(
      api.attemptStart.access.availableScenarios,
      {},
    );
    const result = await asLearner.query(api.attemptStart.access.learnerBrief, {
      scenarioId,
    });

    expect(result).toMatchObject({
      status: "available",
      title: "Initial PACU Assessment",
      brief: initialPacuAssessment.learnerBrief,
      activeAttemptId: null,
    });
    for (const response of [list, result]) {
      expectNoClinicalTruth(response);
    }
  });

  it("creates one Learner-owned Active Attempt pinned to the current Scenario Version and restores it", async () => {
    const { t, asLearner, scenarioId } = await setup();

    const started = await asLearner.mutation(api.attemptStart.access.start, {
      scenarioId,
    });
    expect(started.status).toBe("started");
    const attemptId = (started as { attemptId: Id<"attempts"> }).attemptId;

    // Publishing a later version must not change the pinned Attempt.
    await t.run(async (ctx) => {
      const scenario = (await ctx.db.get(scenarioId as Id<"scenarios">))!;
      const current = (await ctx.db.get(scenario.currentVersionId!))!;
      const { _id, _creationTime, ...content } = current;
      void _id;
      void _creationTime;
      const nextVersionId = await ctx.db.insert("scenarioVersions", {
        ...content,
        version: 2,
        createdAt: Date.now(),
      });
      await ctx.db.patch(scenario._id, { currentVersionId: nextVersionId });
    });

    const restored = await asLearner.query(api.attemptStart.access.ownAttempt, {
      attemptId,
    });
    expect(restored).toMatchObject({
      id: attemptId,
      status: "active",
      endedAt: null,
      scenario: { title: "Initial PACU Assessment", version: 1 },
      timeline: [{ sequence: 1, kind: "attempt_started" }],
    });
    expectNoClinicalTruth(restored);

    const [attempt] = await allAttempts(t);
    const learnerMembershipId = await t.run(
      async (ctx) =>
        (await ctx.db
          .query("memberships")
          .withIndex("by_workos_user_id", (q) =>
            q.eq("workosUserId", "user_learner"),
          )
          .unique())!._id,
    );
    expect(attempt).toMatchObject({
      learnerMembershipId,
      status: "active",
    });
    expect(
      await t.run(async (ctx) => (await ctx.db.get(attempt.scenarioVersionId))!.version),
    ).toBe(1);
  });

  it("requires confirmed ending of the Active Attempt before creating another run", async () => {
    const { t, asLearner, scenarioId } = await setup();
    const first = await asLearner.mutation(api.attemptStart.access.start, {
      scenarioId,
    });
    const firstId = (first as { attemptId: Id<"attempts"> }).attemptId;

    expect(
      await asLearner.query(api.attemptStart.access.learnerBrief, { scenarioId }),
    ).toMatchObject({ activeAttemptId: firstId });
    expect(
      await asLearner.mutation(api.attemptStart.access.start, { scenarioId }),
    ).toEqual({ status: "active_attempt_exists", activeAttemptId: firstId });
    expect(await allAttempts(t)).toHaveLength(1);

    const second = await asLearner.mutation(api.attemptStart.access.start, {
      scenarioId,
      endActiveAttemptId: firstId,
    });
    expect(second.status).toBe("started");

    const attempts = await allAttempts(t);
    expect(attempts.map((attempt) => attempt.status)).toEqual([
      "ended",
      "active",
    ]);
    const firstEnded = attempts[0];
    expect(firstEnded).toMatchObject({ endReason: "learner_restarted" });
    expect(firstEnded.endedAt).toBeLessThanOrEqual(attempts[1].startedAt);
    expect(
      await asLearner.query(api.attemptStart.access.ownAttempt, {
        attemptId: firstId,
      }),
    ).toMatchObject({
      status: "ended",
      timeline: [
        { sequence: 1, kind: "attempt_started" },
        { sequence: 2, kind: "attempt_ended" },
      ],
    });
  });

  it("rejects unavailable and cross-institution Scenarios without revealing details", async () => {
    const { t, asLearner, asPeer, scenarioId } = await setup();
    const foreignScenarioId = await t.run(async (ctx) => {
      const institutionId = await ctx.db.insert("pilotInstitutions", {
        key: "other-institution",
        name: "Other Pilot Institution",
      });
      const foreignId = await ctx.db.insert("scenarios", {
        institutionId,
        key: initialPacuAssessment.key,
        title: "Foreign Scenario",
        status: "published",
      });
      const versionId = await ctx.db.insert("scenarioVersions", {
        institutionId,
        scenarioId: foreignId,
        version: 1,
        title: "Foreign Scenario",
        learnerBrief: initialPacuAssessment.learnerBrief,
        clinicalTruth: initialPacuAssessment.clinicalTruth,
        createdAt: Date.now(),
      });
      await ctx.db.patch(foreignId, { currentVersionId: versionId });
      // Even a mis-scoped availability row must not grant access.
      const pilotGroup = (await ctx.db.query("learningGroups").first())!;
      await ctx.db.insert("scenarioAvailabilities", {
        institutionId,
        learningGroupId: pilotGroup._id,
        scenarioId: foreignId,
      });
      return foreignId;
    });
    // The peer is admitted but no longer in a Learning Group with availability.
    await t.run(async (ctx) => {
      const peer = (await ctx.db
        .query("memberships")
        .withIndex("by_workos_user_id", (q) => q.eq("workosUserId", "user_peer"))
        .unique())!;
      for (const member of await ctx.db
        .query("learningGroupMembers")
        .withIndex("by_membership", (q) => q.eq("membershipId", peer._id))
        .collect()) {
        await ctx.db.delete(member._id);
      }
    });

    for (const [asMember, id] of [
      [asLearner, foreignScenarioId],
      [asLearner, "not-a-scenario-id"],
      [asPeer, scenarioId],
    ] as const) {
      expect(
        await asMember.query(api.attemptStart.access.learnerBrief, {
          scenarioId: id,
        }),
      ).toEqual({ status: "unavailable" });
      expect(
        await asMember.mutation(api.attemptStart.access.start, { scenarioId: id }),
      ).toEqual({ status: "unavailable" });
    }
    expect(
      await asLearner.query(api.attemptStart.access.availableScenarios, {}),
    ).toHaveLength(1);
    expect(await allAttempts(t)).toHaveLength(0);
  });

  it("rechecks availability at Start after the Learner Brief was shown", async () => {
    const { t, asLearner, scenarioId } = await setup();
    expect(
      await asLearner.query(api.attemptStart.access.learnerBrief, { scenarioId }),
    ).toMatchObject({ status: "available" });

    await t.run(async (ctx) => {
      for (const availability of await ctx.db
        .query("scenarioAvailabilities")
        .collect()) {
        await ctx.db.delete(availability._id);
      }
    });

    expect(
      await asLearner.mutation(api.attemptStart.access.start, { scenarioId }),
    ).toEqual({ status: "unavailable" });
    expect(await allAttempts(t)).toHaveLength(0);
  });

  it("never ends another Learner's Attempt through endActiveAttemptId", async () => {
    const { t, asLearner, asPeer, scenarioId } = await setup();
    const peerStart = await asPeer.mutation(api.attemptStart.access.start, {
      scenarioId,
    });
    const peerAttemptId = (peerStart as { attemptId: Id<"attempts"> }).attemptId;

    // Without an Active Attempt of their own, the foreign id is ignored.
    const ownStart = await asLearner.mutation(api.attemptStart.access.start, {
      scenarioId,
      endActiveAttemptId: peerAttemptId,
    });
    expect(ownStart.status).toBe("started");
    const ownAttemptId = (ownStart as { attemptId: Id<"attempts"> }).attemptId;

    // With one, a mismatched id is not a confirmation.
    expect(
      await asLearner.mutation(api.attemptStart.access.start, {
        scenarioId,
        endActiveAttemptId: peerAttemptId,
      }),
    ).toEqual({ status: "active_attempt_exists", activeAttemptId: ownAttemptId });

    const attempts = await allAttempts(t);
    expect(attempts).toHaveLength(2);
    expect(attempts.every((attempt) => attempt.status === "active")).toBe(true);
    expect(
      await t.run((ctx) =>
        ctx.db
          .query("attemptEvents")
          .filter((q) => q.eq(q.field("kind"), "attempt_ended"))
          .collect(),
      ),
    ).toHaveLength(0);
  });

  it("keeps Attempts Learner-owned and requires the Learner role", async () => {
    const { asLearner, asPeer, asFaculty, scenarioId } = await setup();
    const started = await asLearner.mutation(api.attemptStart.access.start, {
      scenarioId,
    });
    const attemptId = (started as { attemptId: Id<"attempts"> }).attemptId;

    expect(
      await asPeer.query(api.attemptStart.access.ownAttempt, { attemptId }),
    ).toBeNull();
    await expect(
      asFaculty.query(api.attemptStart.access.ownAttempt, { attemptId }),
    ).rejects.toThrow("Learner role required");
    await expect(
      asFaculty.mutation(api.attemptStart.access.start, { scenarioId }),
    ).rejects.toThrow("Learner role required");
  });
});
