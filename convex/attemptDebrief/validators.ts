import { v, type Infer } from "convex/values";

export const reflectionPromptKeyValidator = v.union(
  v.literal("interpretation"),
  v.literal("planning"),
);

export const reflectionResponseValidator = v.union(
  v.literal("answer"),
  v.literal("skip"),
);

export const feedbackStatusValidator = v.union(
  v.literal("pending"),
  v.literal("failed"),
  v.literal("completed"),
);

// "not_yet_demonstrated" is shown as "Not observed in this Attempt": a missing
// behavior is never described as performed incorrectly.
export const criterionRatingValidator = v.union(
  v.literal("demonstrated"),
  v.literal("partially_demonstrated"),
  v.literal("not_yet_demonstrated"),
);

// Evidence is a list of Attempt timeline sequence numbers.
const evidenceValidator = v.array(v.number());

// The five Formative Feedback sections from Scenario decision #5, scoped to
// communication (the user's 2026-09-29 ruling). `criteria` is null when no
// Communication Criteria have been authored for the Scenario Version.
export const feedbackSectionsValidator = v.object({
  summary: v.array(v.object({ text: v.string(), evidence: evidenceValidator })),
  strengths: v.array(
    v.object({ text: v.string(), evidence: evidenceValidator }),
  ),
  priorities: v.array(
    v.object({
      text: v.string(),
      evidence: evidenceValidator,
      observed: v.boolean(),
    }),
  ),
  criteria: v.union(
    v.null(),
    v.array(
      v.object({
        key: v.string(),
        label: v.string(),
        rating: criterionRatingValidator,
        rationale: v.string(),
        evidence: evidenceValidator,
      }),
    ),
  ),
  suggestions: v.array(v.string()),
});

export const generatedPromptsValidator = v.object({
  interpretation: v.string(),
  planning: v.string(),
});

export const reflectResultValidator = v.union(
  v.object({ status: v.literal("recorded") }),
  v.object({ status: v.literal("already_responded") }),
  v.object({ status: v.literal("not_available") }),
  v.object({ status: v.literal("not_found") }),
);

export const retryFeedbackResultValidator = v.union(
  v.object({ status: v.literal("pending") }),
  v.object({ status: v.literal("completed") }),
  v.object({ status: v.literal("not_available") }),
  v.object({ status: v.literal("not_found") }),
);

export const debriefViewValidator = v.union(
  v.null(),
  v.object({
    status: v.literal("not_available"),
    reason: v.union(
      v.literal("active"),
      v.literal("restarted"),
      v.literal("suspended"),
    ),
  }),
  // The AI is writing Reflection Prompts from the instructors' guidance.
  // `failed` offers a retry; nothing about feedback is exposed.
  v.object({ status: v.literal("preparing"), failed: v.boolean() }),
  v.object({
    // "revealed" once each prompt has an explicit answer or skip.
    status: v.union(v.literal("reflecting"), v.literal("revealed")),
    prompts: v.array(
      v.object({
        key: reflectionPromptKeyValidator,
        text: v.string(),
        responses: v.array(
          v.object({
            response: reflectionResponseValidator,
            text: v.union(v.null(), v.string()),
            submittedAt: v.number(),
          }),
        ),
      }),
    ),
    // Always null before the reveal, whatever the generation state.
    feedback: v.union(
      v.null(),
      v.object({ status: v.literal("not_started") }),
      v.object({ status: v.literal("pending") }),
      v.object({ status: v.literal("failed") }),
      v.object({
        status: v.literal("completed"),
        sections: feedbackSectionsValidator,
      }),
    ),
  }),
);

export type ReflectionPromptKey = Infer<typeof reflectionPromptKeyValidator>;
export type FeedbackSections = Infer<typeof feedbackSectionsValidator>;
export type GeneratedPrompts = Infer<typeof generatedPromptsValidator>;
export type DebriefView = Infer<typeof debriefViewValidator>;
export type ReflectResult = Infer<typeof reflectResultValidator>;
export type RetryFeedbackResult = Infer<typeof retryFeedbackResultValidator>;
