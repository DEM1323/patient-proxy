import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  clinicalTruthValidator,
  learnerBriefValidator,
} from "./attemptStart/scenarioContent";
import { membershipRoleValidator } from "./membershipAccess/roles";

export default defineSchema({
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
    // learner_restarted: ended by confirming Start again, so later slices can
    // skip the ending guardrail and Formative Feedback for it. learner_ended is
    // the deliberate ending owned by issue #13.
    endReason: v.optional(
      v.union(v.literal("learner_ended"), v.literal("learner_restarted")),
    ),
  }).index("by_learner_status", ["learnerMembershipId", "status"]),
  attemptEvents: defineTable({
    institutionId: v.id("pilotInstitutions"),
    attemptId: v.id("attempts"),
    sequence: v.number(),
    kind: v.union(v.literal("attempt_started"), v.literal("attempt_ended")),
    occurredAt: v.number(),
  }).index("by_attempt_sequence", ["attemptId", "sequence"]),
});
