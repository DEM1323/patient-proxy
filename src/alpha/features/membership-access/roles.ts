import type { MembershipRole } from "@/convex/membershipAccess/roles";

export const roleLabels: Record<MembershipRole, string> = {
  learner: "Learner",
  faculty: "Faculty",
  author: "Author",
  institutionalAdmin: "Institutional Admin",
};

// Roles always display in this order, whatever order they were granted in.
export const roleOrder = Object.keys(roleLabels) as MembershipRole[];

export function inRoleOrder(roles: MembershipRole[]) {
  return roleOrder.filter((role) => roles.includes(role));
}
