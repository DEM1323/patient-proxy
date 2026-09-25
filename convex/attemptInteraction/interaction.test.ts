import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import schema from "../schema";
import { initialPacuAssessment } from "../attemptStart/scenarioContent";
import { admitWorkosUser } from "../membershipAccess/model";
import { modules } from "../test.setup";
import { exchangeDeadlineMs } from "./model";
import type { PatientPrompt } from "./patientPrompt";

// Unit tests never call live Gemini.
const completer = vi.hoisted(() => ({
  completePatientReply: vi.fn<(prompt: PatientPrompt) => Promise<string>>(),
}));
vi.mock("./gemini", () => completer);
const completePatientReply = completer.completePatientReply;

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
  const started = await asLearner.mutation(api.attemptStart.access.start, {
    scenarioId: scenario.scenarioId,
  });
  const attemptId = (started as { attemptId: Id<"attempts"> }).attemptId;

  const send = (clientRequestId: string, text: string) =>
    asLearner.mutation(api.attemptInteraction.access.send, {
      attemptId,
      clientRequestId,
      text,
    });
  const retry = (clientRequestId: string) =>
    asLearner.mutation(api.attemptInteraction.access.retry, {
      attemptId,
      clientRequestId,
    });
  const view = async () =>
    (await asLearner.query(api.attemptStart.access.ownAttempt, { attemptId }))!;
  const messages = async () =>
    (await view()).timeline
      .filter((event) => event.text !== undefined)
      .map((event) => [event.kind, event.text]);
  // Runs due generations only. finishAllScheduledFunctions would also pump
  // the 60-second deadline while a generation is still awaiting its reply;
  // tests fire the deadline explicitly through markFailed instead.
  const runScheduled = async () => {
    vi.advanceTimersByTime(1);
    await t.finishInProgressScheduledFunctions();
  };

  return {
    t,
    asLearner,
    asPeer,
    asFaculty,
    scenarioId: scenario.scenarioId,
    attemptId,
    send,
    retry,
    view,
    messages,
    runScheduled,
  };
}

async function exchanges(t: Awaited<ReturnType<typeof setup>>["t"]) {
  return await t.run((ctx) => ctx.db.query("exchangeRequests").collect());
}

function expectNoClinicalTruth(response: unknown) {
  const serialized = JSON.stringify(response);
  expect(serialized).not.toContain("clinicalTruth");
  for (const hiddenFact of [
    ...initialPacuAssessment.clinicalTruth.initialState,
    ...initialPacuAssessment.clinicalTruth.progression,
    ...initialPacuAssessment.clinicalTruth.learningObjectives,
    "RR 8",
    "SpO2 93%",
  ]) {
    expect(serialized).not.toContain(hiddenFact);
  }
}

describe("Hold a recoverable patient exchange", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    completePatientReply.mockReset();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("records ordered turns grounded in the pinned authored state without changing Clinical Truth", async () => {
    const { t, attemptId, send, view, messages, runScheduled } = await setup();
    completePatientReply
      .mockResolvedValueOnce("Elena Ruiz: Mm... I'm not sure. Where am I?")
      .mockResolvedValueOnce("Oh... okay. The recovery room.");

    expect(await send("request-1", "  Can you tell me where you are?  ")).toEqual({
      status: "pending",
    });
    expect((await view()).exchange).toEqual({
      clientRequestId: "request-1",
      status: "pending",
    });
    await runScheduled();
    expect(await send("request-2", "You're in the recovery room after surgery.")).toEqual({
      status: "pending",
    });
    await runScheduled();

    const restored = await view();
    expect(restored.timeline.map((event) => [event.sequence, event.kind])).toEqual([
      [1, "attempt_started"],
      [2, "learner_message"],
      [3, "patient_message"],
      [4, "learner_message"],
      [5, "patient_message"],
    ]);
    expect(await messages()).toEqual([
      ["learner_message", "Can you tell me where you are?"],
      ["patient_message", "Mm... I'm not sure. Where am I?"],
      ["learner_message", "You're in the recovery room after surgery."],
      ["patient_message", "Oh... okay. The recovery room."],
    ]);
    expect(restored.exchange).toBeNull();
    expectNoClinicalTruth(restored);

    // The second prompt carries the authored initial state and the preceding
    // conversation, and withholds progression until Clinical Actions exist.
    const secondPrompt = completePatientReply.mock.calls[1][0];
    for (const fact of initialPacuAssessment.clinicalTruth.initialState) {
      expect(secondPrompt.systemInstruction).toContain(fact);
    }
    for (const later of initialPacuAssessment.clinicalTruth.progression) {
      expect(JSON.stringify(secondPrompt)).not.toContain(later);
    }
    expect(secondPrompt.contents).toEqual([
      { role: "user", parts: [{ text: "Can you tell me where you are?" }] },
      { role: "model", parts: [{ text: "Mm... I'm not sure. Where am I?" }] },
      {
        role: "user",
        parts: [{ text: "You're in the recovery room after surgery." }],
      },
    ]);

    const pinned = await t.run(async (ctx) => {
      const attempt = (await ctx.db.get(attemptId))!;
      return (await ctx.db.get(attempt.scenarioVersionId))!.clinicalTruth;
    });
    expect(pinned).toEqual(initialPacuAssessment.clinicalTruth);
  });

  it("recovers a failed reply by retrying the same request without duplicate messages", async () => {
    const { send, retry, view, messages, runScheduled } = await setup();
    completePatientReply
      .mockRejectedValueOnce(new Error("Request timed out"))
      .mockResolvedValueOnce("   ")
      .mockResolvedValueOnce("I... I'm not sure.");

    await send("request-1", "Can you tell me where you are?");
    await runScheduled();
    expect((await view()).exchange).toEqual({
      clientRequestId: "request-1",
      status: "failed",
    });
    expect(await messages()).toEqual([
      ["learner_message", "Can you tell me where you are?"],
    ]);

    // An empty reply is malformed: still failed, still no patient message.
    expect(await retry("request-1")).toEqual({ status: "pending" });
    await runScheduled();
    expect((await view()).exchange?.status).toBe("failed");

    // Resending the same request (a lost response) is a retry, not a new turn.
    expect(await send("request-1", "Can you tell me where you are?")).toEqual({
      status: "pending",
    });
    await runScheduled();
    expect(await send("request-1", "Can you tell me where you are?")).toEqual({
      status: "completed",
    });
    await runScheduled();
    expect(await messages()).toEqual([
      ["learner_message", "Can you tell me where you are?"],
      ["patient_message", "I... I'm not sure."],
    ]);
    expect(completePatientReply).toHaveBeenCalledTimes(3);

    // A deliberate new message is a new request.
    completePatientReply.mockResolvedValueOnce("Okay.");
    await send("request-2", "You're in the recovery room.");
    await runScheduled();
    expect(await messages()).toHaveLength(4);
  });

  it("lets only the newest generation commit after an interrupted reply", async () => {
    const { t, send, retry, view, messages, runScheduled } = await setup();
    completePatientReply.mockResolvedValue("Where... where am I?");

    await send("request-1", "Can you tell me where you are?");
    const [exchange] = await exchanges(t);
    // Before the deadline, a retry does not start a competing generation.
    expect(await retry("request-1")).toEqual({ status: "pending" });
    expect((await exchanges(t))[0].generation).toBe(1);

    // The generation is dropped before it runs; the deadline marks it failed.
    await t.run(async (ctx) => {
      const [generate] = await ctx.db.system
        .query("_scheduled_functions")
        .filter((q) =>
          q.eq(q.field("name"), "attemptInteraction/generation:generate"),
        )
        .collect();
      await ctx.scheduler.cancel(generate._id);
    });
    vi.advanceTimersByTime(exchangeDeadlineMs);
    await t.finishInProgressScheduledFunctions();
    expect((await view()).exchange?.status).toBe("failed");
    expect(await retry("request-1")).toEqual({ status: "pending" });

    // A stale result from the interrupted generation is discarded.
    await t.mutation(internal.attemptInteraction.generation.commit, {
      exchangeId: exchange._id,
      generation: 1,
      text: "A stale reply",
    });
    await runScheduled();

    expect(await messages()).toEqual([
      ["learner_message", "Can you tell me where you are?"],
      ["patient_message", "Where... where am I?"],
    ]);
    expect(completePatientReply).toHaveBeenCalledTimes(1);
    expect((await exchanges(t))[0]).toMatchObject({
      status: "completed",
      generation: 2,
    });
  });

  it("refuses a different request while a reply is pending and supersedes a failed one", async () => {
    const { t, send, view, messages, runScheduled } = await setup();

    await send("request-1", "Can you tell me where you are?");
    expect(await send("request-2", "Hello?")).toEqual({ status: "busy" });
    expect(await messages()).toHaveLength(1);

    completePatientReply
      .mockRejectedValueOnce(new Error("Request timed out"))
      .mockResolvedValueOnce("Hi... I'm so tired.");
    await runScheduled();
    expect((await view()).exchange?.status).toBe("failed");

    await send("request-2", "Hello, Elena?");
    await runScheduled();
    expect(await messages()).toEqual([
      ["learner_message", "Can you tell me where you are?"],
      ["learner_message", "Hello, Elena?"],
      ["patient_message", "Hi... I'm so tired."],
    ]);
    expect(completePatientReply.mock.calls[1][0].contents).toEqual([
      {
        role: "user",
        parts: [{ text: "Can you tell me where you are?" }, { text: "Hello, Elena?" }],
      },
    ]);
    expect(
      (await exchanges(t)).map((exchange) => [
        exchange.clientRequestId,
        exchange.status,
      ]),
    ).toEqual([
      ["request-1", "abandoned"],
      ["request-2", "completed"],
    ]);
    // The superseded request can no longer be answered.
    expect(await send("request-1", "Can you tell me where you are?")).toEqual({
      status: "abandoned",
    });
  });

  it("appends nothing when a reply arrives after Start again ended the Attempt", async () => {
    const { t, asLearner, scenarioId, attemptId, send, retry, view, runScheduled } =
      await setup();
    completePatientReply.mockImplementationOnce(async () => {
      // The Learner confirms Start again while the reply is in flight.
      await asLearner.mutation(api.attemptStart.access.start, {
        scenarioId,
        endActiveAttemptId: attemptId,
      });
      return "I'm not sure where I am.";
    });

    await send("request-1", "Can you tell me where you are?");
    await runScheduled();

    const ended = await view();
    expect(ended).toMatchObject({ status: "ended", exchange: null });
    expect(ended.timeline.map((event) => event.kind)).toEqual([
      "attempt_started",
      "learner_message",
      "attempt_ended",
    ]);
    expect((await exchanges(t))[0].status).toBe("abandoned");
    expect(await retry("request-1")).toEqual({ status: "abandoned" });
    expect(await send("request-2", "Are you okay?")).toEqual({ status: "ended" });
    expect((await view()).timeline).toHaveLength(3);
  });

  it("discards a reply that finishes after the Attempt ended by any path", async () => {
    const { t, attemptId, send, view, runScheduled } = await setup();
    completePatientReply.mockImplementationOnce(async () => {
      await t.run((ctx) =>
        ctx.db.patch(attemptId, {
          status: "ended",
          endedAt: Date.now(),
          endReason: "learner_ended",
        }),
      );
      return "I'm not sure where I am.";
    });

    await send("request-1", "Can you tell me where you are?");
    await runScheduled();

    expect((await view()).timeline.map((event) => event.kind)).toEqual([
      "attempt_started",
      "learner_message",
    ]);
    expect((await exchanges(t))[0].status).toBe("abandoned");
  });

  it("denies interaction to other Members, Ended Attempts, and foreign identifiers", async () => {
    const { t, asPeer, asFaculty, scenarioId, attemptId, send, retry, view } =
      await setup();
    await send("request-1", "Hello, Elena.");
    const before = (await view()).timeline;

    const peerSend = (id: string) =>
      asPeer.mutation(api.attemptInteraction.access.send, {
        attemptId: id,
        clientRequestId: "peer-request",
        text: "Hello",
      });
    expect(await peerSend(attemptId)).toEqual({ status: "not_found" });
    expect(
      await asPeer.mutation(api.attemptInteraction.access.retry, {
        attemptId,
        clientRequestId: "request-1",
      }),
    ).toEqual({ status: "not_found" });
    await expect(
      asFaculty.mutation(api.attemptInteraction.access.send, {
        attemptId,
        clientRequestId: "faculty-request",
        text: "Hello",
      }),
    ).rejects.toThrow("Learner role required");
    expect(await peerSend("not-an-attempt-id")).toEqual({ status: "not_found" });
    expect(await peerSend(scenarioId)).toEqual({ status: "not_found" });
    expect(await retry("never-sent")).toEqual({ status: "not_found" });
    await expect(send("request-2", "   ")).rejects.toThrow(
      "A message must contain",
    );

    await t.run((ctx) =>
      ctx.db.patch(attemptId, {
        status: "ended",
        endedAt: Date.now(),
        endReason: "learner_ended",
      }),
    );
    expect(await send("request-3", "Hello again")).toEqual({ status: "ended" });

    expect((await view()).timeline).toEqual(before);
    expect(await exchanges(t)).toHaveLength(1);
  });
});
