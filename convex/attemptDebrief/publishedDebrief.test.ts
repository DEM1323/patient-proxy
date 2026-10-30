import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { PatientPrompt } from "../attemptInteraction/patientPrompt";
import { pacuDebriefTemplate } from "../attemptStart/debriefTemplates";
import type { DebriefContent } from "../attemptStart/scenarioContent";
import { initialPacuAssessment } from "../attemptStart/scenarioContent";
import { admitWorkosUser } from "../membershipAccess/model";
import schema from "../schema";
import { modules } from "../test.setup";
import { defaultReflectionPrompts } from "./model";

// Unit tests never call live Gemini.
const completer = vi.hoisted(() => ({
  completePatientReply: vi.fn(async () => "Mm... okay."),
  completeFeedback: vi.fn<(prompt: PatientPrompt) => Promise<string>>(),
}));
vi.mock("../attemptInteraction/gemini", () => completer);

// Provisioning publishes the curated PACU content; each test decides what
// debrief content that curated content carries.
const curated = vi.hoisted(() => ({
  debrief: undefined as DebriefContent | undefined,
}));
vi.mock("../attemptStart/scenarioContent", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("../attemptStart/scenarioContent")>();
  return {
    ...original,
    initialPacuAssessment: {
      ...original.initialPacuAssessment,
      get debrief() {
        return curated.debrief;
      },
    },
  };
});

// TEST FIXTURES ONLY. These are not Author-approved Communication Criteria,
// guidance, or Reflection Prompts and must never be published.
const fixtureA: DebriefContent = {
  communicationCriteria: [
    { key: "fixture_a1", label: "Fixture criterion A1", description: "Fixture description A1." },
    { key: "fixture_a2", label: "Fixture criterion A2", description: "Fixture description A2." },
  ],
  reflectionPrompts: {
    interpretation: "Fixture interpretation prompt A?",
    planning: "Fixture planning prompt A?",
  },
};
const fixtureB: DebriefContent = {
  feedbackGuidance: "Fixture guidance B.",
  communicationCriteria: [
    { key: "fixture_b1", label: "Fixture criterion B1", description: "Fixture description B1." },
  ],
};
const generatedB = {
  interpretation: "Generated interpretation prompt B?",
  planning: "Generated planning prompt B?",
};

const roster = JSON.stringify({
  version: 1,
  entries: [
    { email: "learner@example.edu", institutionKey: "umb", roles: ["learner"] },
    { email: "peer@example.edu", institutionKey: "umb", roles: ["learner"] },
    { email: "faculty@example.edu", institutionKey: "umb", roles: ["faculty"] },
  ],
});

// Timeline after `play`: 1 started, 2 Learner message, 3 patient reply,
// 4 Clinical Action, 5 ended.
function feedbackJson(
  criteria: { key: string }[],
  extra: Record<string, unknown> = {},
) {
  return JSON.stringify({
    summary: [{ text: "You greeted Elena and recorded vital signs.", evidence: [2, 4] }],
    strengths: [{ text: "You introduced yourself.", evidence: [2] }],
    priorities: [
      { text: "Explaining next steps was not observed in this Attempt.", evidence: [], observed: false },
    ],
    criteria: criteria.map(({ key }, index) =>
      index === 0
        ? { key, rating: "demonstrated", rationale: "You introduced yourself.", evidence: [2] }
        : { key, rating: "not_yet_demonstrated", rationale: "Not observed in this Attempt.", evidence: [] },
    ),
    suggestions: ["Tell Elena where she is.", "Say aloud what concerns you."],
    ...extra,
  });
}

async function setup(debrief: DebriefContent | undefined) {
  curated.debrief = debrief;
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
  const provision = (next: DebriefContent | undefined) => {
    curated.debrief = next;
    return t.mutation(internal.attemptStart.pilotProvisioning.provision, {});
  };
  await provision(debrief);
  const [scenario] = await asLearner.query(
    api.attemptStart.access.availableScenarios,
    {},
  );

  const runScheduled = async () => {
    vi.advanceTimersByTime(1);
    await t.finishInProgressScheduledFunctions();
  };
  type Member = typeof asLearner;
  const start = async (as: Member) => {
    const started = await as.mutation(api.attemptStart.access.start, {
      scenarioId: scenario.scenarioId,
      clientRequestId: crypto.randomUUID(),
    });
    return (started as { attemptId: Id<"attempts"> }).attemptId;
  };
  // Records a message, a reply, and a Clinical Action, then ends.
  const play = async (as: Member, attemptId: Id<"attempts">) => {
    await as.mutation(api.attemptInteraction.access.send, {
      attemptId,
      clientRequestId: `${attemptId}-message`,
      text: "Hi Elena, I'm your nurse.",
    });
    await runScheduled();
    await as.mutation(api.attemptInteraction.access.takeAction, {
      attemptId,
      clientRequestId: `${attemptId}-action`,
      actionKey: "vital_signs",
    });
    await as.mutation(api.attemptEnding.access.end, { attemptId, confirmed: true });
  };
  let requests = 0;
  const reflect = (
    as: Member,
    attemptId: Id<"attempts">,
    prompt: "interpretation" | "planning",
    response: "answer" | "skip",
    text?: string,
  ) =>
    as.mutation(api.attemptDebrief.access.reflect, {
      attemptId,
      clientRequestId: `reflection-${++requests}`,
      prompt,
      response,
      ...(text === undefined ? {} : { text }),
    });
  const debriefOf = (as: Member, attemptId: Id<"attempts">) =>
    as.query(api.attemptDebrief.access.ownDebrief, { attemptId });
  const versions = () =>
    t.run((ctx) => ctx.db.query("scenarioVersions").collect());
  const pinnedVersion = (attemptId: Id<"attempts">) =>
    t.run(async (ctx) => {
      const attempt = (await ctx.db.get(attemptId))!;
      return (await ctx.db.get(attempt.scenarioVersionId))!.version;
    });
  const participation = () =>
    t.run(async (ctx) => ({
      groups: await ctx.db.query("learningGroups").collect(),
      members: await ctx.db.query("learningGroupMembers").collect(),
      availability: await ctx.db.query("scenarioAvailabilities").collect(),
    }));
  return {
    t,
    asLearner,
    asPeer,
    asFaculty,
    provision,
    runScheduled,
    start,
    play,
    reflect,
    debriefOf,
    versions,
    pinnedVersion,
    participation,
  };
}

describe("Publish Author-controlled debrief content", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    completer.completeFeedback.mockReset();
  });
  afterEach(() => {
    vi.useRealTimers();
    curated.debrief = undefined;
  });

  it("persists debrief content through provisioning and reuses the version on an unchanged rerun", async () => {
    const { provision, versions } = await setup(fixtureA);
    const [published] = await versions();
    expect(published).toMatchObject({ version: 1, debrief: fixtureA });

    expect(await provision(structuredClone(fixtureA))).toMatchObject({
      scenarioVersion: 1,
    });
    expect(await versions()).toEqual([published]);
  });

  it("publishes a debrief-only edit as a new version without touching older versions or participation", async () => {
    const { t, provision, versions, participation } = await setup(fixtureA);
    // Scope managed in Patient Proxy after the bootstrap: the peer was
    // unenrolled and the Scenario made unavailable.
    await t.run(async (ctx) => {
      const peer = (await ctx.db.query("memberships").collect()).find(
        ({ rosterEmail }) => rosterEmail === "peer@example.edu",
      )!;
      const enrollment = (await ctx.db.query("learningGroupMembers").collect()).find(
        ({ membershipId }) => membershipId === peer._id,
      )!;
      await ctx.db.delete(enrollment._id);
      for (const row of await ctx.db.query("scenarioAvailabilities").collect()) {
        await ctx.db.delete(row._id);
      }
    });
    const [v1] = await versions();
    const before = await participation();

    expect(await provision(fixtureB)).toEqual({
      scenarioVersion: 2,
      participation: "already_managed",
      enrolledMemberships: 0,
    });
    const [olderVersion, newVersion] = await versions();
    expect(olderVersion).toEqual(v1);
    expect(newVersion).toMatchObject({
      version: 2,
      learnerBrief: v1.learnerBrief,
      clinicalTruth: v1.clinicalTruth,
      debrief: fixtureB,
    });
    const scenario = await t.run(async (ctx) => (await ctx.db.query("scenarios").first())!);
    expect(scenario.currentVersionId).toBe(newVersion._id);
    expect(await participation()).toEqual(before);
    expect(before.availability).toEqual([]);

    // Removing the debrief content is also an authored change.
    expect(await provision(undefined)).toMatchObject({ scenarioVersion: 3 });
    expect((await versions())[2].debrief).toBeUndefined();
  });

  it("keeps an Attempt's pinned criteria and prompts through feedback and retry after a newer version is published", async () => {
    const { asLearner, asPeer, provision, runScheduled, start, play, reflect, debriefOf, pinnedVersion } =
      await setup(fixtureA);
    const pinnedAttempt = await start(asLearner);
    await provision(fixtureB);
    const newAttempt = await start(asPeer);
    expect(await pinnedVersion(pinnedAttempt)).toBe(1);
    expect(await pinnedVersion(newAttempt)).toBe(2);

    // The pinned Attempt's first generation fails; the retry runs after the
    // newer version is current and must still use version 1.
    completer.completeFeedback
      .mockRejectedValueOnce(new Error("Request timed out"))
      .mockResolvedValueOnce(feedbackJson(fixtureA.communicationCriteria!));
    await play(asLearner, pinnedAttempt);
    await runScheduled();
    expect(await debriefOf(asLearner, pinnedAttempt)).toMatchObject({
      status: "reflecting",
      feedback: null,
      prompts: [
        { key: "interpretation", text: fixtureA.reflectionPrompts!.interpretation },
        { key: "planning", text: fixtureA.reflectionPrompts!.planning },
      ],
    });
    await reflect(asLearner, pinnedAttempt, "interpretation", "answer", "Her breathing was slow.");
    await reflect(asLearner, pinnedAttempt, "planning", "skip");
    expect(await debriefOf(asLearner, pinnedAttempt)).toMatchObject({
      status: "revealed",
      feedback: { status: "failed" },
    });
    await asLearner.mutation(api.attemptDebrief.access.retryFeedbackGeneration, {
      attemptId: pinnedAttempt,
    });
    await runScheduled();

    for (const [call] of completer.completeFeedback.mock.calls) {
      expect(call.systemInstruction).toContain("fixture_a1: Fixture criterion A1.");
      expect(call.systemInstruction).toContain("fixture_a2: Fixture criterion A2.");
      expect(call.systemInstruction).not.toContain("fixture_b1");
      expect(call.systemInstruction).not.toContain(fixtureB.feedbackGuidance);
      expect(call.systemInstruction).not.toContain('"reflectionPrompts"');
      // Hidden Clinical Truth never reaches the feedback context.
      for (const objective of initialPacuAssessment.clinicalTruth.learningObjectives) {
        expect(JSON.stringify(call)).not.toContain(objective);
      }
    }
    expect(await debriefOf(asLearner, pinnedAttempt)).toMatchObject({
      status: "revealed",
      prompts: [
        { text: fixtureA.reflectionPrompts!.interpretation },
        { text: fixtureA.reflectionPrompts!.planning },
      ],
      feedback: {
        status: "completed",
        sections: {
          criteria: [
            { key: "fixture_a1", label: "Fixture criterion A1", rating: "demonstrated", evidence: [2] },
            { key: "fixture_a2", label: "Fixture criterion A2", rating: "not_yet_demonstrated", evidence: [] },
          ],
        },
      },
    });

    // The new Attempt follows version 2: guidance-generated prompts and its
    // own criteria.
    completer.completeFeedback.mockReset();
    completer.completeFeedback.mockResolvedValueOnce(
      feedbackJson(fixtureB.communicationCriteria!, { reflectionPrompts: generatedB }),
    );
    await play(asPeer, newAttempt);
    await runScheduled();
    const [[newCall]] = completer.completeFeedback.mock.calls;
    expect(newCall.systemInstruction).toContain(fixtureB.feedbackGuidance);
    expect(newCall.systemInstruction).toContain("fixture_b1: Fixture criterion B1.");
    expect(newCall.systemInstruction).not.toContain("fixture_a1");
    expect(await debriefOf(asPeer, newAttempt)).toMatchObject({
      status: "reflecting",
      feedback: null,
      prompts: [{ text: generatedB.interpretation }, { text: generatedB.planning }],
    });
    await reflect(asPeer, newAttempt, "interpretation", "skip");
    await reflect(asPeer, newAttempt, "planning", "skip");
    expect(await debriefOf(asPeer, newAttempt)).toMatchObject({
      feedback: {
        status: "completed",
        sections: { criteria: [{ key: "fixture_b1", label: "Fixture criterion B1" }] },
      },
    });
  });

  it("keeps an Attempt pinned to a version without debrief content on the platform defaults", async () => {
    const { asLearner, provision, runScheduled, start, play, reflect, debriefOf } =
      await setup(undefined);
    const attemptId = await start(asLearner);
    await provision(fixtureA);

    completer.completeFeedback.mockResolvedValue(feedbackJson([]));
    await play(asLearner, attemptId);
    await runScheduled();
    const [[call]] = completer.completeFeedback.mock.calls;
    expect(call.systemInstruction).toContain("(none authored");
    expect(call.systemInstruction).not.toContain("fixture_a1");
    await reflect(asLearner, attemptId, "interpretation", "skip");
    await reflect(asLearner, attemptId, "planning", "skip");
    expect(await debriefOf(asLearner, attemptId)).toMatchObject({
      prompts: [
        { text: defaultReflectionPrompts.interpretation },
        { text: defaultReflectionPrompts.planning },
      ],
      feedback: { status: "completed", sections: { criteria: null } },
    });
  });

  it("shares the saved record with current reviewers only and keeps it Learner-owned", async () => {
    const { t, asLearner, asPeer, asFaculty, runScheduled, start, play, reflect, debriefOf } =
      await setup(fixtureA);
    const attemptId = await start(asLearner);
    completer.completeFeedback.mockResolvedValue(feedbackJson(fixtureA.communicationCriteria!));
    await play(asLearner, attemptId);
    await runScheduled();
    await reflect(asLearner, attemptId, "interpretation", "answer", "She was hard to rouse.");
    await reflect(asLearner, attemptId, "planning", "answer", "Escalate sooner.");

    const own = (await debriefOf(asLearner, attemptId)) as {
      prompts: unknown;
      feedback: { status: string; sections: { criteria: { evidence: number[] }[]; summary: { evidence: number[] }[] } };
    };
    const review = await asFaculty.query(api.attemptReview.access.reviewAttempt, { attemptId });
    expect(review?.debrief).toEqual({
      status: "recorded",
      prompts: own.prompts,
      feedback: own.feedback,
    });
    // Every cited event resolves to the reviewed timeline.
    const sequences = new Set(review!.attempt.timeline.map(({ sequence }) => sequence));
    const cited = [
      ...own.feedback.sections.summary,
      ...own.feedback.sections.criteria,
    ].flatMap(({ evidence }) => evidence);
    expect(cited.length).toBeGreaterThan(0);
    expect(cited.every((sequence) => sequences.has(sequence))).toBe(true);

    expect(await debriefOf(asPeer, attemptId)).toBeNull();
    await expect(
      asFaculty.query(api.attemptDebrief.access.ownDebrief, { attemptId }),
    ).rejects.toThrow("Learner role required");
    // Review scope is current: removing availability revokes it.
    await t.run(async (ctx) => {
      for (const row of await ctx.db.query("scenarioAvailabilities").collect()) {
        await ctx.db.delete(row._id);
      }
    });
    expect(
      await asFaculty.query(api.attemptReview.access.reviewAttempt, { attemptId }),
    ).toBeNull();
  });

  it("refuses to publish debrief content with blank or duplicated criteria", async () => {
    const { provision, versions } = await setup(undefined);
    const duplicated: DebriefContent = {
      communicationCriteria: [
        { key: "fixture_dup", label: "Fixture one", description: "Fixture." },
        { key: "fixture_dup", label: "Fixture two", description: "Fixture." },
      ],
    };
    await expect(provision(duplicated)).rejects.toThrow("blank, duplicated, or oversized");
    await expect(
      provision({ reflectionPrompts: { interpretation: " ", planning: "Fixture?" } }),
    ).rejects.toThrow("blank, duplicated, or oversized");
    expect(await versions()).toHaveLength(1);
  });

  it("never publishes the generated template until an Author changes it", async () => {
    const { provision, versions } = await setup(undefined);
    expect(pacuDebriefTemplate).toMatchObject({
      origin: "generated_template",
      notice: expect.stringContaining("Generated draft, edit before use"),
    });
    await expect(provision(structuredClone(pacuDebriefTemplate.content))).rejects.toThrow(
      "must be edited or adopted by an Author",
    );
    expect(await versions()).toHaveLength(1);

    const edited = structuredClone(pacuDebriefTemplate.content);
    edited.reflectionPrompts!.planning = "Fixture: an Author's edited planning prompt?";
    expect(await provision(edited)).toMatchObject({ scenarioVersion: 2 });
    expect((await versions())[1].debrief).toEqual(edited);
  });
});
