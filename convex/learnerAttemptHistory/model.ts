import type { Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { debriefStage, type DebriefStage } from "../attemptDebrief/model";
import { requireRole } from "../membershipAccess/authorization";

export type AttemptHistoryEntry = {
  id: Id<"attempts">;
  scenarioTitle: string;
  scenarioVersion: number;
  startedAt: number;
  endedAt: number;
  endReason: "learner_ended" | "learner_restarted";
  // Where the Learner is in the Attempt Debrief. Says nothing about the
  // feedback's content; "none" for restarted Attempts, which have no Debrief.
  debrief: DebriefStage;
};

/**
 * The Learner's own retained Ended Attempts, most recently ended first.
 * Active Attempts are excluded: an Active Attempt is continuous, not history,
 * and is never offered for resumption here.
 */
export async function listOwnEndedAttempts(
  ctx: Pick<QueryCtx, "auth" | "db">,
): Promise<AttemptHistoryEntry[]> {
  const learner = await requireRole(ctx, "learner");
  const attempts = await ctx.db
    .query("attempts")
    .withIndex("by_learner_status", (query) =>
      query.eq("learnerMembershipId", learner.id).eq("status", "ended"),
    )
    .collect();

  const entries: AttemptHistoryEntry[] = [];
  for (const attempt of attempts) {
    if (attempt.institutionId !== learner.institution.id) {
      continue;
    }
    const version = await ctx.db.get(attempt.scenarioVersionId);
    if (!version) {
      throw new Error("Attempt Scenario Version is missing");
    }
    entries.push({
      id: attempt._id,
      scenarioTitle: version.title,
      scenarioVersion: version.version,
      startedAt: attempt.startedAt,
      endedAt: attempt.endedAt ?? attempt.startedAt,
      endReason: attempt.endReason ?? "learner_ended",
      debrief: await debriefStage(ctx, attempt),
    });
  }
  return entries.sort((a, b) => b.endedAt - a.endedAt);
}
