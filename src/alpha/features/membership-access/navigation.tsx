import { Link } from "@tanstack/react-router";
import { useAuth } from "@workos-inc/authkit-react";
import { useConvexAuth, useQuery } from "convex/react";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api } from "@/convex/_generated/api";
import type { MembershipRole } from "@/convex/membershipAccess/roles";
import { Icon, type IconName } from "../../ui/icon";
import { inRoleOrder, roleLabels } from "./roles";
import type { MembershipSummary } from "./view";

export type Destination = {
  to: "/" | "/scenarios" | "/attempts" | "/review" | "/groups" | "/admin/members";
  label: string;
  icon: IconName;
};

export type NavGroup = { label: string | null; destinations: Destination[] };

const home: Destination = { to: "/", label: "Home", icon: "home" };
const scenarios: Destination = { to: "/scenarios", label: "Scenarios", icon: "scenarios" };
const attempts: Destination = { to: "/attempts", label: "Your Attempts", icon: "clock" };
const review: Destination = { to: "/review", label: "Ended Attempts", icon: "review" };
const members: Destination = { to: "/admin/members", label: "Members", icon: "users" };
const groups: Destination = { to: "/groups", label: "Learning Groups", icon: "groups" };

/**
 * The sidebar for a Member's roles. The order never changes (Practice, Review,
 * Institution), and only groups for held roles appear. Roles add up without
 * inheritance; Author has no implemented journey, so it adds nothing.
 * Navigation only mirrors roles: Convex authorizes every read and change.
 */
export function navGroups(roles: MembershipRole[]): NavGroup[] {
  const learner = roles.includes("learner");
  const faculty = roles.includes("faculty");
  const admin = roles.includes("institutionalAdmin");
  const result: NavGroup[] = [{ label: null, destinations: [home] }];
  if (learner) {
    result.push({ label: "Practice", destinations: [scenarios, attempts] });
  }
  if (faculty || admin) {
    // Faculty manage availability for their own groups; an admin finds the
    // same page under Institution, so it appears once.
    result.push({
      label: "Review",
      destinations: faculty && !admin ? [review, groups] : [review],
    });
  }
  if (admin) {
    result.push({ label: "Institution", destinations: [members, groups] });
  }
  return result;
}

// The Active Attempt collapses the sidebar to a rail so the bedside has room.
const CompactRailContext = createContext<(compact: boolean) => void>(() => {});

export function useCompactRail(compact: boolean) {
  const setCompact = useContext(CompactRailContext);
  useEffect(() => {
    setCompact(compact);
    return () => setCompact(false);
  }, [compact, setCompact]);
}

/**
 * The signed-in frame: a Proxy Blue sidebar beside the page. Before sign-in,
 * admission, or while deactivated, pages render alone, since no journeys exist.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useConvexAuth();
  const membership = useQuery(
    api.membershipAccess.access.currentMembership,
    isAuthenticated ? {} : "skip",
  );
  const [compact, setCompact] = useState(false);

  if (!membership || membership.status !== "active") {
    return <>{children}</>;
  }
  return (
    <CompactRailContext.Provider value={setCompact}>
      <div className="flex min-h-screen flex-col md:flex-row">
        {compact ? <CompactRail /> : <Sidebar membership={membership} />}
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </CompactRailContext.Provider>
  );
}

const itemClass =
  "flex items-center gap-3 rounded-md px-[10px] py-[9px] text-ui font-semibold text-rail-text hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";
const activeItem = { className: "bg-harbor text-white hover:bg-harbor" };

function Sidebar({ membership }: { membership: MembershipSummary }) {
  const { signOut, user } = useAuth();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <header className="z-10 flex flex-col bg-rail px-[14px] py-3 text-white md:sticky md:top-0 md:h-screen md:w-[248px] md:flex-none md:gap-[22px] md:overflow-y-auto md:pb-[18px] md:pt-[22px]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5 px-[10px]">
          <span className="text-[19px] font-extrabold leading-tight tracking-[-0.01em]">
            Patient Proxy
          </span>
          <span className="text-caption text-rail-label">
            {membership.institution.name}
          </span>
        </div>
        <button
          type="button"
          aria-expanded={open}
          aria-controls="primary-navigation"
          onClick={() => setOpen(!open)}
          className="rounded-md bg-white/15 px-3 py-1.5 text-small font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white md:hidden"
        >
          {open ? "Close menu" : "Menu"}
        </button>
      </div>
      <nav
        id="primary-navigation"
        aria-label="Primary navigation"
        className={`${open ? "flex" : "hidden"} flex-1 flex-col gap-[22px] pb-2 pt-4 md:flex md:p-0`}
      >
        {navGroups(membership.roles).map((group) => (
          <div key={group.label ?? "home"} className="flex flex-col gap-0.5">
            {group.label && (
              <span className="px-[10px] pb-1.5 text-meta font-semibold text-rail-label">
                {group.label}
              </span>
            )}
            {group.destinations.map((destination) => (
              <Link
                key={destination.to}
                to={destination.to}
                onClick={close}
                className={itemClass}
                activeOptions={{ exact: destination.to === "/" }}
                activeProps={activeItem}
              >
                <Icon name={destination.icon} />
                {destination.label}
              </Link>
            ))}
          </div>
        ))}
        <div className="mt-auto flex flex-col gap-2 border-t border-white/20 px-[10px] pt-4 text-small">
          {user?.email && (
            <span className="break-all text-label font-semibold">{user.email}</span>
          )}
          <span className="flex flex-wrap gap-1.5" aria-label="Your roles">
            {inRoleOrder(membership.roles).map((role) => (
              <span
                key={role}
                className="rounded-full bg-white/15 px-2 py-0.5 text-chip font-semibold"
              >
                {roleLabels[role]}
              </span>
            ))}
          </span>
          <button
            type="button"
            onClick={() => signOut({ returnTo: window.location.origin })}
            className="w-fit font-semibold underline underline-offset-[3px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Sign out
          </button>
        </div>
      </nav>
    </header>
  );
}

// Icon-only Practice destinations, so leaving the Attempt is one step away.
function CompactRail() {
  return (
    <nav
      aria-label="Primary navigation"
      className="flex items-center gap-2 bg-rail px-3 py-2 text-white md:sticky md:top-0 md:h-screen md:w-[84px] md:flex-none md:flex-col md:px-2.5 md:py-[22px]"
    >
      <span aria-hidden="true" className="px-2 text-[15px] font-extrabold md:pb-3">
        PP
      </span>
      {[home, scenarios, attempts].map((destination) => (
        <Link
          key={destination.to}
          to={destination.to}
          title={destination.label}
          className={itemClass}
          activeOptions={{ exact: true }}
          activeProps={activeItem}
        >
          <Icon name={destination.icon} />
          <span className="sr-only">{destination.label}</span>
        </Link>
      ))}
    </nav>
  );
}
