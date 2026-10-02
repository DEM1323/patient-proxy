import { Link } from "@tanstack/react-router";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { MembershipRole } from "@/convex/membershipAccess/roles";

export type Destination = {
  to: "/scenarios" | "/attempts" | "/review" | "/groups" | "/admin/members";
  label: string;
};

const destinationsByRole: Record<MembershipRole, Destination[]> = {
  learner: [
    { to: "/scenarios", label: "Scenarios" },
    { to: "/attempts", label: "Your Attempts" },
  ],
  faculty: [
    { to: "/review", label: "Review" },
    { to: "/groups", label: "Learning Groups" },
  ],
  // Recognized, but authoring is not built; no dead link.
  author: [],
  institutionalAdmin: [
    { to: "/review", label: "Review" },
    { to: "/groups", label: "Learning Groups" },
    { to: "/admin/members", label: "Members" },
  ],
};

/**
 * Each implemented journey of the Member's roles, once per destination.
 * Navigation only mirrors roles; Convex authorizes every read and change.
 */
export function roleDestinations(roles: MembershipRole[]): Destination[] {
  const seen = new Set<string>();
  const destinations: Destination[] = [];
  for (const role of roles) {
    for (const destination of destinationsByRole[role]) {
      if (!seen.has(destination.to)) {
        seen.add(destination.to);
        destinations.push(destination);
      }
    }
  }
  return destinations;
}

export function destinationsForRole(role: MembershipRole) {
  return destinationsByRole[role];
}

const linkClass =
  "rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

// Header links for the signed-in Member; nothing before sign-in or admission.
export function RoleNavigation() {
  const { isAuthenticated } = useConvexAuth();
  const membership = useQuery(
    api.membershipAccess.access.currentMembership,
    isAuthenticated ? {} : "skip",
  );
  if (!membership || membership.status !== "active") {
    return null;
  }
  return (
    <>
      <Link to="/" className={linkClass} activeOptions={{ exact: true }} activeProps={{ className: "bg-slate-100 text-primary" }}>
        Home
      </Link>
      {roleDestinations(membership.roles).map((destination) => (
        <Link
          key={destination.to}
          to={destination.to}
          className={linkClass}
          activeProps={{ className: "bg-slate-100 text-primary" }}
        >
          {destination.label}
        </Link>
      ))}
    </>
  );
}
