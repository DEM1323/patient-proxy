import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
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
});
