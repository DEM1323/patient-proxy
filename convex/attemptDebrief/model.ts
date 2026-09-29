import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { findOwnAttempt } from "../attemptStart/model";
import { requireRole } from "../membershipAccess/authorization";
import type { FeedbackContext } from "./feedbackPrompt";
import type {
  DebriefView,
  FeedbackSections,
  GeneratedPrompts,
  ReflectResult,
  ReflectionPromptKey,
  RetryFeedbackResult,
} from "./validators";

type ReadContext = Pick<QueryCtx, "auth" | "db">;

export type FeedbackTarget = {
  feedbackId: Id<"formativeFeedback">;
  generation: number;
};

// Longer than the worst case of provider retries and model fallback for
// feedback, so an interrupted generation becomes retryable.
export const feedbackDeadlineMs = 150_000;
const maxReflectionLength = 4_000;
const maxClientRequestIdLength = 100;

// Platform defaults, used until instructors author prompts for a Scenario
// Version. They are generic product copy, not Scenario content.
export const defaultReflectionPrompts: Record<ReflectionPromptKey, string> = {
  interpretation:
    "Looking back at this Attempt's record, what do you think was happening with the patient, and what in the conversation or your actions shaped how you responded?",
  planning:
    "What is one thing you would do differently or sooner in your next Attempt, and why?",
};
const promptOrder: ReflectionPromptKey[] = ["interpretation", "planning"];

/**
 * Starts Formative Feedback generation once for a learner-ended Attempt.
 * Restarted Attempts get no Debrief (the user's 2026-09-29 ruling).
 */
export async function startFeedback(
  ctx: MutationCtx,
  attempt: Doc<"attempts">,
  now: number,
) {
  if (attempt.status !== "ended" || attempt.endReason !== "learner_ended") {
    return;
  }
  if (await findFeedback(ctx, attempt._id)) {
    return;
  }
  const feedbackId = await ctx.db.insert("formativeFeedback", {
    institutionId: attempt.institutionId,
    attemptId: attempt._id,
    status: "pending",
    generation: 1,
    createdAt: now,
    updatedAt: now,
  });
  await scheduleFeedback(ctx, { feedbackId, generation: 1 });
}

export type DebriefStage = "none" | "reflecting" | "complete";

// Reflection progress only; never reads feedback.
export async function debriefStage(
  ctx: Pick<QueryCtx, "db">,
  attempt: Doc<"attempts">,
): Promise<DebriefStage> {
  if (unavailableReason(attempt)) {
    return "none";
  }
  for (const prompt of promptOrder) {
    if ((await reflectionsFor(ctx, attempt._id, prompt)).length === 0) {
      return "reflecting";
    }
  }
  return "complete";
}

export type DebriefRecord =
  | { status: "none" }
  | {
      status: "recorded";
      prompts: {
        key: ReflectionPromptKey;
        text: string | null;
        responses: {
          response: "answer" | "skip";
          text: string | null;
          submittedAt: number;
        }[];
      }[];
      feedback:
        | { status: "not_started" | "pending" | "failed" }
        | { status: "completed"; sections: FeedbackSections };
    };

/**
 * The shared learning record for an authorized reviewer: every Learner
 * Reflection and the Formative Feedback. The reveal gate applies to the
 * Learner's own Debrief, not to review. Callers authorize first.
 */
export async function getDebriefRecord(
  ctx: Pick<QueryCtx, "db">,
  attempt: Doc<"attempts">,
): Promise<DebriefRecord> {
  if (unavailableReason(attempt)) {
    return { status: "none" };
  }
  const feedback = await findFeedback(ctx, attempt._id);
  const texts = await resolvePrompts(ctx, attempt, feedback);
  const prompts = [];
  for (const key of promptOrder) {
    const responses = await reflectionsFor(ctx, attempt._id, key);
    prompts.push({
      key,
      text: responses[0]?.promptText ?? texts?.[key] ?? null,
      responses: responses.map(({ response, text, submittedAt }) => ({
        response,
        text: text ?? null,
        submittedAt,
      })),
    });
  }
  return {
    status: "recorded",
    prompts,
    feedback: !feedback
      ? { status: "not_started" }
      : feedback.status === "completed" && feedback.sections
        ? { status: "completed", sections: feedback.sections }
        : { status: feedback.status === "failed" ? "failed" : "pending" },
  };
}

export async function getOwnDebrief(
  ctx: ReadContext,
  rawAttemptId: string,
): Promise<DebriefView> {
  const learner = await requireRole(ctx, "learner");
  const attempt = await findOwnAttempt(ctx, learner, rawAttemptId);
  if (!attempt) {
    return null;
  }
  const unavailable = unavailableReason(attempt);
  if (unavailable) {
    return { status: "not_available", reason: unavailable };
  }

  const feedback = await findFeedback(ctx, attempt._id);
  const texts = await resolvePrompts(ctx, attempt, feedback);
  if (!texts) {
    // The AI is still writing the prompts from the instructors' guidance.
    return {
      status: "preparing",
      failed: !feedback || feedback.status === "failed",
    };
  }
  const prompts = [];
  for (const key of promptOrder) {
    const responses = await reflectionsFor(ctx, attempt._id, key);
    prompts.push({
      key,
      // A prompt already answered keeps the wording the Learner saw.
      text: responses[0]?.promptText ?? texts[key],
      responses: responses.map(({ response, text, submittedAt }) => ({
        response,
        text: text ?? null,
        submittedAt,
      })),
    });
  }
  const revealed = prompts.every(({ responses }) => responses.length > 0);
  if (!revealed) {
    return { status: "reflecting", prompts, feedback: null };
  }
  return {
    status: "revealed",
    prompts,
    feedback: !feedback
      ? { status: "not_started" }
      : feedback.status === "completed" && feedback.sections
        ? { status: "completed", sections: feedback.sections }
        : { status: feedback.status === "failed" ? "failed" : "pending" },
  };
}

/**
 * Appends one Learner Reflection. Answers never replace earlier responses; a
 * skip is only possible before any response to that prompt. Replaying the
 * same clientRequestId returns the recorded response.
 */
export async function submitReflection(
  ctx: MutationCtx,
  input: {
    attemptId: string;
    clientRequestId: string;
    prompt: ReflectionPromptKey;
    response: "answer" | "skip";
    text?: string;
  },
): Promise<ReflectResult> {
  const learner = await requireRole(ctx, "learner");
  const attempt = await findOwnAttempt(ctx, learner, input.attemptId);
  if (!attempt) {
    return { status: "not_found" };
  }
  if (unavailableReason(attempt)) {
    return { status: "not_available" };
  }
  if (
    input.clientRequestId.length === 0 ||
    input.clientRequestId.length > maxClientRequestIdLength
  ) {
    throw new Error("Invalid client request id");
  }
  const replay = await ctx.db
    .query("learnerReflections")
    .withIndex("by_attempt_client_request", (query) =>
      query
        .eq("attemptId", attempt._id)
        .eq("clientRequestId", input.clientRequestId),
    )
    .first();
  if (replay) {
    return { status: "recorded" };
  }
  const texts = await resolvePrompts(ctx, attempt);
  if (!texts) {
    // Generated prompts are not ready; there is nothing to answer yet.
    return { status: "not_available" };
  }

  const earlier = await reflectionsFor(ctx, attempt._id, input.prompt);
  let text: string | undefined;
  if (input.response === "answer") {
    text = input.text?.trim();
    if (!text || text.length > maxReflectionLength) {
      throw new Error(
        `A reflection must contain 1 to ${maxReflectionLength} characters`,
      );
    }
  } else if (earlier.length > 0) {
    return { status: "already_responded" };
  }

  const now = Date.now();
  await ctx.db.insert("learnerReflections", {
    institutionId: attempt.institutionId,
    attemptId: attempt._id,
    learnerMembershipId: learner.id,
    prompt: input.prompt,
    promptText: earlier[0]?.promptText ?? texts[input.prompt],
    response: input.response,
    ...(text === undefined ? {} : { text }),
    clientRequestId: input.clientRequestId,
    submittedAt: now,
  });
  // Covers Attempts that ended before the Debrief existed.
  await startFeedback(ctx, attempt, now);
  return { status: "recorded" };
}

export async function retryFeedback(
  ctx: MutationCtx,
  input: { attemptId: string },
): Promise<RetryFeedbackResult> {
  const learner = await requireRole(ctx, "learner");
  const attempt = await findOwnAttempt(ctx, learner, input.attemptId);
  if (!attempt) {
    return { status: "not_found" };
  }
  if (unavailableReason(attempt)) {
    return { status: "not_available" };
  }
  const now = Date.now();
  const feedback = await findFeedback(ctx, attempt._id);
  if (!feedback) {
    await startFeedback(ctx, attempt, now);
    return { status: "pending" };
  }
  if (feedback.status === "completed") {
    return { status: "completed" };
  }
  if (
    feedback.status === "pending" &&
    now - feedback.updatedAt < feedbackDeadlineMs
  ) {
    // Still in flight; a second generation would only race the first.
    return { status: "pending" };
  }
  const generation = feedback.generation + 1;
  await ctx.db.patch(feedback._id, {
    status: "pending",
    generation,
    updatedAt: now,
  });
  await scheduleFeedback(ctx, { feedbackId: feedback._id, generation });
  return { status: "pending" };
}

export async function loadFeedbackContext(
  ctx: Pick<QueryCtx, "db">,
  target: FeedbackTarget,
): Promise<FeedbackContext | null> {
  const current = await currentGeneration(ctx, target);
  if (!current) {
    return null;
  }
  const { attempt } = current;
  const version = await ctx.db.get(attempt.scenarioVersionId);
  if (!version) {
    throw new Error("Attempt Scenario Version is missing");
  }
  const labels = new Map(
    (version.clinicalTruth.clinicalActions?.actions ?? []).map(
      ({ key, label }) => [key, label],
    ),
  );
  const events = await ctx.db
    .query("attemptEvents")
    .withIndex("by_attempt_sequence", (query) =>
      query.eq("attemptId", attempt._id),
    )
    .collect();
  const timeline: FeedbackContext["timeline"] = [];
  for (const event of events) {
    if (
      (event.kind === "learner_message" || event.kind === "patient_message") &&
      event.text !== undefined
    ) {
      timeline.push({ sequence: event.sequence, kind: event.kind, text: event.text });
    } else if (
      event.kind === "clinical_action" &&
      event.actionKey &&
      event.observation
    ) {
      timeline.push({
        sequence: event.sequence,
        kind: "clinical_action",
        label: labels.get(event.actionKey) ?? event.actionKey,
        observation: event.observation,
      });
    }
  }
  return {
    patientName: version.learnerBrief.patientName,
    setting: version.learnerBrief.setting,
    feedbackGuidance: version.debrief?.feedbackGuidance ?? null,
    communicationCriteria: version.debrief?.communicationCriteria ?? [],
    generateReflectionPrompts: promptSource(version) === "generated",
    timeline,
  };
}

// Only the current generation may attach sections; the Attempt itself is
// never modified by feedback.
export async function commitFeedback(
  ctx: MutationCtx,
  input: FeedbackTarget & {
    sections: FeedbackSections;
    reflectionPrompts?: GeneratedPrompts;
  },
) {
  const current = await currentGeneration(ctx, input);
  if (current) {
    await ctx.db.patch(current.feedback._id, {
      status: "completed",
      sections: input.sections,
      ...(input.reflectionPrompts
        ? { reflectionPrompts: input.reflectionPrompts }
        : {}),
      updatedAt: Date.now(),
    });
  }
}

export async function markFeedbackFailed(
  ctx: MutationCtx,
  target: FeedbackTarget,
) {
  const current = await currentGeneration(ctx, target);
  if (current) {
    await ctx.db.patch(current.feedback._id, {
      status: "failed",
      updatedAt: Date.now(),
    });
  }
}

async function scheduleFeedback(ctx: MutationCtx, target: FeedbackTarget) {
  await ctx.scheduler.runAfter(
    0,
    internal.attemptDebrief.generation.generate,
    target,
  );
  await ctx.scheduler.runAfter(
    feedbackDeadlineMs,
    internal.attemptDebrief.generation.markFailed,
    target,
  );
}

async function currentGeneration(
  ctx: Pick<QueryCtx, "db">,
  target: FeedbackTarget,
) {
  const feedback = await ctx.db.get(target.feedbackId);
  if (
    !feedback ||
    feedback.status !== "pending" ||
    feedback.generation !== target.generation
  ) {
    return null;
  }
  const attempt = await ctx.db.get(feedback.attemptId);
  if (!attempt) {
    throw new Error("Feedback Attempt is missing");
  }
  return { attempt, feedback };
}

function unavailableReason(attempt: Doc<"attempts">) {
  if (attempt.status === "active") {
    return "active" as const;
  }
  return attempt.endReason === "learner_restarted"
    ? ("restarted" as const)
    : null;
}

// Fixed authored prompts first; with only feedback guidance, the AI writes
// them alongside the feedback; otherwise the platform defaults apply.
function promptSource(version: Doc<"scenarioVersions">) {
  if (version.debrief?.reflectionPrompts) {
    return "authored" as const;
  }
  return version.debrief?.feedbackGuidance
    ? ("generated" as const)
    : ("default" as const);
}

// The prompts to show, or null while generated prompts are not ready.
async function resolvePrompts(
  ctx: Pick<QueryCtx, "db">,
  attempt: Doc<"attempts">,
  feedback?: Doc<"formativeFeedback"> | null,
): Promise<Record<ReflectionPromptKey, string> | null> {
  const version = await ctx.db.get(attempt.scenarioVersionId);
  if (!version) {
    throw new Error("Attempt Scenario Version is missing");
  }
  switch (promptSource(version)) {
    case "authored":
      return version.debrief!.reflectionPrompts!;
    case "generated": {
      const row =
        feedback === undefined ? await findFeedback(ctx, attempt._id) : feedback;
      return row?.reflectionPrompts ?? null;
    }
    default:
      return defaultReflectionPrompts;
  }
}

async function reflectionsFor(
  ctx: Pick<QueryCtx, "db">,
  attemptId: Id<"attempts">,
  prompt: ReflectionPromptKey,
) {
  return await ctx.db
    .query("learnerReflections")
    .withIndex("by_attempt_prompt", (query) =>
      query.eq("attemptId", attemptId).eq("prompt", prompt),
    )
    .collect();
}

async function findFeedback(
  ctx: Pick<QueryCtx, "db">,
  attemptId: Id<"attempts">,
) {
  return await ctx.db
    .query("formativeFeedback")
    .withIndex("by_attempt", (query) => query.eq("attemptId", attemptId))
    .unique();
}
