import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../_generated/server";
import { ensurePilotInstitution } from "../membershipAccess/model";
import { initialPacuAssessment } from "./scenarioContent";

const pilotLearningGroup = { key: "pacu-pilot", name: "PACU Pilot" };

/**
 * Operator command for the alpha, which has no authoring UI:
 *
 *   npx convex run attemptStart/pilotProvisioning:provision
 *
 * Content is idempotent on every run: it publishes Initial PACU Assessment (a
 * new Scenario Version whenever the authored content has changed).
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
) {
  const existing = await ctx.db
    .query("scenarios")
    .withIndex("by_institution_key", (query) =>
      query.eq("institutionId", institutionId).eq("key", initialPacuAssessment.key),
    )
    .unique();
  const scenarioId =
    existing?._id ??
    (await ctx.db.insert("scenarios", {
      institutionId,
      key: initialPacuAssessment.key,
      title: initialPacuAssessment.title,
      status: "published",
    }));

  const current = existing?.currentVersionId
    ? await ctx.db.get(existing.currentVersionId)
    : null;
  if (current && sameAuthoredContent(current)) {
    return { scenarioId, version: current.version };
  }

  // Changed authored content becomes a new version; Attempts stay pinned to
  // the version they started with.
  const version = (current?.version ?? 0) + 1;
  const versionId = await ctx.db.insert("scenarioVersions", {
    institutionId,
    scenarioId,
    version,
    title: initialPacuAssessment.title,
    learnerBrief: initialPacuAssessment.learnerBrief,
    clinicalTruth: initialPacuAssessment.clinicalTruth,
    createdAt: Date.now(),
  });
  await ctx.db.patch(scenarioId, { currentVersionId: versionId });
  return { scenarioId, version };
}

function sameAuthoredContent(version: Doc<"scenarioVersions">) {
  const authored = {
    title: initialPacuAssessment.title,
    learnerBrief: initialPacuAssessment.learnerBrief,
    clinicalTruth: initialPacuAssessment.clinicalTruth,
  };
  const { title, learnerBrief, clinicalTruth } = version;
  return (
    canonicalJson({ title, learnerBrief, clinicalTruth }) ===
    canonicalJson(authored)
  );
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
