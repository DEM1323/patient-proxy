// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MembershipRole } from "@/convex/membershipAccess/roles";
import { AppShell, navGroups, useCompactRail } from "./navigation";

const testState = vi.hoisted(() => ({
  membership: null as null | {
    id: string;
    institution: { id: string; key: string; name: string };
    roles: string[];
    status: "active" | "inactive";
  },
  signOut: vi.fn(),
}));

vi.mock("@workos-inc/authkit-react", () => ({
  useAuth: () => ({ user: { email: "member@example.edu" }, signOut: testState.signOut }),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

vi.mock("convex/react", () => ({
  useConvexAuth: () => ({ isAuthenticated: true }),
  useQuery: () => testState.membership,
}));

const paths = (roles: MembershipRole[]) =>
  navGroups(roles).map(({ label, destinations }) => [label, destinations.map(({ to }) => to)]);

const member = (roles: string[], status: "active" | "inactive" = "active") => ({
  id: "membership-id",
  institution: { id: "institution-id", key: "umb", name: "UMB Pilot Institution" },
  roles,
  status,
});

describe("Sidebar groups", () => {
  it("keeps one order and shows only the groups held roles grant", () => {
    expect(paths(["institutionalAdmin", "faculty", "author", "learner"])).toEqual([
      [null, ["/"]],
      ["Practice", ["/scenarios", "/attempts"]],
      ["Review", ["/review"]],
      ["Institution", ["/admin/members", "/groups"]],
    ]);
    expect(paths(["institutionalAdmin"])).toEqual([
      [null, ["/"]],
      ["Review", ["/review"]],
      ["Institution", ["/admin/members", "/groups"]],
    ]);
  });

  it("gives Faculty without Institutional Admin their Learning Groups under Review", () => {
    expect(paths(["faculty", "learner"])).toEqual([
      [null, ["/"]],
      ["Practice", ["/scenarios", "/attempts"]],
      ["Review", ["/review", "/groups"]],
    ]);
  });

  it("grants nothing by inheritance, and no dead Author link", () => {
    expect(paths(["author"])).toEqual([[null, ["/"]]]);
    expect(paths(["learner"])).toEqual([
      [null, ["/"]],
      ["Practice", ["/scenarios", "/attempts"]],
    ]);
  });
});

describe("App shell", () => {
  afterEach(() => {
    cleanup();
    testState.membership = null;
    testState.signOut.mockReset();
  });

  it("frames the page with the Member's destinations, roles, and sign-out", () => {
    testState.membership = member(["institutionalAdmin", "learner"]);
    render(
      <AppShell>
        <main>Page</main>
      </AppShell>,
    );

    const nav = within(screen.getByRole("navigation", { name: "Primary navigation" }));
    expect(nav.getAllByRole("link").map((link) => link.textContent)).toEqual([
      "Home",
      "Scenarios",
      "Your Attempts",
      "Ended Attempts",
      "Members",
      "Learning Groups",
    ]);
    expect(nav.queryByText("Deployment check")).toBeNull();
    expect(nav.getByText("member@example.edu")).toBeTruthy();
    expect(
      within(nav.getByLabelText("Your roles"))
        .getAllByText(/./)
        .map((chip) => chip.textContent),
    ).toEqual(["Learner", "Institutional Admin"]);
    fireEvent.click(nav.getByRole("button", { name: "Sign out" }));
    expect(testState.signOut).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Page")).toBeTruthy();
  });

  it("leaves pages unframed before admission and while deactivated", () => {
    render(
      <AppShell>
        <main>Sign in</main>
      </AppShell>,
    );
    expect(screen.queryByRole("navigation")).toBeNull();

    testState.membership = member(["learner"], "inactive");
    cleanup();
    render(
      <AppShell>
        <main>Paused</main>
      </AppShell>,
    );
    expect(screen.queryByRole("navigation")).toBeNull();
  });

  it("collapses to the Practice rail while a page asks for it", () => {
    testState.membership = member(["institutionalAdmin", "learner"]);
    function ActiveAttempt() {
      useCompactRail(true);
      return <main>Bedside</main>;
    }
    render(
      <AppShell>
        <ActiveAttempt />
      </AppShell>,
    );

    const nav = within(screen.getByRole("navigation", { name: "Primary navigation" }));
    expect(nav.getAllByRole("link").map((link) => link.textContent)).toEqual([
      "Home",
      "Scenarios",
      "Your Attempts",
    ]);
    expect(nav.queryByRole("button", { name: "Sign out" })).toBeNull();
  });
});
