import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { appendAttemptEvent, findOwnAttempt } from "../attemptStart/model";
import { requireRole } from "../membershipAccess/authorization";
import { currentStage, observe } from "./clinicalActions";
import type { PatientContext } from "./patientPrompt";
import type { ActionResult, OpenExchange, SendResult } from "./validators";

type ReadContext = Pick<QueryCtx, "db">;

export const maxMessageLength = 2000;
const maxClientRequestIdLength = 100;
// Longer than the worst case of provider retries and model fallback (four
// 12-second requests plus backoff), so a pending exchange whose generation was
// interrupted becomes retryable without the Learner reloading.
export const exchangeDeadlineMs = 60_000;

export type GenerationTarget = {
  exchangeId: Id<"exchangeRequests">;
  generation: number;
};

/**
 * Concurrency policy: one open exchange per Attempt. A new message is refused
 * while the previous one is pending, and supersedes (abandons) a failed one.
 * Resending the same clientRequestId never records a second Learner message.
 */
export async function sendMessage(
  ctx: MutationCtx,
  input: { attemptId: string; clientRequestId: string; text: string },
): Promise<SendResult> {
  const learner = await requireRole(ctx, "learner");
  const attempt = await findOwnAttempt(ctx, learner, input.attemptId);
  if (!attempt) {
    return { status: "not_found" };
  }
  const clientRequestId = validClientRequestId(input.clientRequestId);
  const existing = await findExchange(ctx, attempt._id, clientRequestId);
  if (existing) {
    return await replayExchange(ctx, attempt, existing);
  }

  const text = input.text.trim();
  if (text.length === 0 || text.length > maxMessageLength) {
    throw new Error(`A message must contain 1 to ${maxMessageLength} characters`);
  }
  if (attempt.status !== "active") {
    return { status: "ended" };
  }
  const latest = await latestExchange(ctx, attempt._id);
  if (latest?.status === "pending") {
    return { status: "busy" };
  }

  const now = Date.now();
  if (latest?.status === "failed") {
    await ctx.db.patch(latest._id, { status: "abandoned", updatedAt: now });
  }
  const learnerSequence = await appendAttemptEvent(
    ctx,
    attempt,
    "learner_message",
    now,
    { text },
  );
  const exchangeId = await ctx.db.insert("exchangeRequests", {
    institutionId: attempt.institutionId,
    attemptId: attempt._id,
    clientRequestId,
    status: "pending",
    generation: 1,
    learnerSequence,
    createdAt: now,
    updatedAt: now,
  });
  await scheduleGeneration(ctx, { exchangeId, generation: 1 });
  return { status: "pending" };
}

/**
 * Records one Clinical Action occurrence and its deterministic authored
 * observation. Replaying the same clientRequestId returns the recorded
 * occurrence; a new clientRequestId is an intentional repeat.
 */
export async function takeClinicalAction(
  ctx: MutationCtx,
  input: { attemptId: string; clientRequestId: string; actionKey: string },
): Promise<ActionResult> {
  const learner = await requireRole(ctx, "learner");
  const attempt = await findOwnAttempt(ctx, learner, input.attemptId);
  if (!attempt) {
    return { status: "not_found" };
  }
  const clientRequestId = validClientRequestId(input.clientRequestId);
  const existing = await ctx.db
    .query("attemptEvents")
    .withIndex("by_attempt_client_request", (query) =>
      query.eq("attemptId", attempt._id).eq("clientRequestId", clientRequestId),
    )
    .first();
  if (existing) {
    return { status: "recorded" };
  }
  if (attempt.status !== "active") {
    return { status: "ended" };
  }

  const version = await ctx.db.get(attempt.scenarioVersionId);
  const content = version?.clinicalTruth.clinicalActions;
  if (!content?.actions.some(({ key }) => key === input.actionKey)) {
    throw new Error("Unknown Clinical Action");
  }
  const events = await ctx.db
    .query("attemptEvents")
    .withIndex("by_attempt_sequence", (query) =>
      query.eq("attemptId", attempt._id),
    )
    .collect();
  const performed = events.flatMap(({ kind, actionKey }) =>
    kind === "clinical_action" && actionKey ? [actionKey] : [],
  );
  await appendAttemptEvent(ctx, attempt, "clinical_action", Date.now(), {
    actionKey: input.actionKey,
    observation: observe(content, performed, input.actionKey),
    clientRequestId,
  });
  return { status: "recorded" };
}

export async function retryExchange(
  ctx: MutationCtx,
  input: { attemptId: string; clientRequestId: string },
): Promise<SendResult> {
  const learner = await requireRole(ctx, "learner");
  const attempt = await findOwnAttempt(ctx, learner, input.attemptId);
  const existing =
    attempt &&
    (await findExchange(
      ctx,
      attempt._id,
      validClientRequestId(input.clientRequestId),
    ));
  if (!attempt || !existing) {
    return { status: "not_found" };
  }
  return await replayExchange(ctx, attempt, existing);
}

async function replayExchange(
  ctx: MutationCtx,
  attempt: Doc<"attempts">,
  exchange: Doc<"exchangeRequests">,
): Promise<SendResult> {
  if (exchange.status === "completed" || exchange.status === "abandoned") {
    return { status: exchange.status };
  }
  if (attempt.status !== "active") {
    return { status: "ended" };
  }
  const now = Date.now();
  if (
    exchange.status === "pending" &&
    now - exchange.updatedAt < exchangeDeadlineMs
  ) {
    // Still in flight; a second generation would only race the first.
    return { status: "pending" };
  }
  // Failed, or pending past its deadline: only the new generation may commit.
  const generation = exchange.generation + 1;
  await ctx.db.patch(exchange._id, {
    status: "pending",
    generation,
    updatedAt: now,
  });
  await scheduleGeneration(ctx, { exchangeId: exchange._id, generation });
  return { status: "pending" };
}

async function scheduleGeneration(ctx: MutationCtx, target: GenerationTarget) {
  await ctx.scheduler.runAfter(
    0,
    internal.attemptInteraction.generation.generate,
    target,
  );
  await ctx.scheduler.runAfter(
    exchangeDeadlineMs,
    internal.attemptInteraction.generation.markFailed,
    target,
  );
}

export async function loadGenerationContext(
  ctx: ReadContext,
  target: GenerationTarget,
): Promise<PatientContext | null> {
  const current = await currentGeneration(ctx, target);
  if (!current || current.attempt.status !== "active") {
    return null;
  }
  const { attempt, exchange } = current;
  const version = await ctx.db.get(attempt.scenarioVersionId);
  if (!version) {
    throw new Error("Attempt Scenario Version is missing");
  }
  const events = await ctx.db
    .query("attemptEvents")
    .withIndex("by_attempt_sequence", (query) =>
      query
        .eq("attemptId", attempt._id)
        .lte("sequence", exchange.learnerSequence),
    )
    .collect();
  const content = version.clinicalTruth.clinicalActions;
  const labels = new Map(
    (content?.actions ?? []).map(({ key, label }) => [key, label]),
  );
  const transcript: PatientContext["transcript"] = [];
  const performed: string[] = [];
  for (const event of events) {
    if (event.kind === "learner_message" && event.text !== undefined) {
      transcript.push({ speaker: "learner", text: event.text });
    } else if (event.kind === "patient_message" && event.text !== undefined) {
      transcript.push({ speaker: "patient", text: event.text });
    } else if (event.kind === "clinical_action" && event.actionKey) {
      performed.push(event.actionKey);
      transcript.push({
        speaker: "action",
        text: labels.get(event.actionKey) ?? event.actionKey,
      });
    }
  }
  // Only the stage reached by recorded Clinical Actions is current; later
  // progression stays withheld from the Simulated Patient.
  return {
    learnerBrief: version.learnerBrief,
    currentState: content
      ? currentStage(content, performed).state
      : version.clinicalTruth.initialState,
    transcript,
  };
}

export async function commitReply(
  ctx: MutationCtx,
  input: GenerationTarget & { text: string },
) {
  const current = await currentGeneration(ctx, input);
  if (!current) {
    return;
  }
  const { attempt, exchange } = current;
  const now = Date.now();
  if (attempt.status !== "active") {
    // A late reply after the Attempt ended appends nothing.
    await ctx.db.patch(exchange._id, { status: "abandoned", updatedAt: now });
    return;
  }
  const patientSequence = await appendAttemptEvent(
    ctx,
    attempt,
    "patient_message",
    now,
    { text: input.text },
  );
  await ctx.db.patch(exchange._id, {
    status: "completed",
    patientSequence,
    updatedAt: now,
  });
}

// Records a provider failure, or the deadline passing, for one generation.
export async function markGenerationFailed(
  ctx: MutationCtx,
  target: GenerationTarget,
) {
  const current = await currentGeneration(ctx, target);
  if (current) {
    await ctx.db.patch(current.exchange._id, {
      status: current.attempt.status === "active" ? "failed" : "abandoned",
      updatedAt: Date.now(),
    });
  }
}

export async function getOpenExchange(
  ctx: ReadContext,
  attemptId: Id<"attempts">,
): Promise<OpenExchange | null> {
  const latest = await latestExchange(ctx, attemptId);
  return latest && (latest.status === "pending" || latest.status === "failed")
    ? { clientRequestId: latest.clientRequestId, status: latest.status }
    : null;
}

export async function abandonOpenExchanges(
  ctx: MutationCtx,
  attemptId: Id<"attempts">,
  now: number,
) {
  const exchanges = await ctx.db
    .query("exchangeRequests")
    .withIndex("by_attempt_learner_sequence", (query) =>
      query.eq("attemptId", attemptId),
    )
    .collect();
  for (const exchange of exchanges) {
    if (exchange.status === "pending" || exchange.status === "failed") {
      await ctx.db.patch(exchange._id, { status: "abandoned", updatedAt: now });
    }
  }
}

// The exchange and its Attempt, only while this generation may still commit.
async function currentGeneration(ctx: ReadContext, target: GenerationTarget) {
  const exchange = await ctx.db.get(target.exchangeId);
  if (
    !exchange ||
    exchange.status !== "pending" ||
    exchange.generation !== target.generation
  ) {
    return null;
  }
  const attempt = await ctx.db.get(exchange.attemptId);
  if (!attempt) {
    throw new Error("Exchange Attempt is missing");
  }
  return { attempt, exchange };
}

async function findExchange(
  ctx: ReadContext,
  attemptId: Id<"attempts">,
  clientRequestId: string,
) {
  return await ctx.db
    .query("exchangeRequests")
    .withIndex("by_attempt_client_request", (query) =>
      query.eq("attemptId", attemptId).eq("clientRequestId", clientRequestId),
    )
    .unique();
}

async function latestExchange(ctx: ReadContext, attemptId: Id<"attempts">) {
  return await ctx.db
    .query("exchangeRequests")
    .withIndex("by_attempt_learner_sequence", (query) =>
      query.eq("attemptId", attemptId),
    )
    .order("desc")
    .first();
}

function validClientRequestId(clientRequestId: string) {
  if (
    clientRequestId.length === 0 ||
    clientRequestId.length > maxClientRequestIdLength
  ) {
    throw new Error("Invalid client request id");
  }
  return clientRequestId;
}
