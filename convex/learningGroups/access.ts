import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import {
  membershipRoleValidator,
  membershipStatusValidator,
} from "../membershipAccess/roles";
import {
  createLearningGroup,
  getLearningGroups,
  setGroupMembership,
  setScenarioAvailability,
} from "./model";

const memberValidator = v.object({
  id: v.id("memberships"),
  email: v.string(),
  roles: v.array(membershipRoleValidator),
  status: membershipStatusValidator,
});
const changeResultValidator = v.object({
  status: v.union(v.literal("updated"), v.literal("unchanged"), v.literal("not_found")),
});

// Identifiers arrive as plain strings so foreign and malformed ids get the
// same answer. Scope always comes from the caller's Membership.
export const learningGroups = query({
  args: {},
  returns: v.object({
    canManageGroups: v.boolean(),
    groups: v.array(
      v.object({
        id: v.id("learningGroups"),
        name: v.string(),
        canChangeAvailability: v.boolean(),
        members: v.array(memberValidator),
        availableScenarioIds: v.array(v.id("scenarios")),
      }),
    ),
    scenarios: v.array(v.object({ id: v.id("scenarios"), title: v.string() })),
    institutionMembers: v.array(memberValidator),
  }),
  handler: getLearningGroups,
});

export const createGroup = mutation({
  args: { name: v.string() },
  returns: v.union(
    v.object({ status: v.literal("created"), learningGroupId: v.id("learningGroups") }),
    v.object({ status: v.literal("invalid_name") }),
    v.object({ status: v.literal("duplicate_name") }),
  ),
  handler: createLearningGroup,
});

export const setMembership = mutation({
  args: { learningGroupId: v.string(), membershipId: v.string(), enrolled: v.boolean() },
  returns: changeResultValidator,
  handler: setGroupMembership,
});

export const setAvailability = mutation({
  args: { learningGroupId: v.string(), scenarioId: v.string(), available: v.boolean() },
  returns: changeResultValidator,
  handler: setScenarioAvailability,
});
