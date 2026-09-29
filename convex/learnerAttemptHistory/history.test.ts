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
  const scenarioId = scenario.scenarioId;

  type Member = typeof asLearner;
  const start = async (asMember: Member, endActiveAttemptId?: Id<"attempts">) =>
    (
      (await asMember.mutation(api.attemptStart.access.start, {
        scenarioId,
        endActiveAttemptId,
      })) as { attemptId: Id<"attempts"> }
    ).attemptId;
  // One Learner turn plus one Clinical Action, then a confirmed end.
  const endDeliberately = async (asMember: Member, attemptId: Id<"attempts">) => {
    await asMember.mutation(api.attemptInteraction.access.send, {
      attemptId,
      clientRequestId: `message-${attemptId}`,
      text: "Hello, Elena.",
    });
    await asMember.mutation(api.attemptInteraction.access.takeAction, {
      attemptId,
      clientRequestId: `action-${attemptId}`,
      actionKey: "hand_hygiene",
    });
    await asMember.mutation(api.attemptEnding.access.end, {
      attemptId,
      confirmed: true,
    });
  };
  const history = (asMember: Member) =>
    asMember.query(api.learnerAttemptHistory.access.ownEndedAttempts, {});
  return { t, asLearner, asPeer, asFaculty, scenarioId, start, endDeliberately, history };
}

describe("Revisit an Ended Attempt", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("lists only the Learner's own Ended Attempts, newest first, without the Active Attempt", async () => {
    const { asLearner, asPeer, start, endDeliberately, history } = await setup();
    const first = await start(asLearner);
    await endDeliberately(asLearner, first);
    vi.advanceTimersByTime(60_000);
    // Start again ends the second Attempt as a restart and leaves a third Active.
    const second = await start(asLearner);
    vi.advanceTimersByTime(60_000);
    const active = await start(asLearner, second);
    const peerAttempt = await start(asPeer);
    await endDeliberately(asPeer, peerAttempt);

    const listed = await history(asLearner);
    expect(listed.map(({ id }) => id)).toEqual([second, first]);
    expect(listed).toMatchObject([
      { endReason: "learner_restarted", debrief: "none", scenarioTitle: "Initial PACU Assessment" },
      { endReason: "learner_ended", debrief: "reflecting", scenarioVersion: 1 },
    ]);
    expect(listed.map(({ id }) => id)).not.toContain(active);
    expect(listed.map(({ id }) => id)).not.toContain(peerAttempt);
    expect(await history(asPeer)).toEqual([expect.objectContaining({ id: peerAttempt })]);
  });

  it("reports the Debrief as complete once both prompts are answered or skipped", async () => {
    const { asLearner, start, endDeliberately, history } = await setup();
    const attemptId = await start(asLearner);
    await endDeliberately(asLearner, attemptId);

    for (const prompt of ["interpretation", "planning"] as const) {
      expect((await history(asLearner))[0].debrief).toBe("reflecting");
      await asLearner.mutation(api.attemptDebrief.access.reflect, {
        attemptId,
        clientRequestId: `reflection-${prompt}`,
        prompt,
        response: "skip",
      });
    }
    expect((await history(asLearner))[0].debrief).toBe("complete");
    // The list says where the Learner is, never what the feedback says.
    expect(JSON.stringify(await history(asLearner))).not.toMatch(/sections|summary|feedback/i);
  });

  it("keeps each record readable only by its owner", async () => {
    const { asLearner, asPeer, asFaculty, scenarioId, start, endDeliberately } = await setup();
    const attemptId = await start(asLearner);
    await endDeliberately(asLearner, attemptId);

    for (const id of [attemptId, "not-an-attempt-id", scenarioId]) {
      expect(await asPeer.query(api.attemptStart.access.ownAttempt, { attemptId: id })).toBeNull();
      expect(await asPeer.query(api.attemptDebrief.access.ownDebrief, { attemptId: id })).toBeNull();
    }
    expect(await asLearner.query(api.attemptStart.access.ownAttempt, { attemptId })).toMatchObject({
      id: attemptId,
      status: "ended",
    });
    await expect(
      asFaculty.query(api.learnerAttemptHistory.access.ownEndedAttempts, {}),
    ).rejects.toThrow("Learner role required");
  });
});
