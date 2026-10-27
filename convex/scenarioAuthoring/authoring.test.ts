import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { PatientPrompt } from "../attemptInteraction/patientPrompt";
import { pacuDebriefTemplate } from "../attemptStart/debriefTemplates";
import type { DebriefContent } from "../attemptStart/scenarioContent";
import { admitWorkosUser } from "../membershipAccess/model";
import schema from "../schema";
import { modules } from "../test.setup";

// Unit tests never call live Gemini.
const completer = vi.hoisted(() => ({
  completePatientReply: vi.fn(async () => "Mm... okay."),
  completeFeedback: vi.fn<(prompt: PatientPrompt) => Promise<string>>(),
}));
vi.mock("../attemptInteraction/gemini", () => completer);

const roster = JSON.stringify({
  version: 1,
  entries: [
    { email: "author@example.edu", institutionKey: "umb", roles: ["author"] },
    { email: "learner@example.edu", institutionKey: "umb", roles: ["learner"] },
    { email: "admin@example.edu", institutionKey: "umb", roles: ["institutionalAdmin", "faculty"] },
  ],
});

// TEST FIXTURE ONLY: not Author-approved content.
const fixture: DebriefContent = {
  communicationCriteria: [
    { key: "fixture_c1", label: "Fixture criterion", description: "Fixture description." },
  ],
  reflectionPrompts: {
    interpretation: "Fixture interpretation?",
    planning: "Fixture planning?",
  },
};

async function setup() {
  const t = convexTest(schema, modules);
  const admit = async (subject: string, email: string) => {
    await t.run((ctx) =>
      admitWorkosUser(ctx, { workosUserId: subject, email, emailVerified: true, rawRoster: roster }),
    );
    return t.withIdentity({ subject });
  };
  const asAuthor = await admit("user_author", "author@example.edu");
  const asLearner = await admit("user_learner", "learner@example.edu");
  const asAdmin = await admit("user_admin", "admin@example.edu");
  await t.mutation(internal.attemptStart.pilotProvisioning.provision, {});
  const [{ id: scenarioId }] = await asAuthor.query(api.scenarioAuthoring.access.scenarios, {});
  const publish = (debrief: DebriefContent, adoptTemplate = false, as = asAuthor) =>
    as.mutation(api.scenarioAuthoring.access.publish, {
      scenarioId,
      debrief,
      adoptTemplate,
    });
  const detail = () =>
    asAuthor.query(api.scenarioAuthoring.access.scenarioDebrief, { scenarioId });
  const versions = () => t.run((ctx) => ctx.db.query("scenarioVersions").collect());
  const startAttempt = async () => {
    const started = await asLearner.mutation(api.attemptStart.access.start, {
      scenarioId,
      clientRequestId: crypto.randomUUID(),
    });
    return (started as { attemptId: Id<"attempts"> }).attemptId;
  };
  return { t, asAuthor, asLearner, asAdmin, scenarioId, publish, detail, versions, startAttempt };
}

describe("Author debrief content", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("offers the labeled generated template without publishing anything", async () => {
    const { detail, versions } = await setup();
    expect(await detail()).toMatchObject({
      title: "Initial PACU Assessment",
      version: 1,
      debrief: null,
      source: "none",
      publication: null,
      template: {
        notice: expect.stringContaining("Generated draft, edit before use"),
        content: pacuDebriefTemplate.content,
      },
    });
    expect(JSON.stringify(await detail())).not.toContain("learningObjectives");
    expect(await versions()).toHaveLength(1);
  });

  it("publishes Author content as a new pinned version and records who published it", async () => {
    const { t, publish, detail, versions, startAttempt } = await setup();
    const pinnedAttempt = await startAttempt();

    expect(await publish(fixture)).toEqual({ status: "published", version: 2 });
    const [v1, v2] = await versions();
    expect(v1.debrief).toBeUndefined();
    expect(v2).toMatchObject({
      debrief: fixture,
      learnerBrief: v1.learnerBrief,
      clinicalTruth: v1.clinicalTruth,
      debriefPublication: { source: "author", publishedAt: expect.any(Number) },
    });
    expect(await detail()).toMatchObject({
      version: 2,
      source: "author",
      publication: { publishedBy: "author@example.edu" },
    });
    // The same content again publishes nothing.
    expect(await publish(fixture)).toEqual({ status: "unchanged", version: 2 });

    const pinned = await t.run(async (ctx) => (await ctx.db.get(pinnedAttempt))!.scenarioVersionId);
    expect(pinned).toBe(v1._id);
  });

  it("requires an explicit, recorded adoption to publish the generated template unchanged", async () => {
    const { publish, detail, versions } = await setup();
    const template = structuredClone(pacuDebriefTemplate.content);
    expect(await publish(template)).toEqual({ status: "template_not_adopted" });
    expect(await versions()).toHaveLength(1);

    expect(await publish(template, true)).toEqual({ status: "published", version: 2 });
    expect((await versions())[1].debriefPublication).toMatchObject({
      source: "adopted_template",
    });
    expect(await detail()).toMatchObject({
      source: "adopted_template",
      publication: { publishedBy: "author@example.edu" },
    });

    // Once edited, it is the Author's own wording.
    template.feedbackGuidance = "Fixture: an Author's edited guidance.";
    expect(await publish(template)).toEqual({ status: "published", version: 3 });
    expect((await versions())[2].debriefPublication?.source).toBe("author");
  });

  it("rejects blank, duplicated, or single-prompt content and trims what it keeps", async () => {
    const { publish, versions } = await setup();
    const invalid: DebriefContent[] = [
      { communicationCriteria: [{ key: "fixture_a", label: " ", description: "Fixture." }] },
      {
        communicationCriteria: [
          { key: "fixture_a", label: "One", description: "Fixture." },
          { key: "fixture_a", label: "Two", description: "Fixture." },
        ],
      },
      { communicationCriteria: [{ key: "Not A Key", label: "One", description: "Fixture." }] },
      { reflectionPrompts: { interpretation: "Fixture?", planning: "  " } },
    ];
    for (const debrief of invalid) {
      expect(await publish(debrief)).toEqual({ status: "invalid" });
    }
    expect(await versions()).toHaveLength(1);

    expect(
      await publish({ feedbackGuidance: "  Fixture guidance.  ", communicationCriteria: [] }),
    ).toEqual({ status: "published", version: 2 });
    expect((await versions())[1].debrief).toEqual({ feedbackGuidance: "Fixture guidance." });
  });

  it("is Author-only and institution-scoped", async () => {
    const { t, asLearner, asAdmin, scenarioId, publish, versions } = await setup();
    for (const as of [asLearner, asAdmin]) {
      await expect(as.query(api.scenarioAuthoring.access.scenarios, {})).rejects.toThrow(
        "Author role required",
      );
      await expect(publish(fixture, false, as)).rejects.toThrow("Author role required");
    }
    const asAuthor = t.withIdentity({ subject: "user_author" });
    const foreignId = await t.run(async (ctx) => {
      const scenario = (await ctx.db.get(scenarioId))!;
      const institutionId = await ctx.db.insert("pilotInstitutions", {
        key: "other-institution",
        name: "Other Pilot Institution",
      });
      return await ctx.db.insert("scenarios", {
        institutionId,
        key: scenario.key,
        title: "Foreign Scenario",
        status: "published",
        currentVersionId: scenario.currentVersionId,
      });
    });
    for (const id of [foreignId, "not-a-scenario-id"]) {
      expect(
        await asAuthor.query(api.scenarioAuthoring.access.scenarioDebrief, { scenarioId: id }),
      ).toBeNull();
      expect(
        await asAuthor.mutation(api.scenarioAuthoring.access.publish, {
          scenarioId: id,
          debrief: fixture,
          adoptTemplate: false,
        }),
      ).toEqual({ status: "not_found" });
    }
    expect(await asAuthor.query(api.scenarioAuthoring.access.scenarios, {})).toHaveLength(1);
    expect(await versions()).toHaveLength(1);

    // A deactivated Author can do nothing.
    await t.run(async (ctx) => {
      const author = (await ctx.db.query("memberships").collect()).find(
        ({ rosterEmail }) => rosterEmail === "author@example.edu",
      )!;
      await ctx.db.patch(author._id, { status: "inactive" });
    });
    await expect(publish(fixture)).rejects.toThrow("deactivated");
  });

  it("keeps Author-published content when provisioning reruns", async () => {
    const { t, publish, versions } = await setup();
    await publish(fixture);
    expect(
      await t.mutation(internal.attemptStart.pilotProvisioning.provision, {}),
    ).toMatchObject({ scenarioVersion: 2 });
    expect(await versions()).toHaveLength(2);
  });

  it("feeds Author criteria and prompts into a new Attempt's debrief", async () => {
    const { t, asLearner, publish, startAttempt } = await setup();
    await publish(fixture);
    const attemptId = await startAttempt();
    await asLearner.mutation(api.attemptInteraction.access.send, {
      attemptId,
      clientRequestId: "message-1",
      text: "Hi Elena, I'm your nurse.",
    });
    vi.advanceTimersByTime(1);
    await t.finishInProgressScheduledFunctions();
    await asLearner.mutation(api.attemptInteraction.access.takeAction, {
      attemptId,
      clientRequestId: "action-1",
      actionKey: "vital_signs",
    });
    completer.completeFeedback.mockResolvedValue(
      JSON.stringify({
        summary: [{ text: "You greeted Elena.", evidence: [2] }],
        strengths: [],
        priorities: [{ text: "Reassurance was not observed in this Attempt.", evidence: [], observed: false }],
        criteria: [{ key: "fixture_c1", rating: "demonstrated", rationale: "You introduced yourself.", evidence: [2] }],
        suggestions: ["Tell Elena where she is.", "Explain each action aloud."],
      }),
    );
    await asLearner.mutation(api.attemptEnding.access.end, { attemptId, confirmed: true });
    vi.advanceTimersByTime(1);
    await t.finishInProgressScheduledFunctions();
    for (const prompt of ["interpretation", "planning"] as const) {
      await asLearner.mutation(api.attemptDebrief.access.reflect, {
        attemptId,
        clientRequestId: prompt,
        prompt,
        response: "skip",
      });
    }
    expect(
      await asLearner.query(api.attemptDebrief.access.ownDebrief, { attemptId }),
    ).toMatchObject({
      status: "revealed",
      prompts: [{ text: "Fixture interpretation?" }, { text: "Fixture planning?" }],
      feedback: {
        status: "completed",
        sections: { criteria: [{ key: "fixture_c1", label: "Fixture criterion", evidence: [2] }] },
      },
    });
  });
});
