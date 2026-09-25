import { v } from "convex/values";
import { internal } from "../_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "../_generated/server";
import { learnerBriefValidator } from "../attemptStart/scenarioContent";
import { completePatientReply } from "./gemini";
import {
  commitReply,
  loadGenerationContext,
  markGenerationFailed,
  type GenerationTarget,
} from "./model";
import {
  buildPatientPrompt,
  normalizeReply,
  type PatientContext,
} from "./patientPrompt";

const targetArgs = {
  exchangeId: v.id("exchangeRequests"),
  generation: v.number(),
};

export const generate = internalAction({
  args: targetArgs,
  returns: v.null(),
  handler: async (ctx, target) => {
    const context: PatientContext | null = await ctx.runQuery(
      internal.attemptInteraction.generation.context,
      target,
    );
    if (!context) {
      return null;
    }
    const reply = await generateReply(context);
    if (reply) {
      await ctx.runMutation(internal.attemptInteraction.generation.commit, {
        ...target,
        text: reply,
      });
    } else {
      await ctx.runMutation(
        internal.attemptInteraction.generation.markFailed,
        target,
      );
    }
    return null;
  },
});

async function generateReply(context: PatientContext) {
  try {
    const raw = await completePatientReply(buildPatientPrompt(context));
    const reply = normalizeReply(raw, context.learnerBrief.patientName);
    if (!reply) {
      console.warn("Patient reply was empty or malformed");
    }
    return reply;
  } catch (error) {
    // Timeouts, blocked responses, and a missing key all become a
    // recoverable failure; the Learner sees only generic copy.
    console.warn(
      "Patient reply generation failed:",
      error instanceof Error ? error.message : "unknown error",
    );
    return null;
  }
}

export const context = internalQuery({
  args: targetArgs,
  returns: v.union(
    v.null(),
    v.object({
      learnerBrief: learnerBriefValidator,
      initialState: v.array(v.string()),
      transcript: v.array(
        v.object({
          speaker: v.union(v.literal("learner"), v.literal("patient")),
          text: v.string(),
        }),
      ),
    }),
  ),
  handler: (ctx, target: GenerationTarget) => loadGenerationContext(ctx, target),
});

export const commit = internalMutation({
  args: { ...targetArgs, text: v.string() },
  returns: v.null(),
  handler: async (ctx, input) => {
    await commitReply(ctx, input);
    return null;
  },
});

export const markFailed = internalMutation({
  args: targetArgs,
  returns: v.null(),
  handler: async (ctx, target) => {
    await markGenerationFailed(ctx, target);
    return null;
  },
});
