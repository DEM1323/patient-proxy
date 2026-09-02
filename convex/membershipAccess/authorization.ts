import type { Id } from "../_generated/dataModel";
import {
  getCurrentMembership,
  type MembershipReadContext,
} from "./model";
import type { MembershipRole } from "./roles";

const roleNames: Record<MembershipRole, string> = {
  learner: "Learner",
  faculty: "Faculty",
  author: "Author",
  institutionalAdmin: "Institutional Admin",
};

export async function requireMembership(ctx: MembershipReadContext) {
  const membership = await getCurrentMembership(ctx);
  if (!membership) {
    throw new Error("Pilot Membership required");
  }
  return membership;
}

export async function requireRole(
  ctx: MembershipReadContext,
  role: MembershipRole,
) {
  const membership = await requireMembership(ctx);
  if (!membership.roles.includes(role)) {
    throw new Error(`${roleNames[role]} role required`);
  }
  return membership;
}

export async function requireSamePilotInstitution(
  ctx: MembershipReadContext,
  institutionId: Id<"pilotInstitutions">,
) {
  const membership = await requireMembership(ctx);
  if (membership.institution.id !== institutionId) {
    throw new Error("Pilot Institution scope required");
  }
  return membership;
}
