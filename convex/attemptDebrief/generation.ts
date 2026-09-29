import { v } from "convex/values";
import { internal } from "../_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "../_generated/server";
import { completeFeedback } from "../attemptInteraction/gemini";
import {
  buildFeedbackPrompt,
  parseFeedback,
  type FeedbackContext,
} from "./feedbackPrompt";
import {
  commitFeedback,
  loadFeedbackContext,
  markFeedbackFailed,
} from "./model";
import { feedbackSectionsValidator } from "./validators";

const targetArgs = {
  feedbackId: v.id("formativeFeedback"),
  generation: v.number(),
};

export const generate = internalAction({
  args: targetArgs,
  returns: v.null(),
  handler: async (ctx, target) => {
    const context: FeedbackContext | null = await ctx.runQuery(
      internal.attemptDebrief.generation.context,
      target,
    );
    if (!context) {
      return null;
    }
    let sections = null;
    try {
      sections = parseFeedback(
        await completeFeedback(buildFeedbackPrompt(context)),
        context,
      );
      if (!sections) {
        console.warn("Formative Feedback was malformed or unsupported by evidence");
      }
    } catch (error) {
      // Timeouts, blocked responses, and a missing key all become a
      // recoverable failure; the Learner sees only generic copy.
      console.warn(
        "Formative Feedback generation failed:",
        error instanceof Error ? error.message : "unknown error",
      );
    }
    if (sections) {
      await ctx.runMutation(internal.attemptDebrief.generation.commit, {
        ...target,
        sections,
      });
    } else {
      await ctx.runMutation(
        internal.attemptDebrief.generation.markFailed,
        target,
      );
    }
    return null;
  },
});

const timelineEventValidator = v.union(
  v.object({
    sequence: v.number(),
    kind: v.union(v.literal("learner_message"), v.literal("patient_message")),
    text: v.string(),
  }),
  v.object({
    sequence: v.number(),
    kind: v.literal("clinical_action"),
    label: v.string(),
    observation: v.string(),
  }),
);

export const context = internalQuery({
  args: targetArgs,
  returns: v.union(
    v.null(),
    v.object({
      patientName: v.string(),
      setting: v.string(),
      communicationCriteria: v.array(
        v.object({ key: v.string(), label: v.string(), description: v.string() }),
      ),
      timeline: v.array(timelineEventValidator),
    }),
  ),
  handler: (ctx, target) => loadFeedbackContext(ctx, target),
});

export const commit = internalMutation({
  args: { ...targetArgs, sections: feedbackSectionsValidator },
  returns: v.null(),
  handler: async (ctx, input) => {
    await commitFeedback(ctx, input);
    return null;
  },
});

export const markFailed = internalMutation({
  args: targetArgs,
  returns: v.null(),
  handler: async (ctx, target) => {
    await markFeedbackFailed(ctx, target);
    return null;
  },
});
