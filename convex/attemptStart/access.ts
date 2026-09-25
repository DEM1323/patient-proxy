import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import {
  getLearnerBrief,
  getOwnAttempt,
  listAvailableScenarios,
  startAttempt,
} from "./model";
import {
  attemptEventKindValidator,
  openExchangeValidator,
} from "../attemptInteraction/validators";
import { learnerBriefValidator } from "./scenarioContent";

const estimatedMinutesValidator = v.object({ min: v.number(), max: v.number() });

export const availableScenarios = query({
  args: {},
  returns: v.array(
    v.object({
      scenarioId: v.id("scenarios"),
      title: v.string(),
      patientName: v.string(),
      setting: v.string(),
      estimatedMinutes: estimatedMinutesValidator,
    }),
  ),
  handler: listAvailableScenarios,
});

// Scenario and Attempt identifiers arrive from routes as plain strings so that
// malformed, foreign, and unavailable identifiers all receive the same answer.
export const learnerBrief = query({
  args: { scenarioId: v.string() },
  returns: v.union(
    v.object({
      status: v.literal("available"),
      scenarioId: v.id("scenarios"),
      title: v.string(),
      brief: learnerBriefValidator,
      activeAttemptId: v.union(v.null(), v.id("attempts")),
    }),
    v.object({ status: v.literal("unavailable") }),
  ),
  handler: (ctx, { scenarioId }) => getLearnerBrief(ctx, scenarioId),
});

export const start = mutation({
  args: {
    scenarioId: v.string(),
    endActiveAttemptId: v.optional(v.id("attempts")),
  },
  returns: v.union(
    v.object({ status: v.literal("started"), attemptId: v.id("attempts") }),
    v.object({
      status: v.literal("active_attempt_exists"),
      activeAttemptId: v.id("attempts"),
    }),
    v.object({ status: v.literal("unavailable") }),
  ),
  handler: startAttempt,
});

export const ownAttempt = query({
  args: { attemptId: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      id: v.id("attempts"),
      status: v.union(v.literal("active"), v.literal("ended")),
      startedAt: v.number(),
      endedAt: v.union(v.null(), v.number()),
      scenario: v.object({
        title: v.string(),
        patientName: v.string(),
        setting: v.string(),
        version: v.number(),
      }),
      timeline: v.array(
        v.object({
          sequence: v.number(),
          kind: attemptEventKindValidator,
          occurredAt: v.number(),
          text: v.optional(v.string()),
        }),
      ),
      exchange: v.union(v.null(), openExchangeValidator),
    }),
  ),
  handler: (ctx, { attemptId }) => getOwnAttempt(ctx, attemptId),
});
