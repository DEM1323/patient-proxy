import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { endOwnAttempt } from "./model";

// The explicit confirmation is part of the command, so a direct call cannot
// skip it. Attempt identifiers arrive as plain strings so that malformed,
// foreign, and other Learners' identifiers all receive the same answer.
export const end = mutation({
  args: { attemptId: v.string(), confirmed: v.literal(true) },
  returns: v.union(
    v.object({
      status: v.literal("ended"),
      endReason: v.union(
        v.literal("learner_ended"),
        v.literal("learner_restarted"),
      ),
    }),
    v.object({ status: v.literal("too_early") }),
    v.object({ status: v.literal("not_found") }),
  ),
  handler: (ctx, { attemptId }) => endOwnAttempt(ctx, { attemptId }),
});
