import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import schema from "../schema";
import type { PatientPrompt } from "../attemptInteraction/patientPrompt";
import { admitWorkosUser } from "../membershipAccess/model";
import { modules } from "../test.setup";
import { defaultReflectionPrompts, feedbackDeadlineMs } from "./model";

// Unit tests never call live Gemini.
const completer = vi.hoisted(() => ({
  completePatientReply: vi.fn(async () => "Mm... okay."),
  completeFeedback: vi.fn<(prompt: PatientPrompt) => Promise<string>>(),
}));
vi.mock("../attemptInteraction/gemini", () => completer);

const roster = JSON.stringify({
  version: 1,
  entries: [
    { email: "learner@example.edu", institutionKey: "umb", roles: ["learner"] },
    { email: "peer@example.edu", institutionKey: "umb", roles: ["learner"] },
    { email: "faculty@example.edu", institutionKey: "umb", roles: ["faculty"] },
  ],
});

// Timeline after `endWithEvidence`: 1 started, 2 Learner message, 3 patient
// reply, 4 Clinical Action, 5 ended.
function feedbackJson(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    summary: [{ text: "You greeted Elena and recorded vital signs.", evidence: [2, 4] }],
    strengths: [{ text: "You introduced yourself.", evidence: [2] }],
    priorities: [
      {
        text: "Escalation of concern about her breathing was not observed in this Attempt.",
        evidence: [],
        observed: false,
      },
    ],
    criteria: [],
    suggestions: ["Tell Elena where she is.", "Say aloud what concerns you."],
    ...overrides,
  });
}

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
  const started = await asLearner.mutation(api.attemptStart.access.start, {
    scenarioId: scenario.scenarioId,
  });
  const attemptId = (started as { attemptId: Id<"attempts"> }).attemptId;

  const runScheduled = async () => {
    vi.advanceTimersByTime(1);
    await t.finishInProgressScheduledFunctions();
  };
  const endWithEvidence = async () => {
    await asLearner.mutation(api.attemptInteraction.access.send, {
      attemptId,
      clientRequestId: "message-1",
      text: "Hi Elena, I'm your nurse.",
    });
    await runScheduled();
    await asLearner.mutation(api.attemptInteraction.access.takeAction, {
      attemptId,
      clientRequestId: "action-1",
      actionKey: "vital_signs",
    });
    return await asLearner.mutation(api.attemptEnding.access.end, {
      attemptId,
      confirmed: true,
    });
  };
  let requests = 0;
  const reflect = (
    prompt: "interpretation" | "planning",
    response: "answer" | "skip",
    text?: string,
    clientRequestId = `reflection-${++requests}`,
  ) =>
    asLearner.mutation(api.attemptDebrief.access.reflect, {
      attemptId,
      clientRequestId,
      prompt,
      response,
      ...(text === undefined ? {} : { text }),
    });
  const debrief = () =>
    asLearner.query(api.attemptDebrief.access.ownDebrief, { attemptId });
  const feedbackRows = () =>
    t.run((ctx) => ctx.db.query("formativeFeedback").collect());
  const events = () =>
    t.run((ctx) =>
      ctx.db
        .query("attemptEvents")
        .withIndex("by_attempt_sequence", (q) => q.eq("attemptId", attemptId))
        .collect(),
    );
  return {
    t,
    asLearner,
    asPeer,
    asFaculty,
    scenarioId: scenario.scenarioId,
    attemptId,
    runScheduled,
    endWithEvidence,
    reflect,
    debrief,
    feedbackRows,
    events,
  };
}

describe("Complete the Attempt Debrief", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    completer.completeFeedback.mockReset();
    completer.completePatientReply.mockClear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("presents both prompts first and withholds feedback until each is answered or skipped", async () => {
    const { endWithEvidence, reflect, debrief, runScheduled } = await setup();
    completer.completeFeedback.mockResolvedValue(feedbackJson());

    await endWithEvidence();
    // Generation proceeds and completes without being revealed.
    await runScheduled();
    const reflecting = await debrief();
    expect(reflecting).toMatchObject({
      status: "reflecting",
      feedback: null,
      prompts: [
        { key: "interpretation", text: defaultReflectionPrompts.interpretation, responses: [] },
        { key: "planning", text: defaultReflectionPrompts.planning, responses: [] },
      ],
    });
    expect(JSON.stringify(reflecting)).not.toContain("You introduced yourself");

    expect(
      await reflect("interpretation", "answer", "Her breathing was slow."),
    ).toEqual({ status: "recorded" });
    expect((await debrief())).toMatchObject({ status: "reflecting", feedback: null });

    expect(await reflect("planning", "skip")).toEqual({ status: "recorded" });
    const revealed = await debrief();
    expect(revealed).toMatchObject({
      status: "revealed",
      feedback: {
        status: "completed",
        sections: {
          strengths: [{ text: "You introduced yourself.", evidence: [2] }],
          priorities: [{ observed: false, evidence: [] }],
          criteria: null,
          suggestions: ["Tell Elena where she is.", "Say aloud what concerns you."],
        },
      },
    });
    const { sections } = (revealed as { feedback: { sections: unknown } }).feedback;
    expect(JSON.stringify(sections)).not.toMatch(/pass|fail|grade|competen/i);
  });

  it("appends reflections without replacing earlier ones and replays retries", async () => {
    const { endWithEvidence, reflect, debrief } = await setup();
    completer.completeFeedback.mockResolvedValue(feedbackJson());
    await endWithEvidence();

    await reflect("interpretation", "answer", "First thought.", "reflection-a");
    // The response was lost; the browser retries the same request.
    expect(
      await reflect("interpretation", "answer", "First thought.", "reflection-a"),
    ).toEqual({ status: "recorded" });
    await reflect("interpretation", "answer", "A later clarification.");
    expect(await reflect("interpretation", "skip")).toEqual({
      status: "already_responded",
    });
    await expect(reflect("planning", "answer", "   ")).rejects.toThrow(
      "A reflection must contain",
    );

    const [interpretation] = (await debrief() as { prompts: { responses: unknown[] }[] })
      .prompts;
    expect(interpretation.responses).toEqual([
      { response: "answer", text: "First thought.", submittedAt: expect.any(Number) },
      { response: "answer", text: "A later clarification.", submittedAt: expect.any(Number) },
    ]);
  });

  it("starts generation once at ending and recovers a failure with one result", async () => {
    const { asLearner, attemptId, endWithEvidence, reflect, debrief, runScheduled, feedbackRows, events } =
      await setup();
    completer.completeFeedback
      .mockRejectedValueOnce(new Error("Request timed out"))
      .mockResolvedValueOnce(feedbackJson());

    await endWithEvidence();
    // A lost ending response is retried; generation is not started twice.
    await asLearner.mutation(api.attemptEnding.access.end, { attemptId, confirmed: true });
    await runScheduled();
    expect(await feedbackRows()).toMatchObject([{ status: "failed", generation: 1 }]);
    const recorded = await events();

    await reflect("interpretation", "skip");
    await reflect("planning", "skip");
    expect(await debrief()).toMatchObject({ feedback: { status: "failed" } });

    const retry = () =>
      asLearner.mutation(api.attemptDebrief.access.retryFeedbackGeneration, { attemptId });
    expect(await retry()).toEqual({ status: "pending" });
    // A second click while it is in flight starts nothing new.
    expect(await retry()).toEqual({ status: "pending" });
    const [pending] = await feedbackRows();
    await runScheduled();

    expect(await feedbackRows()).toMatchObject([{ status: "completed", generation: 2 }]);
    expect(pending.generation).toBe(2);
    expect(await debrief()).toMatchObject({ feedback: { status: "completed" } });
    expect(await retry()).toEqual({ status: "completed" });
    expect(completer.completeFeedback).toHaveBeenCalledTimes(2);
    // Feedback never changes the Ended Attempt.
    expect(await events()).toEqual(recorded);
  });

  it("discards a stale generation and makes an interrupted one retryable at the deadline", async () => {
    const { t, asLearner, attemptId, endWithEvidence, feedbackRows, runScheduled } =
      await setup();
    completer.completeFeedback.mockResolvedValue(feedbackJson());
    await endWithEvidence();
    const [feedback] = await feedbackRows();

    // The generation is dropped before it runs; the deadline marks it failed.
    await t.run(async (ctx) => {
      const [generate] = await ctx.db.system
        .query("_scheduled_functions")
        .filter((q) => q.eq(q.field("name"), "attemptDebrief/generation:generate"))
        .collect();
      await ctx.scheduler.cancel(generate._id);
    });
    vi.advanceTimersByTime(feedbackDeadlineMs);
    await t.finishInProgressScheduledFunctions();
    expect((await feedbackRows())[0].status).toBe("failed");

    await asLearner.mutation(api.attemptDebrief.access.retryFeedbackGeneration, { attemptId });
    const stale = JSON.parse(feedbackJson({ suggestions: ["Stale one.", "Stale two."] }));
    await t.mutation(internal.attemptDebrief.generation.commit, {
      feedbackId: feedback._id,
      generation: 1,
      sections: { ...stale, criteria: null },
    });
    await runScheduled();

    const [completed] = await feedbackRows();
    expect(completed.status).toBe("completed");
    expect(completed.sections?.suggestions).toEqual([
      "Tell Elena where she is.",
      "Say aloud what concerns you.",
    ]);
  });

  it("fails feedback that cites unrecorded evidence instead of attaching it", async () => {
    const { endWithEvidence, feedbackRows, runScheduled } = await setup();
    completer.completeFeedback.mockResolvedValue(
      feedbackJson({ summary: [{ text: "You escalated to the anesthesiologist.", evidence: [42] }] }),
    );
    await endWithEvidence();
    await runScheduled();
    expect(await feedbackRows()).toMatchObject([{ status: "failed" }]);
  });

  it("uses instructor-authored prompts and Communication Criteria when present", async () => {
    const { t, attemptId, endWithEvidence, reflect, debrief, runScheduled } = await setup();
    await t.run(async (ctx) => {
      const attempt = (await ctx.db.get(attemptId))!;
      await ctx.db.patch(attempt.scenarioVersionId, {
        debrief: {
          communicationCriteria: [
            { key: "escalation", label: "Escalation of concern", description: "States concern about breathing." },
          ],
          reflectionPrompts: { interpretation: "Authored interpretation?", planning: "Authored planning?" },
        },
      });
    });
    completer.completeFeedback.mockResolvedValue(
      feedbackJson({
        criteria: [
          {
            key: "escalation",
            rating: "not_yet_demonstrated",
            rationale: "Not observed in this Attempt.",
            evidence: [],
          },
        ],
      }),
    );

    await endWithEvidence();
    await runScheduled();
    expect(completer.completeFeedback.mock.calls[0][0]).toMatchObject({
      systemInstruction: expect.stringContaining("escalation: Escalation of concern."),
    });
    await reflect("interpretation", "answer", "Slow breathing.");
    await reflect("planning", "answer", "Escalate sooner.");

    expect(await debrief()).toMatchObject({
      prompts: [{ text: "Authored interpretation?" }, { text: "Authored planning?" }],
      feedback: {
        status: "completed",
        sections: {
          criteria: [
            {
              key: "escalation",
              label: "Escalation of concern",
              rating: "not_yet_demonstrated",
              evidence: [],
            },
          ],
        },
      },
    });
  });

  it("has the AI write Reflection Prompts from instructor guidance before any reflection", async () => {
    const { t, asLearner, attemptId, endWithEvidence, reflect, debrief, runScheduled } =
      await setup();
    const feedbackGuidance =
      "Focus on how the student explains care to a frightened patient.";
    await t.run(async (ctx) => {
      const attempt = (await ctx.db.get(attemptId))!;
      await ctx.db.patch(attempt.scenarioVersionId, { debrief: { feedbackGuidance } });
    });
    const reflectionPrompts = {
      interpretation: "What did Elena's questions tell you about how she felt?",
      planning: "How will you explain your actions to her next time?",
    };
    completer.completeFeedback
      .mockRejectedValueOnce(new Error("Request timed out"))
      .mockResolvedValueOnce(feedbackJson({ reflectionPrompts }));

    await endWithEvidence();
    expect(await debrief()).toEqual({ status: "preparing", failed: false });
    // There is nothing to answer until the prompts exist.
    expect(await reflect("planning", "skip")).toEqual({ status: "not_available" });

    await runScheduled();
    expect(await debrief()).toEqual({ status: "preparing", failed: true });
    await asLearner.mutation(api.attemptDebrief.access.retryFeedbackGeneration, { attemptId });
    await runScheduled();

    const [, retriedCall] = completer.completeFeedback.mock.calls;
    expect(retriedCall[0].systemInstruction).toContain(feedbackGuidance);
    expect(retriedCall[0].systemInstruction).toContain('"reflectionPrompts"');
    expect(await debrief()).toMatchObject({
      status: "reflecting",
      feedback: null,
      prompts: [
        { key: "interpretation", text: reflectionPrompts.interpretation },
        { key: "planning", text: reflectionPrompts.planning },
      ],
    });

    await reflect("interpretation", "answer", "She was scared and confused.");
    await reflect("planning", "skip");
    expect(await debrief()).toMatchObject({
      status: "revealed",
      feedback: { status: "completed" },
    });
    const stored = await t.run((ctx) => ctx.db.query("learnerReflections").collect());
    expect(stored.map(({ promptText }) => promptText)).toEqual([
      reflectionPrompts.interpretation,
      reflectionPrompts.planning,
    ]);
  });

  it("prefers fixed instructor prompts over generated ones while still following guidance", async () => {
    const { t, attemptId, endWithEvidence, debrief, runScheduled } = await setup();
    await t.run(async (ctx) => {
      const attempt = (await ctx.db.get(attemptId))!;
      await ctx.db.patch(attempt.scenarioVersionId, {
        debrief: {
          feedbackGuidance: "Be brief and encouraging.",
          reflectionPrompts: { interpretation: "Fixed interpretation?", planning: "Fixed planning?" },
        },
      });
    });
    completer.completeFeedback.mockResolvedValue(feedbackJson());

    await endWithEvidence();
    expect(await debrief()).toMatchObject({
      status: "reflecting",
      prompts: [{ text: "Fixed interpretation?" }, { text: "Fixed planning?" }],
    });
    await runScheduled();
    const [call] = completer.completeFeedback.mock.calls;
    expect(call[0].systemInstruction).toContain("Be brief and encouraging.");
    expect(call[0].systemInstruction).not.toContain('"reflectionPrompts"');
  });

  it("offers no Debrief for Active or restarted Attempts", async () => {
    const { asLearner, scenarioId, attemptId, reflect, debrief, feedbackRows } = await setup();
    expect(await debrief()).toEqual({ status: "not_available", reason: "active" });
    expect(await reflect("planning", "skip")).toEqual({ status: "not_available" });

    await asLearner.mutation(api.attemptStart.access.start, {
      scenarioId,
      endActiveAttemptId: attemptId,
    });
    expect(await debrief()).toEqual({ status: "not_available", reason: "restarted" });
    expect(await reflect("planning", "skip")).toEqual({ status: "not_available" });
    expect(
      await asLearner.mutation(api.attemptDebrief.access.retryFeedbackGeneration, { attemptId }),
    ).toEqual({ status: "not_available" });
    expect(await feedbackRows()).toHaveLength(0);
  });

  it("keeps the Debrief Learner-owned", async () => {
    const { asPeer, asFaculty, scenarioId, attemptId, endWithEvidence } = await setup();
    completer.completeFeedback.mockResolvedValue(feedbackJson());
    await endWithEvidence();

    for (const id of [attemptId, "not-an-attempt-id", scenarioId]) {
      expect(
        await asPeer.query(api.attemptDebrief.access.ownDebrief, { attemptId: id }),
      ).toBeNull();
      expect(
        await asPeer.mutation(api.attemptDebrief.access.reflect, {
          attemptId: id,
          clientRequestId: "peer",
          prompt: "planning",
          response: "skip",
        }),
      ).toEqual({ status: "not_found" });
    }
    await expect(
      asFaculty.query(api.attemptDebrief.access.ownDebrief, { attemptId }),
    ).rejects.toThrow("Learner role required");
  });
});
