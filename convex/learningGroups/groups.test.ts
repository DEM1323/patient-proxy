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

// Synthetic identities only.
const environmentRoster = JSON.stringify({
  version: 1,
  entries: [
    { email: "admin@example.edu", institutionKey: "umb", roles: ["institutionalAdmin"] },
    { email: "faculty@example.edu", institutionKey: "umb", roles: ["faculty"] },
    { email: "other-faculty@example.edu", institutionKey: "umb", roles: ["faculty"] },
    { email: "learner@example.edu", institutionKey: "umb", roles: ["learner"] },
  ],
});

async function setup() {
  vi.stubEnv("PILOT_ROSTER_JSON", environmentRoster);
  const t = convexTest(schema, modules);
  const admit = async (subject: string, email: string) => {
    const result = await t.run((ctx) =>
      admitWorkosUser(ctx, {
        workosUserId: subject,
        email,
        emailVerified: true,
        rawRoster: process.env.PILOT_ROSTER_JSON,
      }),
    );
    return (result as { membership: { id: Id<"memberships"> } }).membership.id;
  };
  const ids = {
    admin: await admit("user_admin", "admin@example.edu"),
    faculty: await admit("user_faculty", "faculty@example.edu"),
    otherFaculty: await admit("user_other", "other-faculty@example.edu"),
    learner: await admit("user_learner", "learner@example.edu"),
  };
  // Publishes PACU and bootstraps "PACU Pilot" with the Learner and Faculty.
  await t.mutation(internal.attemptStart.pilotProvisioning.provision, {});
  const asAdmin = t.withIdentity({ subject: "user_admin" });
  const asFaculty = t.withIdentity({ subject: "user_faculty" });
  const asOther = t.withIdentity({ subject: "user_other" });
  const asLearner = t.withIdentity({ subject: "user_learner" });
  type Caller = typeof asAdmin;

  const view = (as: Caller = asAdmin) =>
    as.query(api.learningGroups.access.learningGroups, {});
  const pilot = async () => (await view()).groups.find(({ name }) => name === "PACU Pilot")!;
  const scenarioId = async () => (await view()).scenarios[0].id;
  const createGroup = async (name: string) =>
    (
      (await asAdmin.mutation(api.learningGroups.access.createGroup, { name })) as {
        learningGroupId: Id<"learningGroups">;
      }
    ).learningGroupId;
  const enroll = (learningGroupId: string, membershipId: string, enrolled = true) =>
    asAdmin.mutation(api.learningGroups.access.setMembership, {
      learningGroupId,
      membershipId,
      enrolled,
    });
  const setAvailability = async (
    learningGroupId: string,
    available: boolean,
    as: Caller = asAdmin,
  ) =>
    as.mutation(api.learningGroups.access.setAvailability, {
      learningGroupId,
      scenarioId: await scenarioId(),
      available,
    });
  const endedAttempt = async () => {
    const started = await asLearner.mutation(api.attemptStart.access.start, {
      scenarioId: await scenarioId(),
    });
    const attemptId = (started as { attemptId: Id<"attempts"> }).attemptId;
    await asLearner.mutation(api.attemptInteraction.access.send, {
      attemptId,
      clientRequestId: "message-1",
      text: "Hello, Elena.",
    });
    await asLearner.mutation(api.attemptInteraction.access.takeAction, {
      attemptId,
      clientRequestId: "action-1",
      actionKey: "hand_hygiene",
    });
    await asLearner.mutation(api.attemptEnding.access.end, { attemptId, confirmed: true });
    return attemptId;
  };
  const facultyReview = async (as: Caller = asFaculty) =>
    (await as.query(api.attemptReview.access.reviewableAttempts, {})).map(({ id }) => id);
  const audits = (action: string) =>
    t.run(async (ctx) =>
      (await ctx.db.query("auditEvents").collect()).filter((event) => event.action === action),
    );
  return {
    t,
    ids,
    asAdmin,
    asFaculty,
    asOther,
    asLearner,
    view,
    pilot,
    scenarioId,
    createGroup,
    enroll,
    setAvailability,
    endedAttempt,
    facultyReview,
    audits,
  };
}

describe("Manage learning and review scope", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("bootstraps participation once, so rerunning provisioning never restores removed scope", async () => {
    const { t, ids, pilot, enroll, setAvailability } = await setup();
    const group = await pilot();
    expect(group.members.map(({ id }) => id).sort()).toEqual(
      [ids.faculty, ids.otherFaculty, ids.learner].sort(),
    );

    await enroll(group.id, ids.learner, false);
    await setAvailability(group.id, false);
    expect(await t.mutation(internal.attemptStart.pilotProvisioning.provision, {})).toEqual({
      scenarioVersion: 1,
      participation: "already_managed",
      enrolledMemberships: 0,
    });
    const after = await pilot();
    expect(after.members.map(({ id }) => id)).not.toContain(ids.learner);
    expect(after.availableScenarioIds).toEqual([]);
  });

  it("drives Learner starts and Faculty review scope entirely from group and availability changes", async () => {
    const { ids, asLearner, asAdmin, pilot, createGroup, enroll, setAvailability, endedAttempt, facultyReview, scenarioId, audits } =
      await setup();
    const attemptId = await endedAttempt();
    const pacu = (await pilot()).id;
    // Move everyone out of the bootstrap group into a group built in-product.
    for (const id of [ids.learner, ids.faculty, ids.otherFaculty]) {
      await enroll(pacu, id, false);
    }
    expect(await facultyReview()).toEqual([]);
    expect(await asLearner.query(api.attemptStart.access.availableScenarios, {})).toEqual([]);

    const cohort = await createGroup("Spring Cohort");
    expect(await enroll(cohort, ids.learner)).toEqual({ status: "updated" });
    expect(await enroll(cohort, ids.learner)).toEqual({ status: "unchanged" });
    await enroll(cohort, ids.faculty);
    // Shared membership alone grants nothing until the Scenario is available.
    expect(await facultyReview()).toEqual([]);
    expect(await setAvailability(cohort, true)).toEqual({ status: "updated" });
    expect(await facultyReview()).toEqual([attemptId]);
    expect(
      (await asLearner.query(api.attemptStart.access.availableScenarios, {})).map(
        ({ scenarioId: id }) => id,
      ),
    ).toEqual([await scenarioId()]);

    // Removing the Learner from the group revokes Faculty review immediately.
    await enroll(cohort, ids.learner, false);
    expect(await facultyReview()).toEqual([]);
    expect(
      await asAdmin.query(api.attemptReview.access.reviewableAttempts, {}),
    ).toEqual([expect.objectContaining({ id: attemptId })]);
    expect(await audits("learning_group_created")).toHaveLength(1);
    expect((await audits("group_member_removed")).length).toBeGreaterThan(0);
    expect(await audits("scenario_made_available")).toHaveLength(1);
  });

  it("lists an Attempt once across granting groups and revokes it only when no group grants it", async () => {
    const { ids, pilot, createGroup, enroll, setAvailability, endedAttempt, facultyReview } =
      await setup();
    const attemptId = await endedAttempt();
    const pacu = (await pilot()).id;
    const second = await createGroup("Second Cohort");
    await enroll(second, ids.learner);
    await enroll(second, ids.faculty);
    await setAvailability(second, true);

    expect(await facultyReview()).toEqual([attemptId]);
    await setAvailability(pacu, false);
    expect(await facultyReview()).toEqual([attemptId]);
    await setAvailability(second, false);
    expect(await facultyReview()).toEqual([]);
  });

  it("lets Faculty change availability only for groups they belong to, and nothing else", async () => {
    const { ids, asFaculty, asOther, asLearner, view, pilot, createGroup, enroll, setAvailability } =
      await setup();
    const pacu = (await pilot()).id;
    const elsewhere = await createGroup("Elsewhere");
    await enroll(elsewhere, ids.otherFaculty);
    await enroll(pacu, ids.otherFaculty, false);

    expect(await setAvailability(pacu, false, asFaculty)).toEqual({ status: "updated" });
    expect(await setAvailability(pacu, true, asFaculty)).toEqual({ status: "updated" });
    // Not a member of that group: same answer as a foreign group.
    expect(await setAvailability(pacu, false, asOther)).toEqual({ status: "not_found" });
    expect((await pilot()).availableScenarioIds).toHaveLength(1);

    // Faculty see only their own groups and cannot manage enrollment.
    const facultyView = await view(asFaculty);
    expect(facultyView.canManageGroups).toBe(false);
    expect(facultyView.groups.map(({ name }) => name)).toEqual(["PACU Pilot"]);
    expect(facultyView.institutionMembers).toEqual([]);
    await expect(
      asFaculty.mutation(api.learningGroups.access.setMembership, {
        learningGroupId: pacu,
        membershipId: ids.learner,
        enrolled: false,
      }),
    ).rejects.toThrow("Institutional Admin role required");
    await expect(
      asFaculty.mutation(api.learningGroups.access.createGroup, { name: "Mine" }),
    ).rejects.toThrow("Institutional Admin role required");
    await expect(view(asLearner)).rejects.toThrow("Faculty or Institutional Admin role required");
    await expect(setAvailability(pacu, false, asLearner)).rejects.toThrow(
      "Faculty or Institutional Admin role required",
    );
  });

  it("keeps an Active Attempt running when its availability or group membership is removed", async () => {
    const { ids, asLearner, pilot, enroll, setAvailability, scenarioId } = await setup();
    const started = await asLearner.mutation(api.attemptStart.access.start, {
      scenarioId: await scenarioId(),
    });
    const attemptId = (started as { attemptId: Id<"attempts"> }).attemptId;
    const pacu = (await pilot()).id;
    await setAvailability(pacu, false);
    await enroll(pacu, ids.learner, false);

    expect(
      await asLearner.query(api.attemptStart.access.ownAttempt, { attemptId }),
    ).toMatchObject({ status: "active" });
    expect(
      await asLearner.mutation(api.attemptInteraction.access.takeAction, {
        attemptId,
        clientRequestId: "action-1",
        actionKey: "hand_hygiene",
      }),
    ).toEqual({ status: "recorded" });
    // Future starts are blocked.
    expect(
      await asLearner.query(api.attemptStart.access.learnerBrief, {
        scenarioId: await scenarioId(),
      }),
    ).toEqual({ status: "unavailable" });
  });

  it("validates names and keeps every id inside the caller's institution", async () => {
    const { t, ids, asAdmin, pilot, createGroup, enroll, scenarioId, view } = await setup();
    expect(await asAdmin.mutation(api.learningGroups.access.createGroup, { name: "  " })).toEqual({
      status: "invalid_name",
    });
    await createGroup("Spring Cohort");
    expect(
      await asAdmin.mutation(api.learningGroups.access.createGroup, { name: "spring  cohort" }),
    ).toEqual({ status: "duplicate_name" });

    const foreign = await t.run(async (ctx) => {
      const institutionId = await ctx.db.insert("pilotInstitutions", { key: "other", name: "Other" });
      const groupId = await ctx.db.insert("learningGroups", {
        institutionId,
        key: "foreign",
        name: "Foreign Group",
      });
      const membershipId = await ctx.db.insert("memberships", {
        workosUserId: "user_foreign",
        rosterEmail: "foreign@example.org",
        institutionId,
        roles: ["learner"],
        createdAt: Date.now(),
      });
      return { groupId, membershipId };
    });
    const pacu = (await pilot()).id;
    expect(await enroll(foreign.groupId, ids.learner)).toEqual({ status: "not_found" });
    expect(await enroll(pacu, foreign.membershipId)).toEqual({ status: "not_found" });
    expect(await enroll("not-a-group", ids.learner)).toEqual({ status: "not_found" });
    expect(
      await asAdmin.mutation(api.learningGroups.access.setAvailability, {
        learningGroupId: foreign.groupId,
        scenarioId: await scenarioId(),
        available: true,
      }),
    ).toEqual({ status: "not_found" });
    const names = (await view()).groups.map(({ name }) => name);
    expect(names).not.toContain("Foreign Group");
    expect((await view()).institutionMembers.map(({ email }) => email)).not.toContain(
      "foreign@example.org",
    );
  });

  it("refuses deactivated callers despite a valid session", async () => {
    const { ids, asAdmin, asFaculty, view, pilot, createGroup, enroll, setAvailability } =
      await setup();
    const pacu = (await pilot()).id;
    await asAdmin.mutation(api.institutionAdmin.access.deactivate, { membershipId: ids.faculty });

    await expect(setAvailability(pacu, false, asFaculty)).rejects.toThrow(
      "Pilot Membership is deactivated",
    );
    await expect(
      asFaculty.query(api.learningGroups.access.learningGroups, {}),
    ).rejects.toThrow("Pilot Membership is deactivated");
    // A deactivated Member keeps their group association.
    expect((await pilot()).members.map(({ id }) => id)).toContain(ids.faculty);

    // They are not offered for, and cannot be added to, another group.
    const cohort = await createGroup("Second cohort");
    expect((await view()).institutionMembers.map(({ id }) => id)).not.toContain(ids.faculty);
    expect(await enroll(cohort, ids.faculty)).toEqual({ status: "inactive" });
    await asAdmin.mutation(api.institutionAdmin.access.reactivate, { membershipId: ids.faculty });
    expect(
      (await view()).groups.find(({ id }) => id === cohort)!.members.map(({ id }) => id),
    ).not.toContain(ids.faculty);
    expect((await view()).institutionMembers.map(({ id }) => id)).toContain(ids.faculty);

    // Removal still works for a deactivated Member.
    await asAdmin.mutation(api.institutionAdmin.access.deactivate, { membershipId: ids.faculty });
    expect(await enroll((await pilot()).id, ids.faculty, false)).toEqual({ status: "updated" });
    expect((await pilot()).members.map(({ id }) => id)).not.toContain(ids.faculty);
  });
});
