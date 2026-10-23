import type { MembershipRole } from "@/convex/membershipAccess/roles";

export const roleLabels: Record<MembershipRole, string> = {
  learner: "Learner",
  faculty: "Faculty",
  author: "Author",
  institutionalAdmin: "Institutional Admin",
};

// Roles always display in this order, whatever order they were granted in.
export const roleOrder: MembershipRole[] = [
  "institutionalAdmin",
  "faculty",
  "learner",
  "author",
];

export const roleDescriptions: Record<MembershipRole, string> = {
  institutionalAdmin: "Manage Members, Learning Groups and institution review.",
  faculty: "Review Ended Attempts in your Learning Groups.",
  learner: "Practice Scenarios and revisit your Attempts.",
  author: "Scenario authoring is not available in this pilot.",
};

export function inRoleOrder(roles: MembershipRole[]) {
  return roleOrder.filter((role) => roles.includes(role));
}
