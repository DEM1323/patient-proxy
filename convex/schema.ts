import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  feedbackSectionsValidator,
  feedbackStatusValidator,
  generatedPromptsValidator,
  reflectionPromptKeyValidator,
  reflectionResponseValidator,
} from "./attemptDebrief/validators";
import {
  clinicalTruthValidator,
  debriefContentValidator,
  learnerBriefValidator,
} from "./attemptStart/scenarioContent";
import {
  attemptEventKindValidator,
  exchangeStatusValidator,
} from "./attemptInteraction/validators";
import { endReasonValidator } from "./attemptEnding/validators";
import {
  auditEventFields,
  rosterEntryStatusValidator,
} from "./institutionAdmin/validators";
import {
  membershipRoleValidator,
  membershipStatusValidator,
} from "./membershipAccess/roles";

export default defineSchema({
  // Records the one-time cutover from PILOT_ROSTER_JSON to the database
  // Pilot Roster. Once present, admission never reads the environment roster.
  rosterAuthority: defineTable({
    key: v.literal("admission"),
    source: v.literal("database"),
    cutoverAt: v.number(),
  }).index("by_key", ["key"]),
  // The private Pilot Roster: one entry per exact normalized identity, across
  // institutions. Pending entries govern first admission; bound entries keep
  // binding history. Current roles live on the Membership.
  rosterEntries: defineTable({
    institutionId: v.id("pilotInstitutions"),
    email: v.string(),
    roles: v.array(membershipRoleValidator),
    status: rosterEntryStatusValidator,
    membershipId: v.optional(v.id("memberships")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_institution_status", ["institutionId", "status"]),
  // Private, institution-scoped record of roster and role changes.
  auditEvents: defineTable(auditEventFields).index("by_institution_time", [
    "institutionId",
    "occurredAt",
  ]),
  pilotInstitutions: defineTable({
    key: v.string(),
    name: v.string(),
  }).index("by_key", ["key"]),
  memberships: defineTable({
    workosUserId: v.string(),
    rosterEmail: v.string(),
    institutionId: v.id("pilotInstitutions"),
    roles: v.array(membershipRoleValidator),
    createdAt: v.number(),
    // Participation status; absent means active. A deactivated Membership
    // keeps its binding and records but cannot read or act.
    status: v.optional(membershipStatusValidator),
    statusChangedAt: v.optional(v.number()),
  })
    .index("by_workos_user_id", ["workosUserId"])
    .index("by_roster_email", ["rosterEmail"])
    .index("by_institution_id", ["institutionId"]),
  scenarios: defineTable({
    institutionId: v.id("pilotInstitutions"),
    key: v.string(),
    title: v.string(),
    status: v.literal("published"),
    currentVersionId: v.optional(v.id("scenarioVersions")),
  }).index("by_institution_key", ["institutionId", "key"]),
  scenarioVersions: defineTable({
    institutionId: v.id("pilotInstitutions"),
    scenarioId: v.id("scenarios"),
    version: v.number(),
    title: v.string(),
    learnerBrief: learnerBriefValidator,
    clinicalTruth: clinicalTruthValidator,
    // Instructor-authored Communication Criteria and Reflection Prompts.
    debrief: v.optional(debriefContentValidator),
    createdAt: v.number(),
  }).index("by_scenario_version", ["scenarioId", "version"]),
  learningGroups: defineTable({
    institutionId: v.id("pilotInstitutions"),
    key: v.string(),
    name: v.string(),
  }).index("by_institution_key", ["institutionId", "key"]),
  learningGroupMembers: defineTable({
    institutionId: v.id("pilotInstitutions"),
    learningGroupId: v.id("learningGroups"),
    membershipId: v.id("memberships"),
  })
    .index("by_membership", ["membershipId"])
    .index("by_group_membership", ["learningGroupId", "membershipId"]),
  scenarioAvailabilities: defineTable({
    institutionId: v.id("pilotInstitutions"),
    learningGroupId: v.id("learningGroups"),
    scenarioId: v.id("scenarios"),
  }).index("by_group_scenario", ["learningGroupId", "scenarioId"]),
  attempts: defineTable({
    institutionId: v.id("pilotInstitutions"),
    learnerMembershipId: v.id("memberships"),
    scenarioId: v.id("scenarios"),
    scenarioVersionId: v.id("scenarioVersions"),
    status: v.union(v.literal("active"), v.literal("ended")),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
    // See attemptEnding/validators.ts for the meaning of each reason.
    endReason: v.optional(endReasonValidator),
  })
    .index("by_learner_status", ["learnerMembershipId", "status"])
    // Institutional Admin review spans the Pilot Institution.
    .index("by_institution_status", ["institutionId", "status"])
    // Retention: Ended Attempts by end time, Active Attempts by start time.
    .index("by_status_ended_at", ["status", "endedAt"])
    .index("by_status_started_at", ["status", "startedAt"]),
  attemptEvents: defineTable({
    institutionId: v.id("pilotInstitutions"),
    attemptId: v.id("attempts"),
    sequence: v.number(),
    kind: attemptEventKindValidator,
    occurredAt: v.number(),
    // Message events only. Recorded conversation is evidence, never Clinical
    // Truth.
    text: v.optional(v.string()),
    // Clinical Action events only: the action, the authored observation it
    // revealed, and the request identity that makes retries idempotent.
    actionKey: v.optional(v.string()),
    observation: v.optional(v.string()),
    clientRequestId: v.optional(v.string()),
  })
    .index("by_attempt_sequence", ["attemptId", "sequence"])
    .index("by_attempt_client_request", ["attemptId", "clientRequestId"]),
  // Recoverable request state for one Learner message and its patient reply.
  // Only the generation matching `generation` may commit a reply.
  exchangeRequests: defineTable({
    institutionId: v.id("pilotInstitutions"),
    attemptId: v.id("attempts"),
    clientRequestId: v.string(),
    status: exchangeStatusValidator,
    generation: v.number(),
    learnerSequence: v.number(),
    patientSequence: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_attempt_client_request", ["attemptId", "clientRequestId"])
    .index("by_attempt_learner_sequence", ["attemptId", "learnerSequence"]),
  // One recoverable Formative Feedback result per learner-ended Attempt. Only
  // the generation matching `generation` may commit sections.
  formativeFeedback: defineTable({
    institutionId: v.id("pilotInstitutions"),
    attemptId: v.id("attempts"),
    status: feedbackStatusValidator,
    generation: v.number(),
    sections: v.optional(feedbackSectionsValidator),
    // Reflection Prompts the AI wrote from the instructors' feedback guidance;
    // shown before the reveal. Absent when prompts are authored or default.
    reflectionPrompts: v.optional(generatedPromptsValidator),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_attempt", ["attemptId"]),
  // Append-only: a later response adds a row and never replaces an earlier
  // one. The prompt text is stored as shown, so the record stands alone.
  learnerReflections: defineTable({
    institutionId: v.id("pilotInstitutions"),
    attemptId: v.id("attempts"),
    learnerMembershipId: v.id("memberships"),
    prompt: reflectionPromptKeyValidator,
    promptText: v.string(),
    response: reflectionResponseValidator,
    text: v.optional(v.string()),
    clientRequestId: v.string(),
    submittedAt: v.number(),
  })
    .index("by_attempt_prompt", ["attemptId", "prompt"])
    .index("by_attempt_client_request", ["attemptId", "clientRequestId"]),
  // Non-identifying counts from each retention purge, per institution. No
  // Attempt, Learner, or content reference survives deletion.
  retentionRuns: defineTable({
    institutionId: v.id("pilotInstitutions"),
    ranAt: v.number(),
    endedAttemptsDeleted: v.number(),
    activeAttemptsDeleted: v.number(),
  }),
});
