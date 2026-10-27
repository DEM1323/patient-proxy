import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../_generated/server";
import { ensurePilotInstitution } from "../membershipAccess/model";
import {
  isGeneratedTemplate,
  isPublishableDebrief,
  publishScenarioVersion,
} from "./publishing";
import { initialPacuAssessment, type ScenarioContent } from "./scenarioContent";

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
  const scenario = (await ctx.db.get(scenarioId))!;
  const current = scenario.currentVersionId
    ? await ctx.db.get(scenario.currentVersionId)
    : null;

  // Once an Author publishes debrief content in Patient Proxy, it is managed
  // there: provisioning carries it forward instead of replacing it.
  if (current?.debriefPublication) {
    const { version } = await publishScenarioVersion(ctx, scenario, current, {
      ...content,
      debrief: current.debrief,
      debriefPublication: current.debriefPublication,
    });
    return { scenarioId, version };
  }
  if (content.debrief) {
    if (isGeneratedTemplate(content.debrief)) {
      throw new Error(
        "A generated debrief template must be edited or adopted by an Author before it is published",
      );
    }
    if (!isPublishableDebrief(content.debrief)) {
      throw new Error("Debrief content has a blank, duplicated, or oversized entry");
    }
  }
  const { version } = await publishScenarioVersion(ctx, scenario, current, {
    title: content.title,
    learnerBrief: content.learnerBrief,
    clinicalTruth: content.clinicalTruth,
    debrief: content.debrief,
  });
  return { scenarioId, version };
}
