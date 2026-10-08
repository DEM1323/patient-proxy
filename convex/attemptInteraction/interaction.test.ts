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
    clientRequestId: crypto.randomUUID(),
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

  it("regenerates a screened reply once instead of recording it", async () => {
    const { send, view, messages, runScheduled } = await setup();
    completePatientReply
      .mockResolvedValueOnce("My oxygen is 93% on room air.")
      .mockResolvedValueOnce("I... I'm so cold.");

    await send("request-1", "How are you feeling?");
    await runScheduled();

    expect(await messages()).toEqual([
      ["learner_message", "How are you feeling?"],
      ["patient_message", "I... I'm so cold."],
    ]);
    expect((await view()).exchange).toBeNull();
    expect(completePatientReply).toHaveBeenCalledTimes(2);
  });

  it("fails the exchange when the regenerated reply is screened too, and recovers on retry", async () => {
    const { send, retry, view, messages, runScheduled } = await setup();
    completePatientReply
      .mockResolvedValueOnce("*shivers* I'm cold.")
      .mockResolvedValueOnce("As an AI, I don't feel cold.")
      .mockResolvedValueOnce("I'm cold...");

    await send("request-1", "How are you feeling?");
    await runScheduled();
    expect((await view()).exchange).toEqual({
      clientRequestId: "request-1",
      status: "failed",
    });
    expect(await messages()).toEqual([
      ["learner_message", "How are you feeling?"],
    ]);

    expect(await retry("request-1")).toEqual({ status: "pending" });
    await runScheduled();
    expect(await messages()).toEqual([
      ["learner_message", "How are you feeling?"],
      ["patient_message", "I'm cold..."],
    ]);
    expect(completePatientReply).toHaveBeenCalledTimes(3);
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
        clientRequestId: crypto.randomUUID(),
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

describe("Take a recoverable Clinical Action", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    completePatientReply.mockReset();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  async function actionSetup() {
    const context = await setup();
    const act = (clientRequestId: string, actionKey: string) =>
      context.asLearner.mutation(api.attemptInteraction.access.takeAction, {
        attemptId: context.attemptId,
        clientRequestId,
        actionKey,
      });
    const actions = async () =>
      (await context.view()).timeline.flatMap((event) =>
        event.action ? [[event.sequence, event.action.key, event.action.observation]] : [],
      );
    return { ...context, act, actions };
  }

  it("records the selection and timing and reveals authored vital signs without AI", async () => {
    const { act, view } = await actionSetup();
    const before = Date.now();

    expect(await act("action-1", "vital_signs")).toEqual({ status: "recorded" });

    const restored = await view();
    expect(restored.clinicalActions).toHaveLength(8);
    const [, event] = restored.timeline;
    expect(event).toMatchObject({
      sequence: 2,
      kind: "clinical_action",
      action: {
        key: "vital_signs",
        label: "Obtain all vital signs",
        observation:
          "BP 124/84, HR 92, RR 8, SpO2 93% on room air, temperature 98.4 F.",
      },
    });
    expect(event.occurredAt).toBeGreaterThanOrEqual(before);
    expect(completePatientReply).not.toHaveBeenCalled();
    // Observation rules and unrevealed progression stay hidden.
    const serialized = JSON.stringify(restored);
    expect(serialized).not.toContain("SpO2 98%");
    expect(serialized).not.toContain("sick to her stomach");
    expect(serialized).not.toContain("ifPerformed");
  });

  it("keeps one occurrence for a retried request and a new one for an intentional repeat", async () => {
    const { act, actions } = await actionSetup();

    await act("action-1", "vital_signs");
    // The response was lost; the browser retries the same request.
    expect(await act("action-1", "vital_signs")).toEqual({ status: "recorded" });
    expect(await actions()).toHaveLength(1);

    await act("action-2", "oxygen_monitoring");
    await act("action-3", "vital_signs");
    expect(await actions()).toEqual([
      [2, "vital_signs", expect.stringContaining("93% on room air")],
      [3, "oxygen_monitoring", "Oxygen applied and continuous monitoring started."],
      [4, "vital_signs", expect.stringContaining("93% on oxygen")],
    ]);
  });

  it("drives the authored progression and gives Elena the current state", async () => {
    const { act, actions, send, runScheduled } = await actionSetup();
    completePatientReply.mockResolvedValue("Mm... okay.");

    await send("message-1", "Hi Elena, I'm your nurse.");
    await runScheduled();
    const arrivalPrompt = completePatientReply.mock.calls[0][0];
    expect(arrivalPrompt.systemInstruction).toContain(
      "Drowsy, pale, shivering, and moaning.",
    );
    expect(arrivalPrompt.systemInstruction).not.toContain("sick to her stomach");

    await act("action-1", "position_airway");
    await act("action-2", "oxygen_monitoring");
    await act("action-3", "vital_signs");
    await act("action-4", "emesis_basin");
    const [, stabilizing, vitals, conclusion] = await actions();
    expect(stabilizing[2]).toMatch(/SpO2 improves to 98%.*sick to her stomach/);
    expect(vitals[2]).toBe(
      "BP 124/84, HR 92, RR 8, SpO2 98% on oxygen, temperature 98.4 F.",
    );
    expect(conclusion[2]).toMatch(/concludes the authored progression/);

    await send("message-2", "How are you feeling now?");
    await runScheduled();
    const laterPrompt = completePatientReply.mock.calls[1][0];
    expect(laterPrompt.systemInstruction).toContain(
      "Now feels sick to her stomach and is worried she might vomit and choke.",
    );
    expect(laterPrompt.systemInstruction).not.toContain("Drowsy");
    expect(laterPrompt.contents.at(-1)).toEqual({
      role: "user",
      parts: [
        { text: "(The nurse performs a Clinical Action: Position for airway safety.)" },
        { text: "(The nurse performs a Clinical Action: Apply oxygen and monitoring.)" },
        { text: "(The nurse performs a Clinical Action: Obtain all vital signs.)" },
        {
          text: "(The nurse performs a Clinical Action: Provide an emesis basin and position for nausea.)",
        },
        { text: "How are you feeling now?" },
      ],
    });
  });

  it("publishes changed authored content as a new version while Attempts stay pinned", async () => {
    const { t, act, view, attemptId } = await actionSetup();
    // Simulate an Attempt pinned to a version published before Clinical Actions.
    await t.run(async (ctx) => {
      const attempt = (await ctx.db.get(attemptId))!;
      const version = (await ctx.db.get(attempt.scenarioVersionId))!;
      const { clinicalActions, ...earlierTruth } = version.clinicalTruth;
      void clinicalActions;
      await ctx.db.patch(version._id, { clinicalTruth: earlierTruth });
    });

    expect(
      await t.mutation(internal.attemptStart.pilotProvisioning.provision, {}),
    ).toMatchObject({ scenarioVersion: 2 });
    expect(
      await t.mutation(internal.attemptStart.pilotProvisioning.provision, {}),
    ).toMatchObject({ scenarioVersion: 2 });

    const pinned = await view();
    expect(pinned.scenario.version).toBe(1);
    expect(pinned.clinicalActions).toEqual([]);
    await expect(act("action-1", "vital_signs")).rejects.toThrow(
      "Unknown Clinical Action",
    );
  });

  it("denies Clinical Actions to other Members, Ended Attempts, and unknown actions", async () => {
    const { t, asPeer, asFaculty, attemptId, act, actions } = await actionSetup();
    await act("action-1", "hand_hygiene");

    expect(
      await asPeer.mutation(api.attemptInteraction.access.takeAction, {
        attemptId,
        clientRequestId: "peer-action",
        actionKey: "vital_signs",
      }),
    ).toEqual({ status: "not_found" });
    expect(
      await asPeer.mutation(api.attemptInteraction.access.takeAction, {
        attemptId: "not-an-attempt-id",
        clientRequestId: "peer-action",
        actionKey: "vital_signs",
      }),
    ).toEqual({ status: "not_found" });
    await expect(
      asFaculty.mutation(api.attemptInteraction.access.takeAction, {
        attemptId,
        clientRequestId: "faculty-action",
        actionKey: "vital_signs",
      }),
    ).rejects.toThrow("Learner role required");
    await expect(act("action-2", "administer_naloxone")).rejects.toThrow(
      "Unknown Clinical Action",
    );

    await t.run((ctx) =>
      ctx.db.patch(attemptId, {
        status: "ended",
        endedAt: Date.now(),
        endReason: "learner_ended",
      }),
    );
    expect(await act("action-3", "vital_signs")).toEqual({ status: "ended" });
    // A late retry of an already recorded action still confirms it.
    expect(await act("action-1", "hand_hygiene")).toEqual({ status: "recorded" });
    expect(await actions()).toEqual([
      [2, "hand_hygiene", "Hand hygiene recorded."],
    ]);
  });
});
