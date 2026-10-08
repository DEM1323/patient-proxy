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
  completeFeedback: vi.fn(async () => "not json"),
}));

const roster = JSON.stringify({
  version: 1,
  entries: [
    { email: "learner@example.edu", institutionKey: "umb", roles: ["learner"] },
    { email: "peer@example.edu", institutionKey: "umb", roles: ["learner"] },
    { email: "admin@example.edu", institutionKey: "umb", roles: ["institutionalAdmin"] },
  ],
});
const day = 24 * 60 * 60 * 1000;

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
  const asAdmin = await admit("user_admin", "admin@example.edu");
  await t.mutation(internal.attemptStart.pilotProvisioning.provision, {});
  const [scenario] = await asLearner.query(api.attemptStart.access.availableScenarios, {});

  type Member = typeof asLearner;
  const start = async (asMember: Member) =>
    (
      (await asMember.mutation(api.attemptStart.access.start, {
        scenarioId: scenario.scenarioId,
        clientRequestId: crypto.randomUUID(),
      })) as { attemptId: Id<"attempts"> }
    ).attemptId;
  const send = (asMember: Member, attemptId: Id<"attempts">, id: string) =>
    asMember.mutation(api.attemptInteraction.access.send, {
      attemptId,
      clientRequestId: id,
      text: "Hello, Elena.",
    });
  // One Learner turn plus one Clinical Action, a confirmed end, and a reflection.
  const endWithDebrief = async (asMember: Member, attemptId: Id<"attempts">) => {
    await send(asMember, attemptId, `message-${attemptId}`);
    await asMember.mutation(api.attemptInteraction.access.takeAction, {
      attemptId,
      clientRequestId: `action-${attemptId}`,
      actionKey: "hand_hygiene",
    });
    await asMember.mutation(api.attemptEnding.access.end, { attemptId, confirmed: true });
    await reflect(asMember, attemptId, "interpretation");
  };
  const reflect = (
    asMember: Member,
    attemptId: Id<"attempts">,
    prompt: "interpretation" | "planning",
  ) =>
    asMember.mutation(api.attemptDebrief.access.reflect, {
      attemptId,
      clientRequestId: `reflection-${prompt}-${Date.now()}`,
      prompt,
      response: "answer",
      text: "Her breathing was slow.",
    });
  const purge = () => t.mutation(internal.retention.purge.run, {});
  // Everything stored for one Attempt, across every table that references it.
  const stored = (attemptId: Id<"attempts">) =>
    t.run(async (ctx) => {
      const of = <T extends { attemptId: Id<"attempts"> }>(rows: T[]) =>
        rows.filter((row) => row.attemptId === attemptId).length;
      return {
        attempt: (await ctx.db.get(attemptId)) !== null,
        events: of(await ctx.db.query("attemptEvents").collect()),
        exchanges: of(await ctx.db.query("exchangeRequests").collect()),
        feedback: of(await ctx.db.query("formativeFeedback").collect()),
        reflections: of(await ctx.db.query("learnerReflections").collect()),
      };
    });
  const runs = () => t.run((ctx) => ctx.db.query("retentionRuns").collect());
  return { t, asLearner, asPeer, asAdmin, start, send, endWithDebrief, reflect, purge, stored, runs };
}

describe("Retention deletion", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T12:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("deletes an Ended Attempt with all its content 90 days after it ended, not before", async () => {
    const { asLearner, asPeer, asAdmin, start, endWithDebrief, reflect, purge, stored, runs } =
      await setup();
    const attemptId = await start(asLearner);
    await endWithDebrief(asLearner, attemptId);
    const before = await stored(attemptId);
    expect(before).toMatchObject({ attempt: true, feedback: 1, reflections: 1 });
    expect(before.events).toBeGreaterThan(0);
    expect(before.exchanges).toBeGreaterThan(0);

    vi.advanceTimersByTime(10 * day);
    const peerAttempt = await start(asPeer);
    await endWithDebrief(asPeer, peerAttempt);
    // A later reflection does not extend retention.
    vi.advanceTimersByTime(70 * day);
    await reflect(asLearner, attemptId, "planning");

    vi.advanceTimersByTime(10 * day - 60_000);
    expect(await purge()).toEqual({ endedDeleted: 0, activeDeleted: 0, more: false });
    expect((await stored(attemptId)).attempt).toBe(true);

    vi.advanceTimersByTime(120_000);
    expect(await purge()).toEqual({ endedDeleted: 1, activeDeleted: 0, more: false });
    expect(await stored(attemptId)).toEqual({
      attempt: false,
      events: 0,
      exchanges: 0,
      feedback: 0,
      reflections: 0,
    });
    expect(await asLearner.query(api.learnerAttemptHistory.access.ownEndedAttempts, {})).toEqual(
      [],
    );
    // A deleted id opens to nothing, without throwing.
    expect(await asLearner.query(api.attemptStart.access.ownAttempt, { attemptId })).toBeNull();
    expect(await asLearner.query(api.attemptDebrief.access.ownDebrief, { attemptId })).toBeNull();
    expect(await asAdmin.query(api.attemptReview.access.reviewAttempt, { attemptId })).toBeNull();
    expect(
      (await asAdmin.query(api.attemptReview.access.reviewableAttempts, {})).map(({ id }) => id),
    ).toEqual([peerAttempt]);
    // The peer's Attempt ended 10 days later and is untouched.
    expect((await stored(peerAttempt)).attempt).toBe(true);
    // Only non-identifying counts remain.
    const [run] = await runs();
    expect(run).toMatchObject({ endedAttemptsDeleted: 1, activeAttemptsDeleted: 0 });
    expect(Object.keys(run).sort()).toEqual([
      "_creationTime",
      "_id",
      "activeAttemptsDeleted",
      "endedAttemptsDeleted",
      "institutionId",
      "ranAt",
    ]);
  });

  it("deletes an Active Attempt 30 days after its last activity", async () => {
    const { asLearner, start, send, purge, stored } = await setup();
    const attemptId = await start(asLearner);
    vi.advanceTimersByTime(20 * day);
    await send(asLearner, attemptId, "late-message");

    // Started 45 days ago, but last active 25 days ago.
    vi.advanceTimersByTime(25 * day);
    expect(await purge()).toEqual({ endedDeleted: 0, activeDeleted: 0, more: false });
    expect((await stored(attemptId)).attempt).toBe(true);

    vi.advanceTimersByTime(5 * day + 60_000);
    expect(await purge()).toEqual({ endedDeleted: 0, activeDeleted: 1, more: false });
    expect(await stored(attemptId)).toEqual({
      attempt: false,
      events: 0,
      exchanges: 0,
      feedback: 0,
      reflections: 0,
    });
    // With no Active Attempt left, the Learner can start a new one directly.
    expect(await start(asLearner)).not.toBe(attemptId);
  });

  it("deletes in bounded batches and reports when more remain", async () => {
    const { t, asLearner, start, endWithDebrief, purge, runs } = await setup();
    const attemptId = await start(asLearner);
    await endWithDebrief(asLearner, attemptId);
    await t.run(async (ctx) => {
      const attempt = (await ctx.db.get(attemptId))!;
      for (let index = 0; index < 26; index += 1) {
        await ctx.db.insert("attempts", {
          institutionId: attempt.institutionId,
          learnerMembershipId: attempt.learnerMembershipId,
          scenarioId: attempt.scenarioId,
          scenarioVersionId: attempt.scenarioVersionId,
          status: "ended",
          startedAt: attempt.startedAt,
          endedAt: attempt.endedAt,
          endReason: attempt.endReason,
        });
      }
    });

    vi.advanceTimersByTime(91 * day);
    expect(await purge()).toEqual({ endedDeleted: 25, activeDeleted: 0, more: true });
    expect(await purge()).toEqual({ endedDeleted: 2, activeDeleted: 0, more: false });
    expect(await t.run((ctx) => ctx.db.query("attempts").collect())).toEqual([]);
    expect((await runs()).map(({ endedAttemptsDeleted }) => endedAttemptsDeleted)).toEqual([
      25, 2,
    ]);
  });
});
