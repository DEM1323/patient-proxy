import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { getOwnDebrief, retryFeedback, submitReflection } from "./model";
import {
  debriefViewValidator,
  reflectResultValidator,
  reflectionPromptKeyValidator,
  reflectionResponseValidator,
  retryFeedbackResultValidator,
} from "./validators";

// Attempt identifiers arrive from routes as plain strings so that malformed,
// foreign, and other Learners' identifiers all receive the same answer.
// Formative Feedback is withheld until each Reflection Prompt has an explicit
// answer or skip.
export const ownDebrief = query({
  args: { attemptId: v.string() },
  returns: debriefViewValidator,
  handler: (ctx, { attemptId }) => getOwnDebrief(ctx, attemptId),
});

export const reflect = mutation({
  args: {
    attemptId: v.string(),
    clientRequestId: v.string(),
    prompt: reflectionPromptKeyValidator,
    response: reflectionResponseValidator,
    text: v.optional(v.string()),
  },
  returns: reflectResultValidator,
  handler: submitReflection,
});

export const retryFeedbackGeneration = mutation({
  args: { attemptId: v.string() },
  returns: retryFeedbackResultValidator,
  handler: (ctx, { attemptId }) => retryFeedback(ctx, { attemptId }),
});
