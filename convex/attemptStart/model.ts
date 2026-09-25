import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import {
  abandonOpenExchanges,
  getOpenExchange,
} from "../attemptInteraction/model";
import type {
  AttemptEventKind,
  OpenExchange,
} from "../attemptInteraction/validators";
import { requireRole } from "../membershipAccess/authorization";
import type { MembershipView } from "../membershipAccess/model";
import type { LearnerBrief } from "./scenarioContent";

type ReadContext = Pick<QueryCtx, "auth" | "db">;

export type AvailableScenarioSummary = {
  scenarioId: Id<"scenarios">;
  title: string;
  patientName: string;
  setting: string;
  estimatedMinutes: LearnerBrief["estimatedMinutes"];
};

export type LearnerBriefResult =
  | {
      status: "available";
      scenarioId: Id<"scenarios">;
      title: string;
      brief: LearnerBrief;
      activeAttemptId: Id<"attempts"> | null;
    }
  | { status: "unavailable" };

export type StartAttemptResult =
  | { status: "started"; attemptId: Id<"attempts"> }
  | { status: "active_attempt_exists"; activeAttemptId: Id<"attempts"> }
  | { status: "unavailable" };

export type AttemptView = {
  id: Id<"attempts">;
  status: "active" | "ended";
  startedAt: number;
  endedAt: number | null;
  scenario: {
    title: string;
    patientName: string;
    setting: string;
    version: number;
  };
  timeline: {
    sequence: number;
    kind: AttemptEventKind;
    occurredAt: number;
    text?: string;
  }[];
  // The latest exchange still awaiting or recoverable, only while Active.
  exchange: OpenExchange | null;
};

export async function listAvailableScenarios(
  ctx: ReadContext,
): Promise<AvailableScenarioSummary[]> {
  const learner = await requireRole(ctx, "learner");
  const groupIds = await currentLearningGroupIds(ctx, learner);
  const scenarioIds = new Set<Id<"scenarios">>();
  for (const learningGroupId of groupIds) {
    const availabilities = await ctx.db
      .query("scenarioAvailabilities")
      .withIndex("by_group_scenario", (query) =>
        query.eq("learningGroupId", learningGroupId),
      )
      .collect();
    for (const availability of availabilities) {
      if (availability.institutionId === learner.institution.id) {
        scenarioIds.add(availability.scenarioId);
      }
    }
  }

  const summaries: AvailableScenarioSummary[] = [];
  for (const scenarioId of scenarioIds) {
    const current = await currentPublishedVersion(ctx, learner, scenarioId);
    if (current) {
      const { learnerBrief } = current.version;
      summaries.push({
        scenarioId,
        title: current.version.title,
        patientName: learnerBrief.patientName,
        setting: learnerBrief.setting,
        estimatedMinutes: learnerBrief.estimatedMinutes,
      });
    }
  }
  return summaries.sort((a, b) => a.title.localeCompare(b.title));
}

export async function getLearnerBrief(
  ctx: ReadContext,
  rawScenarioId: string,
): Promise<LearnerBriefResult> {
  const learner = await requireRole(ctx, "learner");
  const available = await findAvailableScenario(ctx, learner, rawScenarioId);
  if (!available) {
    return { status: "unavailable" };
  }

  const activeAttempt = await findActiveAttempt(ctx, learner);
  return {
    status: "available",
    scenarioId: available.scenario._id,
    title: available.version.title,
    brief: available.version.learnerBrief,
    activeAttemptId: activeAttempt?._id ?? null,
  };
}

export async function startAttempt(
  ctx: MutationCtx,
  input: { scenarioId: string; endActiveAttemptId?: Id<"attempts"> },
): Promise<StartAttemptResult> {
  const learner = await requireRole(ctx, "learner");
  const available = await findAvailableScenario(ctx, learner, input.scenarioId);
  if (!available) {
    return { status: "unavailable" };
  }

  const now = Date.now();
  const activeAttempt = await findActiveAttempt(ctx, learner);
  if (activeAttempt) {
    // Ending must be confirmed for the specific Attempt the Learner was shown.
    if (input.endActiveAttemptId !== activeAttempt._id) {
      return {
        status: "active_attempt_exists",
        activeAttemptId: activeAttempt._id,
      };
    }
    await ctx.db.patch(activeAttempt._id, {
      status: "ended",
      endedAt: now,
      endReason: "learner_restarted",
    });
    await abandonOpenExchanges(ctx, activeAttempt._id, now);
    await appendAttemptEvent(ctx, activeAttempt, "attempt_ended", now);
  }

  const attemptId = await ctx.db.insert("attempts", {
    institutionId: learner.institution.id,
    learnerMembershipId: learner.id,
    scenarioId: available.scenario._id,
    scenarioVersionId: available.version._id,
    status: "active",
    startedAt: now,
  });
  await ctx.db.insert("attemptEvents", {
    institutionId: learner.institution.id,
    attemptId,
    sequence: 1,
    kind: "attempt_started",
    occurredAt: now,
  });
  return { status: "started", attemptId };
}

export async function getOwnAttempt(
  ctx: ReadContext,
  rawAttemptId: string,
): Promise<AttemptView | null> {
  const learner = await requireRole(ctx, "learner");
  const attempt = await findOwnAttempt(ctx, learner, rawAttemptId);
  if (!attempt) {
    return null;
  }

  const version = await ctx.db.get(attempt.scenarioVersionId);
  if (!version) {
    throw new Error("Attempt Scenario Version is missing");
  }
  const events = await ctx.db
    .query("attemptEvents")
    .withIndex("by_attempt_sequence", (query) =>
      query.eq("attemptId", attempt._id),
    )
    .collect();

  return {
    id: attempt._id,
    status: attempt.status,
    startedAt: attempt.startedAt,
    endedAt: attempt.endedAt ?? null,
    scenario: {
      title: version.title,
      patientName: version.learnerBrief.patientName,
      setting: version.learnerBrief.setting,
      version: version.version,
    },
    timeline: events.map(({ sequence, kind, occurredAt, text }) =>
      text === undefined
        ? { sequence, kind, occurredAt }
        : { sequence, kind, occurredAt, text },
    ),
    exchange:
      attempt.status === "active"
        ? await getOpenExchange(ctx, attempt._id)
        : null,
  };
}

// Malformed, foreign, and other Learners' identifiers all resolve to null.
export async function findOwnAttempt(
  ctx: ReadContext,
  learner: MembershipView,
  rawAttemptId: string,
) {
  const attemptId = ctx.db.normalizeId("attempts", rawAttemptId);
  const attempt = attemptId ? await ctx.db.get(attemptId) : null;
  if (
    !attempt ||
    attempt.institutionId !== learner.institution.id ||
    attempt.learnerMembershipId !== learner.id
  ) {
    return null;
  }
  return attempt;
}

async function findAvailableScenario(
  ctx: ReadContext,
  learner: MembershipView,
  rawScenarioId: string,
) {
  const scenarioId = ctx.db.normalizeId("scenarios", rawScenarioId);
  if (!scenarioId) {
    return null;
  }

  for (const learningGroupId of await currentLearningGroupIds(ctx, learner)) {
    const availability = await ctx.db
      .query("scenarioAvailabilities")
      .withIndex("by_group_scenario", (query) =>
        query.eq("learningGroupId", learningGroupId).eq("scenarioId", scenarioId),
      )
      .first();
    if (availability && availability.institutionId === learner.institution.id) {
      return await currentPublishedVersion(ctx, learner, scenarioId);
    }
  }
  return null;
}

async function currentLearningGroupIds(
  ctx: ReadContext,
  learner: MembershipView,
) {
  const groupMemberships = await ctx.db
    .query("learningGroupMembers")
    .withIndex("by_membership", (query) => query.eq("membershipId", learner.id))
    .collect();
  return groupMemberships
    .filter((member) => member.institutionId === learner.institution.id)
    .map((member) => member.learningGroupId);
}

async function currentPublishedVersion(
  ctx: ReadContext,
  learner: MembershipView,
  scenarioId: Id<"scenarios">,
) {
  const scenario = await ctx.db.get(scenarioId);
  if (
    !scenario ||
    scenario.institutionId !== learner.institution.id ||
    scenario.status !== "published" ||
    !scenario.currentVersionId
  ) {
    return null;
  }
  const version = await ctx.db.get(scenario.currentVersionId);
  if (!version || version.scenarioId !== scenario._id) {
    return null;
  }
  return { scenario, version };
}

async function findActiveAttempt(ctx: ReadContext, learner: MembershipView) {
  return await ctx.db
    .query("attempts")
    .withIndex("by_learner_status", (query) =>
      query.eq("learnerMembershipId", learner.id).eq("status", "active"),
    )
    .unique();
}

// The only writer of Attempt timeline sequence numbers.
export async function appendAttemptEvent(
  ctx: MutationCtx,
  attempt: Doc<"attempts">,
  kind: AttemptEventKind,
  occurredAt: number,
  text?: string,
) {
  const lastEvent = await ctx.db
    .query("attemptEvents")
    .withIndex("by_attempt_sequence", (query) =>
      query.eq("attemptId", attempt._id),
    )
    .order("desc")
    .first();
  const sequence = (lastEvent?.sequence ?? 0) + 1;
  await ctx.db.insert("attemptEvents", {
    institutionId: attempt.institutionId,
    attemptId: attempt._id,
    sequence,
    kind,
    occurredAt,
    ...(text === undefined ? {} : { text }),
  });
  return sequence;
}
