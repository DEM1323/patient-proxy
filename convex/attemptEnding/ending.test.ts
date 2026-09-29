import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import schema from "../schema";
import { admitWorkosUser } from "../membershipAccess/model";
import { modules } from "../test.setup";

// Unit tests never call live Gemini.
const completer = vi.hoisted(() => ({
  completePatientReply: vi.fn(async () => "Mm... okay."),
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

  let requests = 0;
  const send = (text: string) =>
    asLearner.mutation(api.attemptInteraction.access.send, {
      attemptId,
      clientRequestId: `message-${++requests}`,
      text,
    });
  const act = (actionKey: string) =>
    asLearner.mutation(api.attemptInteraction.access.takeAction, {
      attemptId,
      clientRequestId: `action-${++requests}`,
      actionKey,
    });
  const end = () =>
    asLearner.mutation(api.attemptEnding.access.end, {
      attemptId,
      confirmed: true,
    });
  const view = async () =>
    (await asLearner.query(api.attemptStart.access.ownAttempt, { attemptId }))!;
  const kinds = async () => (await view()).timeline.map(({ kind }) => kind);
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
    act,
    end,
    view,
    kinds,
    runScheduled,
  };
}

describe("End the Attempt once", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    completer.completePatientReply.mockClear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("refuses ending before one Learner turn and one Clinical Action, then ends as learner_ended", async () => {
    const { send, act, end, view, kinds, runScheduled } = await setup();
    expect(await end()).toEqual({ status: "too_early" });

    await send("Hi Elena, I'm your nurse.");
    await runScheduled();
    expect((await view()).canEnd).toBe(false);
    expect(await end()).toEqual({ status: "too_early" });
    expect((await view()).status).toBe("active");

    await act("vital_signs");
    expect((await view()).canEnd).toBe(true);
    expect(await end()).toEqual({ status: "ended", endReason: "learner_ended" });

    const ended = await view();
    expect(ended).toMatchObject({
      status: "ended",
      endReason: "learner_ended",
      canEnd: false,
      exchange: null,
    });
    expect(ended.endedAt).toEqual(expect.any(Number));
    expect(await kinds()).toEqual([
      "attempt_started",
      "learner_message",
      "patient_message",
      "clinical_action",
      "attempt_ended",
    ]);
    // Ending records why interaction stopped, not how the Learner performed.
    expect(JSON.stringify(ended)).not.toMatch(/pass|fail|score|grade|competen/i);
  });

  it("allows ending after three Learner turns without a Clinical Action", async () => {
    const { send, end, view, runScheduled } = await setup();
    for (const text of ["Hello.", "Where are you?", "How is your pain?"]) {
      expect((await view()).canEnd).toBe(false);
      await send(text);
      await runScheduled();
    }
    expect((await view()).canEnd).toBe(true);
    expect(await end()).toEqual({ status: "ended", endReason: "learner_ended" });
  });

  it("returns the same Ended Attempt when ending is retried", async () => {
    const { t, send, act, end, view, kinds, runScheduled } = await setup();
    await send("Hello.");
    await runScheduled();
    await act("hand_hygiene");
    await end();
    const first = await view();

    // The browser lost the response and retries.
    vi.advanceTimersByTime(5_000);
    expect(await end()).toEqual({ status: "ended", endReason: "learner_ended" });

    expect(await view()).toEqual(first);
    expect((await kinds()).filter((kind) => kind === "attempt_ended")).toHaveLength(1);
    expect(
      await t.run((ctx) => ctx.db.query("attempts").collect()),
    ).toHaveLength(1);
  });

  it("rejects every interaction command and late reply after ending", async () => {
    const { t, asLearner, attemptId, send, act, end, kinds, runScheduled } =
      await setup();
    await act("vital_signs");
    // This message's reply is still pending when the Learner ends.
    await send("Can you tell me where you are?");
    expect(await end()).toEqual({ status: "ended", endReason: "learner_ended" });
    await runScheduled();

    expect(completer.completePatientReply).not.toHaveBeenCalled();
    const [exchange] = await t.run((ctx) =>
      ctx.db.query("exchangeRequests").collect(),
    );
    expect(exchange.status).toBe("abandoned");
    expect(await send("Are you still there?")).toEqual({ status: "ended" });
    expect(
      await asLearner.mutation(api.attemptInteraction.access.retry, {
        attemptId,
        clientRequestId: exchange.clientRequestId,
      }),
    ).toEqual({ status: "abandoned" });
    expect(await act("assess_pain")).toEqual({ status: "ended" });
    expect(await kinds()).toEqual([
      "attempt_started",
      "clinical_action",
      "learner_message",
      "attempt_ended",
    ]);
  });

  it("keeps restart exempt from the guardrail and reports its reason", async () => {
    const { asLearner, scenarioId, attemptId, end, view } = await setup();
    await asLearner.mutation(api.attemptStart.access.start, {
      scenarioId,
      endActiveAttemptId: attemptId,
    });
    expect(await view()).toMatchObject({
      status: "ended",
      endReason: "learner_restarted",
    });
    expect(await end()).toEqual({ status: "ended", endReason: "learner_restarted" });
  });

  it("denies ending to other Members, foreign identifiers, and unconfirmed calls", async () => {
    const {
      asLearner,
      asPeer,
      asFaculty,
      scenarioId,
      attemptId,
      send,
      act,
      view,
      runScheduled,
    } = await setup();
    await send("Hello.");
    await runScheduled();
    await act("hand_hygiene");

    for (const id of [attemptId, "not-an-attempt-id", scenarioId]) {
      expect(
        await asPeer.mutation(api.attemptEnding.access.end, {
          attemptId: id,
          confirmed: true,
        }),
      ).toEqual({ status: "not_found" });
    }
    await expect(
      asFaculty.mutation(api.attemptEnding.access.end, {
        attemptId,
        confirmed: true,
      }),
    ).rejects.toThrow("Learner role required");
    // Even the owning Learner cannot end without the explicit confirmation.
    await expect(
      asLearner.mutation(api.attemptEnding.access.end, {
        attemptId,
        confirmed: false as never,
      }),
    ).rejects.toThrow();
    expect((await view()).status).toBe("active");
  });
});
