import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../_generated/server";
import { ensurePilotInstitution } from "../membershipAccess/model";
import { initialPacuAssessment } from "./scenarioContent";

const pilotLearningGroup = { key: "pacu-pilot", name: "PACU Pilot" };

/**
 * Operator command for the alpha, which has no authoring or group
 * administration UI. It idempotently publishes Initial PACU Assessment, makes
 * it available to the pilot Learning Group, and enrolls every current Learner
 * and Faculty Membership. Rerun after admitting new Members.
 *
 *   npx convex run attemptStart/pilotProvisioning:provision
 */
export const provision = internalMutation({
  args: {},
  returns: v.object({
    scenarioVersion: v.number(),
    enrolledMemberships: v.number(),
    learningGroupSize: v.number(),
  }),
  handler: async (ctx) => {
    const institution = await ensurePilotInstitution(ctx, "umb");
    const { scenarioId, version } = await ensurePublishedScenario(
      ctx,
      institution._id,
    );
    const learningGroupId = await ensureLearningGroup(ctx, institution._id);

    const existingAvailability = await ctx.db
      .query("scenarioAvailabilities")
      .withIndex("by_group_scenario", (query) =>
        query.eq("learningGroupId", learningGroupId).eq("scenarioId", scenarioId),
      )
      .first();
    if (!existingAvailability) {
      await ctx.db.insert("scenarioAvailabilities", {
        institutionId: institution._id,
        learningGroupId,
        scenarioId,
      });
    }

    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_institution_id", (query) =>
        query.eq("institutionId", institution._id),
      )
      .collect();
    let enrolledMemberships = 0;
    let learningGroupSize = 0;
    for (const membership of memberships) {
      if (
        !membership.roles.includes("learner") &&
        !membership.roles.includes("faculty")
      ) {
        continue;
      }
      learningGroupSize += 1;
      const existingMember = await ctx.db
        .query("learningGroupMembers")
        .withIndex("by_group_membership", (query) =>
          query
            .eq("learningGroupId", learningGroupId)
            .eq("membershipId", membership._id),
        )
        .first();
      if (!existingMember) {
        await ctx.db.insert("learningGroupMembers", {
          institutionId: institution._id,
          learningGroupId,
          membershipId: membership._id,
        });
        enrolledMemberships += 1;
      }
    }

    return { scenarioVersion: version, enrolledMemberships, learningGroupSize };
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

  if (existing?.currentVersionId) {
    const current = await ctx.db.get(existing.currentVersionId);
    if (current) {
      return { scenarioId, version: current.version };
    }
  }

  const versionId = await ctx.db.insert("scenarioVersions", {
    institutionId,
    scenarioId,
    version: 1,
    title: initialPacuAssessment.title,
    learnerBrief: initialPacuAssessment.learnerBrief,
    clinicalTruth: initialPacuAssessment.clinicalTruth,
    createdAt: Date.now(),
  });
  await ctx.db.patch(scenarioId, { currentVersionId: versionId });
  return { scenarioId, version: 1 };
}

async function ensureLearningGroup(
  ctx: MutationCtx,
  institutionId: Id<"pilotInstitutions">,
) {
  const existing = await ctx.db
    .query("learningGroups")
    .withIndex("by_institution_key", (query) =>
      query.eq("institutionId", institutionId).eq("key", pilotLearningGroup.key),
    )
    .unique();
  return (
    existing?._id ??
    (await ctx.db.insert("learningGroups", {
      institutionId,
      ...pilotLearningGroup,
    }))
  );
}
