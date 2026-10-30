import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { debriefContentValidator } from "../attemptStart/scenarioContent";
import { getScenarioDebrief, listAuthoringScenarios, publishDebrief } from "./model";

const sourceValidator = v.union(
  v.literal("none"),
  v.literal("provisioned"),
  v.literal("author"),
  v.literal("adopted_template"),
);

// Author role only, within the Author's Pilot Institution.
export const scenarios = query({
  args: {},
  returns: v.array(
    v.object({
      id: v.id("scenarios"),
      title: v.string(),
      version: v.number(),
      debrief: sourceValidator,
    }),
  ),
  handler: listAuthoringScenarios,
});

// Scenario identifiers arrive from routes as plain strings so that malformed
// and foreign identifiers receive the same null.
export const scenarioDebrief = query({
  args: { scenarioId: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      id: v.id("scenarios"),
      title: v.string(),
      patientName: v.string(),
      setting: v.string(),
      version: v.number(),
      debrief: v.union(v.null(), debriefContentValidator),
      source: sourceValidator,
      publication: v.union(
        v.null(),
        v.object({
          byYou: v.boolean(),
          publishedAt: v.number(),
        }),
      ),
      // The labeled generated template the Generate action fills in.
      template: v.union(
        v.null(),
        v.object({ notice: v.string(), content: debriefContentValidator }),
      ),
    }),
  ),
  handler: (ctx, { scenarioId }) => getScenarioDebrief(ctx, scenarioId),
});

export const publish = mutation({
  args: {
    scenarioId: v.string(),
    // The version the Author's form was based on.
    expectedVersion: v.number(),
    debrief: debriefContentValidator,
    adoptTemplate: v.boolean(),
  },
  returns: v.union(
    v.object({
      status: v.union(v.literal("published"), v.literal("unchanged")),
      version: v.number(),
    }),
    v.object({
      status: v.union(
        v.literal("not_found"),
        v.literal("stale_version"),
        v.literal("invalid"),
        v.literal("template_not_adopted"),
      ),
    }),
  ),
  handler: publishDebrief,
});
