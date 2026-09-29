import { v } from "convex/values";
import { query } from "../_generated/server";
import { listOwnEndedAttempts } from "./model";

// Detail stays on attemptStart's ownAttempt and attemptDebrief's ownDebrief,
// which already restrict every record to its owning Learner.
export const ownEndedAttempts = query({
  args: {},
  returns: v.array(
    v.object({
      id: v.id("attempts"),
      scenarioTitle: v.string(),
      scenarioVersion: v.number(),
      startedAt: v.number(),
      endedAt: v.number(),
      endReason: v.union(
        v.literal("learner_ended"),
        v.literal("learner_restarted"),
      ),
      debrief: v.union(
        v.literal("none"),
        v.literal("reflecting"),
        v.literal("complete"),
      ),
    }),
  ),
  handler: listOwnEndedAttempts,
});
