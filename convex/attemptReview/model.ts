import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import {
  debriefStage,
  getDebriefRecord,
  type DebriefRecord,
  type DebriefStage,
} from "../attemptDebrief/model";
import {
  buildAttemptView,
  type AttemptView,
  type EndReason,
} from "../attemptStart/model";
import { requireMembership } from "../membershipAccess/authorization";
import type { MembershipView } from "../membershipAccess/model";

type ReadContext = Pick<QueryCtx, "auth" | "db">;

export type ReviewListEntry = {
  id: Id<"attempts">;
  learnerEmail: string;
  scenarioTitle: string;
  scenarioVersion: number;
  endedAt: number;
  endReason: EndReason;
  debrief: DebriefStage;
};

export type ReviewDetail = {
  learnerEmail: string;
  attempt: Pick<
    AttemptView,
    "id" | "startedAt" | "endedAt" | "endReason" | "scenario" | "timeline"
  >;
  debrief: DebriefRecord;
};

/**
 * Review scope is derived on every read, so revocation is immediate:
 * - Institutional Admin: every Ended Attempt in their Pilot Institution.
 * - Faculty: Ended Attempts whose Learner currently shares a Learning Group
 *   with them, where that group currently makes the Attempt's Scenario
 *   available.
 * Roles are additive; neither inherits the other.
 */
async function requireReviewer(ctx: ReadContext) {
  const member = await requireMembership(ctx);
  const isAdmin = member.roles.includes("institutionalAdmin");
  const isFaculty = member.roles.includes("faculty");
  if (!isAdmin && !isFaculty) {
    throw new Error("Faculty or Institutional Admin role required");
  }
  return { member, isAdmin, isFaculty };
}

export async function listReviewableAttempts(
  ctx: ReadContext,
): Promise<ReviewListEntry[]> {
  const { member, isAdmin, isFaculty } = await requireReviewer(ctx);
  const reviewable = new Map<Id<"attempts">, Doc<"attempts">>();

  if (isAdmin) {
    const attempts = await ctx.db
      .query("attempts")
      .withIndex("by_institution_status", (query) =>
        query.eq("institutionId", member.institution.id).eq("status", "ended"),
      )
      .collect();
    for (const attempt of attempts) {
      reviewable.set(attempt._id, attempt);
    }
  }
  if (isFaculty) {
    for (const learningGroupId of await groupsOf(ctx, member)) {
      const availableScenarios = new Set(
        (
          await ctx.db
            .query("scenarioAvailabilities")
            .withIndex("by_group_scenario", (query) =>
              query.eq("learningGroupId", learningGroupId),
            )
            .collect()
        )
          .filter(({ institutionId }) => institutionId === member.institution.id)
          .map(({ scenarioId }) => scenarioId),
      );
      if (availableScenarios.size === 0) {
        continue;
      }
      const groupMembers = await ctx.db
        .query("learningGroupMembers")
        .withIndex("by_group_membership", (query) =>
          query.eq("learningGroupId", learningGroupId),
        )
        .collect();
      for (const { membershipId, institutionId } of groupMembers) {
        if (institutionId !== member.institution.id) {
          continue;
        }
        const attempts = await ctx.db
          .query("attempts")
          .withIndex("by_learner_status", (query) =>
            query.eq("learnerMembershipId", membershipId).eq("status", "ended"),
          )
          .collect();
        for (const attempt of attempts) {
          if (
            attempt.institutionId === member.institution.id &&
            availableScenarios.has(attempt.scenarioId)
          ) {
            // A Map keyed by Attempt lists each Attempt once, however many
            // shared groups grant it.
            reviewable.set(attempt._id, attempt);
          }
        }
      }
    }
  }

  const entries: ReviewListEntry[] = [];
  for (const attempt of reviewable.values()) {
    const [version, learner] = await Promise.all([
      ctx.db.get(attempt.scenarioVersionId),
      ctx.db.get(attempt.learnerMembershipId),
    ]);
    if (!version || !learner) {
      throw new Error("Attempt Scenario Version or Learner is missing");
    }
    entries.push({
      id: attempt._id,
      learnerEmail: learner.rosterEmail,
      scenarioTitle: version.title,
      scenarioVersion: version.version,
      endedAt: attempt.endedAt ?? attempt.startedAt,
      endReason: attempt.endReason ?? "learner_ended",
      debrief: await debriefStage(ctx, attempt),
    });
  }
  return entries.sort((a, b) => b.endedAt - a.endedAt);
}

/**
 * One authorized Ended Attempt with its evidence, Learner Reflections, and
 * Formative Feedback. Active, foreign, malformed, and unauthorized
 * identifiers all return null, revealing nothing.
 */
export async function getReviewDetail(
  ctx: ReadContext,
  rawAttemptId: string,
): Promise<ReviewDetail | null> {
  const { member, isAdmin, isFaculty } = await requireReviewer(ctx);
  const attemptId = ctx.db.normalizeId("attempts", rawAttemptId);
  const attempt = attemptId ? await ctx.db.get(attemptId) : null;
  if (
    !attempt ||
    attempt.status !== "ended" ||
    attempt.institutionId !== member.institution.id
  ) {
    return null;
  }
  const authorized =
    isAdmin || (isFaculty && (await facultyMayReview(ctx, member, attempt)));
  if (!authorized) {
    return null;
  }
  const learner = await ctx.db.get(attempt.learnerMembershipId);
  if (!learner) {
    throw new Error("Attempt Learner is missing");
  }
  const { id, startedAt, endedAt, endReason, scenario, timeline } =
    await buildAttemptView(ctx, attempt);
  return {
    learnerEmail: learner.rosterEmail,
    attempt: { id, startedAt, endedAt, endReason, scenario, timeline },
    debrief: await getDebriefRecord(ctx, attempt),
  };
}

async function facultyMayReview(
  ctx: ReadContext,
  faculty: MembershipView,
  attempt: Doc<"attempts">,
) {
  for (const learningGroupId of await groupsOf(ctx, faculty)) {
    const [learnerInGroup, availability] = await Promise.all([
      ctx.db
        .query("learningGroupMembers")
        .withIndex("by_group_membership", (query) =>
          query
            .eq("learningGroupId", learningGroupId)
            .eq("membershipId", attempt.learnerMembershipId),
        )
        .first(),
      ctx.db
        .query("scenarioAvailabilities")
        .withIndex("by_group_scenario", (query) =>
          query
            .eq("learningGroupId", learningGroupId)
            .eq("scenarioId", attempt.scenarioId),
        )
        .first(),
    ]);
    if (
      learnerInGroup?.institutionId === faculty.institution.id &&
      availability?.institutionId === faculty.institution.id
    ) {
      return true;
    }
  }
  return false;
}

async function groupsOf(ctx: ReadContext, member: MembershipView) {
  const memberships = await ctx.db
    .query("learningGroupMembers")
    .withIndex("by_membership", (query) => query.eq("membershipId", member.id))
    .collect();
  return memberships
    .filter(({ institutionId }) => institutionId === member.institution.id)
    .map(({ learningGroupId }) => learningGroupId);
}
