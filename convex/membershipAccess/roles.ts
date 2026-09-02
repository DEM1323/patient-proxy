import { v } from "convex/values";

export const membershipRoles = [
  "learner",
  "faculty",
  "author",
  "institutionalAdmin",
] as const;

export type MembershipRole = (typeof membershipRoles)[number];

export const membershipRoleValidator = v.union(
  v.literal("learner"),
  v.literal("faculty"),
  v.literal("author"),
  v.literal("institutionalAdmin"),
);

export function isMembershipRole(value: unknown): value is MembershipRole {
  return membershipRoles.some((role) => role === value);
}
