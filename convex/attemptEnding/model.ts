import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { endAttempt, findOwnAttempt } from "../attemptStart/model";
import { requireRole } from "../membershipAccess/authorization";

export type EndResult =
  | { status: "ended"; endReason: NonNullable<Doc<"attempts">["endReason"]> }
  | { status: "too_early" }
  | { status: "not_found" };

/**
 * Scenario decision #5: a Learner may end after three Learner turns, or one
 * Learner turn plus one Clinical Action. Omitted essential actions never block
 * ending, and reaching this minimum is not a performance outcome.
 */
export function meetsEndingMinimum(events: Pick<Doc<"attemptEvents">, "kind">[]) {
  let learnerTurns = 0;
  let clinicalActions = 0;
  for (const { kind } of events) {
    if (kind === "learner_message") {
      learnerTurns += 1;
    } else if (kind === "clinical_action") {
      clinicalActions += 1;
    }
  }
  return learnerTurns >= 3 || (learnerTurns >= 1 && clinicalActions >= 1);
}

/**
 * Ends the Learner's own Active Attempt once, after explicit confirmation.
 * Ending is idempotent by Attempt state: repeating the command after a lost
 * response returns the same Ended Attempt without another event.
 */
export async function endOwnAttempt(
  ctx: MutationCtx,
  input: { attemptId: string },
): Promise<EndResult> {
  const learner = await requireRole(ctx, "learner");
  const attempt = await findOwnAttempt(ctx, learner, input.attemptId);
  if (!attempt) {
    return { status: "not_found" };
  }
  if (attempt.status === "ended") {
    return { status: "ended", endReason: attempt.endReason ?? "learner_ended" };
  }
  const events = await ctx.db
    .query("attemptEvents")
    .withIndex("by_attempt_sequence", (query) =>
      query.eq("attemptId", attempt._id),
    )
    .collect();
  if (!meetsEndingMinimum(events)) {
    return { status: "too_early" };
  }
  await endAttempt(ctx, attempt, "learner_ended", Date.now());
  return { status: "ended", endReason: "learner_ended" };
}
