import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

const dayMs = 24 * 60 * 60 * 1000;

// Approved retention policy (issue #4): an Ended Attempt is deleted 90 days
// after it ended; an Active Attempt 30 days after its last activity. There is
// no per-Attempt override, and later reflections do not extend retention.
export const endedRetentionMs = 90 * dayMs;
export const activeRetentionMs = 30 * dayMs;

// Bounded work per mutation; the purge reschedules itself while more remain.
export const purgeBatchSize = 25;

export type PurgeResult = {
  endedDeleted: number;
  activeDeleted: number;
  more: boolean;
};

/**
 * Deletes expired Attempts with all of their Learner-owned content: events,
 * exchange requests, Formative Feedback, and Learner Reflections. Only
 * non-identifying counts per institution remain, in `retentionRuns`.
 */
export async function purgeExpiredAttempts(
  ctx: MutationCtx,
  now = Date.now(),
): Promise<PurgeResult> {
  const counts = new Map<Id<"pilotInstitutions">, { ended: number; active: number }>();
  const count = (institutionId: Id<"pilotInstitutions">, kind: "ended" | "active") => {
    const entry = counts.get(institutionId) ?? { ended: 0, active: 0 };
    entry[kind] += 1;
    counts.set(institutionId, entry);
  };

  // Oldest first. Every ending sets endedAt, so the range never needs a
  // fallback.
  const ended = await ctx.db
    .query("attempts")
    .withIndex("by_status_ended_at", (query) =>
      query.eq("status", "ended").lt("endedAt", now - endedRetentionMs),
    )
    .take(purgeBatchSize + 1);
  for (const attempt of ended.slice(0, purgeBatchSize)) {
    await deleteAttempt(ctx, attempt._id);
    count(attempt.institutionId, "ended");
  }
  let budget = purgeBatchSize - Math.min(ended.length, purgeBatchSize);
  let more = ended.length > purgeBatchSize;

  // Last activity is never earlier than the start, so only Attempts started
  // before the cutoff can qualify. A Learner holds at most one Active Attempt.
  const staleActive = await ctx.db
    .query("attempts")
    .withIndex("by_status_started_at", (query) =>
      query.eq("status", "active").lt("startedAt", now - activeRetentionMs),
    )
    .collect();
  for (const attempt of staleActive) {
    if ((await lastActivityAt(ctx, attempt)) >= now - activeRetentionMs) {
      continue;
    }
    if (budget === 0) {
      more = true;
      break;
    }
    await deleteAttempt(ctx, attempt._id);
    count(attempt.institutionId, "active");
    budget -= 1;
  }

  let endedDeleted = 0;
  let activeDeleted = 0;
  for (const [institutionId, { ended, active }] of counts) {
    await ctx.db.insert("retentionRuns", {
      institutionId,
      ranAt: now,
      endedAttemptsDeleted: ended,
      activeAttemptsDeleted: active,
    });
    endedDeleted += ended;
    activeDeleted += active;
  }
  return { endedDeleted, activeDeleted, more };
}

async function lastActivityAt(
  ctx: MutationCtx,
  attempt: { _id: Id<"attempts">; startedAt: number },
) {
  const latest = await ctx.db
    .query("attemptEvents")
    .withIndex("by_attempt_sequence", (query) => query.eq("attemptId", attempt._id))
    .order("desc")
    .first();
  return Math.max(attempt.startedAt, latest?.occurredAt ?? 0);
}

async function deleteAttempt(ctx: MutationCtx, attemptId: Id<"attempts">) {
  const rows = [
    ...(await ctx.db
      .query("attemptEvents")
      .withIndex("by_attempt_sequence", (query) => query.eq("attemptId", attemptId))
      .collect()),
    ...(await ctx.db
      .query("exchangeRequests")
      .withIndex("by_attempt_client_request", (query) => query.eq("attemptId", attemptId))
      .collect()),
    ...(await ctx.db
      .query("formativeFeedback")
      .withIndex("by_attempt", (query) => query.eq("attemptId", attemptId))
      .collect()),
    ...(await ctx.db
      .query("learnerReflections")
      .withIndex("by_attempt_prompt", (query) => query.eq("attemptId", attemptId))
      .collect()),
  ];
  for (const row of rows) {
    await ctx.db.delete(row._id);
  }
  await ctx.db.delete(attemptId);
}
