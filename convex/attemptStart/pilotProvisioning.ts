import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../_generated/server";
import { ensurePilotInstitution } from "../membershipAccess/model";
import {
  initialPacuAssessment,
  type DebriefContent,
  type ScenarioContent,
} from "./scenarioContent";

const pilotLearningGroup = { key: "pacu-pilot", name: "PACU Pilot" };

/**
 * Operator command for the alpha, which has no authoring UI:
 *
 *   npx convex run attemptStart/pilotProvisioning:provision
 *
 * Content is idempotent on every run: it publishes Initial PACU Assessment (a
 * new Scenario Version whenever the authored content, debrief content
 * included, has changed).
 *
 * Participation is bootstrapped only once, when the "PACU Pilot" Learning
 * Group does not exist yet: it creates the group, makes the Scenario available
 * to it, and enrolls the current Learner and Faculty Memberships. After that,
 * Learning Groups, enrollment, and availability are managed in Patient Proxy,
 * so a rerun never re-enrolls a removed Member or restores removed
 * availability.
 */
export const provision = internalMutation({
  args: {},
  returns: v.object({
    scenarioVersion: v.number(),
    participation: v.union(v.literal("bootstrapped"), v.literal("already_managed")),
    enrolledMemberships: v.number(),
  }),
  handler: async (ctx) => {
    const institution = await ensurePilotInstitution(ctx, "umb");
    const { scenarioId, version } = await ensurePublishedScenario(
      ctx,
      institution._id,
      initialPacuAssessment,
    );
    const existingGroup = await ctx.db
      .query("learningGroups")
      .withIndex("by_institution_key", (query) =>
        query.eq("institutionId", institution._id).eq("key", pilotLearningGroup.key),
      )
      .unique();
    if (existingGroup) {
      return {
        scenarioVersion: version,
        participation: "already_managed" as const,
        enrolledMemberships: 0,
      };
    }

    const learningGroupId = await ctx.db.insert("learningGroups", {
      institutionId: institution._id,
      ...pilotLearningGroup,
    });
    await ctx.db.insert("scenarioAvailabilities", {
      institutionId: institution._id,
      learningGroupId,
      scenarioId,
    });
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_institution_id", (query) =>
        query.eq("institutionId", institution._id),
      )
      .collect();
    let enrolledMemberships = 0;
    for (const membership of memberships) {
      if (
        membership.roles.includes("learner") ||
        membership.roles.includes("faculty")
      ) {
        await ctx.db.insert("learningGroupMembers", {
          institutionId: institution._id,
          learningGroupId,
          membershipId: membership._id,
        });
        enrolledMemberships += 1;
      }
    }
    return {
      scenarioVersion: version,
      participation: "bootstrapped" as const,
      enrolledMemberships,
    };
  },
});

async function ensurePublishedScenario(
  ctx: MutationCtx,
  institutionId: Id<"pilotInstitutions">,
  content: ScenarioContent,
) {
  if (content.debrief) {
    assertPublishableDebrief(content.debrief);
  }
  const existing = await ctx.db
    .query("scenarios")
    .withIndex("by_institution_key", (query) =>
      query.eq("institutionId", institutionId).eq("key", content.key),
    )
    .unique();
  const scenarioId =
    existing?._id ??
    (await ctx.db.insert("scenarios", {
      institutionId,
      key: content.key,
      title: content.title,
      status: "published",
    }));

  const current = existing?.currentVersionId
    ? await ctx.db.get(existing.currentVersionId)
    : null;
  if (current && canonicalJson(authored(current)) === canonicalJson(authored(content))) {
    return { scenarioId, version: current.version };
  }

  // Changed authored content becomes a new version; Attempts stay pinned to
  // the version they started with, debrief content included.
  const version = (current?.version ?? 0) + 1;
  const versionId = await ctx.db.insert("scenarioVersions", {
    institutionId,
    scenarioId,
    version,
    title: content.title,
    learnerBrief: content.learnerBrief,
    clinicalTruth: content.clinicalTruth,
    ...(content.debrief ? { debrief: content.debrief } : {}),
    createdAt: Date.now(),
  });
  await ctx.db.patch(scenarioId, { currentVersionId: versionId });
  return { scenarioId, version };
}

// The Author-controlled parts of a Scenario Version that decide whether a
// rerun publishes a new one. Versions published before debrief content
// existed compare equal to content that still has none.
function authored({
  title,
  learnerBrief,
  clinicalTruth,
  debrief,
}: Pick<ScenarioContent, "title" | "learnerBrief" | "clinicalTruth" | "debrief">) {
  return { title, learnerBrief, clinicalTruth, debrief: debrief ?? null };
}

// Feedback matches criteria by key and shows their labels, so a blank or
// duplicated entry would publish a version that can never be rated cleanly.
function assertPublishableDebrief(debrief: DebriefContent) {
  const blank = (value: string) => value.trim().length === 0;
  const criteria = debrief.communicationCriteria ?? [];
  const keys = new Set(criteria.map(({ key }) => key));
  if (
    keys.size !== criteria.length ||
    criteria.some(({ key, label, description }) =>
      [key, label, description].some(blank),
    ) ||
    (debrief.feedbackGuidance !== undefined && blank(debrief.feedbackGuidance)) ||
    (debrief.reflectionPrompts &&
      Object.values(debrief.reflectionPrompts).some(blank))
  ) {
    throw new Error("Debrief content has a blank or duplicated entry");
  }
}

// Stored documents need not preserve object key order.
function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`,
      )
      .join(",")}}`;
  }
  return JSON.stringify(value);
}
