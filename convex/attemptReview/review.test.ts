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
      strengths: [{ text: "You introduced yourself.", evidence: [2] }],
      priorities: [{ text: "Reassurance was not observed in this Attempt.", evidence: [], observed: false }],
      criteria: [],
      suggestions: ["Tell Elena where she is.", "Explain each action aloud."],
    }),
  ),
}));

const roster = JSON.stringify({
  version: 1,
  entries: [
    { email: "learner@example.edu", institutionKey: "umb", roles: ["learner"] },
    { email: "peer@example.edu", institutionKey: "umb", roles: ["learner"] },
    { email: "faculty@example.edu", institutionKey: "umb", roles: ["faculty"] },
    { email: "outside-faculty@example.edu", institutionKey: "umb", roles: ["faculty"] },
    { email: "admin@example.edu", institutionKey: "umb", roles: ["institutionalAdmin"] },
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
  const asOutsideFaculty = await admit("user_outside", "outside-faculty@example.edu");
  const asAdmin = await admit("user_admin", "admin@example.edu");
  // Enrolls every current Learner and Faculty Membership in "PACU Pilot".
  await t.mutation(internal.attemptStart.pilotProvisioning.provision, {});
  const [scenario] = await asLearner.query(api.attemptStart.access.availableScenarios, {});
  const scenarioId = scenario.scenarioId as Id<"scenarios">;

  const ids = await t.run(async (ctx) => {
    const memberships = await ctx.db.query("memberships").collect();
    const byEmail = (email: string) => memberships.find((m) => m.rosterEmail === email)!;
    const [group] = await ctx.db.query("learningGroups").collect();
    // The outside Faculty member shares no Learning Group with the Learner.
    const outside = await ctx.db
      .query("learningGroupMembers")
      .withIndex("by_group_membership", (q) =>
        q.eq("learningGroupId", group._id).eq("membershipId", byEmail("outside-faculty@example.edu")._id),
      )
      .unique();
    await ctx.db.delete(outside!._id);
    return {
      institutionId: group.institutionId,
      groupId: group._id,
      learnerId: byEmail("learner@example.edu")._id,
      facultyId: byEmail("faculty@example.edu")._id,
    };
  });

  const runScheduled = async () => {
    vi.advanceTimersByTime(1);
    await t.finishInProgressScheduledFunctions();
  };
  const endedAttempt = async () => {
    const started = await asLearner.mutation(api.attemptStart.access.start, { scenarioId });
    const attemptId = (started as { attemptId: Id<"attempts"> }).attemptId;
    await asLearner.mutation(api.attemptInteraction.access.send, {
      attemptId,
      clientRequestId: "message-1",
      text: "Hi Elena, I'm your nurse.",
    });
    await runScheduled();
    await asLearner.mutation(api.attemptInteraction.access.takeAction, {
      attemptId,
      clientRequestId: "action-1",
      actionKey: "hand_hygiene",
    });
    await asLearner.mutation(api.attemptEnding.access.end, { attemptId, confirmed: true });
    await runScheduled();
    return attemptId;
  };
  type Member = typeof asLearner;
  const list = (asMember: Member) =>
    asMember.query(api.attemptReview.access.reviewableAttempts, {});
  const detail = (asMember: Member, attemptId: string) =>
    asMember.query(api.attemptReview.access.reviewAttempt, { attemptId });

  return {
    t,
    asLearner,
    asPeer,
    asFaculty,
    asOutsideFaculty,
    asAdmin,
    scenarioId,
    ids,
    endedAttempt,
    list,
    detail,
  };
}

describe("Review an authorized Ended Attempt", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("lists an authorized Ended Attempt once with its evidence, reflections, and feedback", async () => {
    const { t, asLearner, asFaculty, scenarioId, ids, endedAttempt, list, detail } = await setup();
    // A second shared group that also makes the Scenario available.
    await t.run(async (ctx) => {
      const groupId = await ctx.db.insert("learningGroups", {
        institutionId: ids.institutionId,
        key: "second-group",
        name: "Second group",
      });
      for (const membershipId of [ids.learnerId, ids.facultyId]) {
        await ctx.db.insert("learningGroupMembers", {
          institutionId: ids.institutionId,
          learningGroupId: groupId,
          membershipId,
        });
      }
      await ctx.db.insert("scenarioAvailabilities", {
        institutionId: ids.institutionId,
        learningGroupId: groupId,
        scenarioId,
      });
    });
    const attemptId = await endedAttempt();
    await asLearner.mutation(api.attemptDebrief.access.reflect, {
      attemptId,
      clientRequestId: "reflection-1",
      prompt: "interpretation",
      response: "answer",
      text: "Her breathing was slow.",
    });

    expect(await list(asFaculty)).toEqual([
      expect.objectContaining({
        id: attemptId,
        learnerEmail: "learner@example.edu",
        scenarioTitle: "Initial PACU Assessment",
        endReason: "learner_ended",
        debrief: "reflecting",
      }),
    ]);
    const review = await detail(asFaculty, attemptId);
    expect(review).toMatchObject({
      learnerEmail: "learner@example.edu",
      attempt: { id: attemptId, endReason: "learner_ended" },
      debrief: {
        status: "recorded",
        prompts: [
          { key: "interpretation", responses: [{ response: "answer", text: "Her breathing was slow." }] },
          { key: "planning", responses: [] },
        ],
        // Review is not gated by the Learner's reveal.
        feedback: { status: "completed", sections: { suggestions: expect.any(Array) } },
      },
    });
    expect(review!.attempt.timeline.map(({ kind }) => kind)).toEqual([
      "attempt_started",
      "learner_message",
      "patient_message",
      "clinical_action",
      "attempt_ended",
    ]);
    // Hidden Clinical Truth never reaches review.
    expect(JSON.stringify(review)).not.toMatch(/clinicalTruth|progression|ifPerformed/);
  });

  it("revokes Faculty review as soon as the shared group or Scenario availability is removed", async () => {
    const { t, asFaculty, asAdmin, ids, endedAttempt, list, detail } = await setup();
    const attemptId = await endedAttempt();
    expect(await list(asFaculty)).toHaveLength(1);

    const learnerInGroup = await t.run(async (ctx) => {
      const row = await ctx.db
        .query("learningGroupMembers")
        .withIndex("by_group_membership", (q) =>
          q.eq("learningGroupId", ids.groupId).eq("membershipId", ids.learnerId),
        )
        .unique();
      await ctx.db.delete(row!._id);
      return row!;
    });
    expect(await list(asFaculty)).toEqual([]);
    expect(await detail(asFaculty, attemptId)).toBeNull();

    // Restoring membership restores review; removing availability revokes it.
    await t.run(async (ctx) => {
      const { _id, _creationTime, ...row } = learnerInGroup;
      void _id;
      void _creationTime;
      await ctx.db.insert("learningGroupMembers", row);
    });
    expect(await detail(asFaculty, attemptId)).not.toBeNull();
    await t.run(async (ctx) => {
      for (const availability of await ctx.db.query("scenarioAvailabilities").collect()) {
        await ctx.db.delete(availability._id);
      }
    });
    expect(await list(asFaculty)).toEqual([]);
    expect(await detail(asFaculty, attemptId)).toBeNull();
    // Institutional Admin scope does not depend on either.
    expect(await detail(asAdmin, attemptId)).not.toBeNull();
  });

  it("reveals nothing for Active, cross-institution, or malformed identifiers", async () => {
    const { t, asPeer, asFaculty, asAdmin, scenarioId, ids, endedAttempt, list, detail } =
      await setup();
    await endedAttempt();
    const activeStart = await asPeer.mutation(api.attemptStart.access.start, { scenarioId });
    const activeId = (activeStart as { attemptId: Id<"attempts"> }).attemptId;
    const foreignId = await t.run(async (ctx) => {
      const own = (await ctx.db.query("attempts").first())!;
      const institutionId = await ctx.db.insert("pilotInstitutions", { key: "other", name: "Other" });
      const membershipId = await ctx.db.insert("memberships", {
        workosUserId: "user_foreign",
        rosterEmail: "foreign@example.edu",
        institutionId,
        roles: ["learner"],
        createdAt: Date.now(),
      });
      // A stray cross-institution row in the pilot group must not grant access.
      await ctx.db.insert("learningGroupMembers", {
        institutionId,
        learningGroupId: ids.groupId,
        membershipId,
      });
      return await ctx.db.insert("attempts", {
        institutionId,
        learnerMembershipId: membershipId,
        scenarioId: own.scenarioId,
        scenarioVersionId: own.scenarioVersionId,
        status: "ended",
        startedAt: Date.now(),
        endedAt: Date.now(),
        endReason: "learner_ended",
      });
    });

    for (const asReviewer of [asFaculty, asAdmin]) {
      const listed = (await list(asReviewer)).map(({ id }) => id);
      expect(listed).not.toContain(activeId);
      expect(listed).not.toContain(foreignId);
      for (const id of [activeId, foreignId, "not-an-attempt-id", scenarioId]) {
        expect(await detail(asReviewer, id)).toBeNull();
      }
    }
  });

  it("gives Institutional Admin institution-wide review without Learning Group membership", async () => {
    const { t, asAdmin, ids, endedAttempt, list, detail } = await setup();
    const attemptId = await endedAttempt();
    await t.run(async (ctx) => {
      for (const row of await ctx.db
        .query("learningGroupMembers")
        .withIndex("by_group_membership", (q) => q.eq("learningGroupId", ids.groupId))
        .collect()) {
        await ctx.db.delete(row._id);
      }
    });

    expect(await list(asAdmin)).toEqual([expect.objectContaining({ id: attemptId })]);
    expect(await detail(asAdmin, attemptId)).toMatchObject({
      attempt: { id: attemptId },
      debrief: { status: "recorded" },
    });
  });

  it("denies review to Learners and to Faculty without a shared Learning Group", async () => {
    const { asLearner, asOutsideFaculty, endedAttempt, list, detail } = await setup();
    const attemptId = await endedAttempt();

    await expect(list(asLearner)).rejects.toThrow("Faculty or Institutional Admin role required");
    await expect(detail(asLearner, attemptId)).rejects.toThrow(
      "Faculty or Institutional Admin role required",
    );
    expect(await list(asOutsideFaculty)).toEqual([]);
    expect(await detail(asOutsideFaculty, attemptId)).toBeNull();
  });
});
