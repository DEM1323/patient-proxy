// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
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
  useAuth: () => ({
    user: { email: "member@example.edu" },
    signOut: testState.signOut,
  }),
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
  navGroups(roles).map(({ label, destinations }) => [
    label,
    destinations.map(({ to }) => to),
  ]);

const member = (roles: string[], status: "active" | "inactive" = "active") => ({
  id: "membership-id",
  institution: {
    id: "institution-id",
    key: "umb",
    name: "UMB Pilot Institution",
  },
  roles,
  status,
});

describe("Sidebar groups", () => {
  it("keeps one order and shows only the groups held roles grant", () => {
    expect(
      paths(["institutionalAdmin", "faculty", "author", "learner"]),
    ).toEqual([
      [null, ["/"]],
      ["Practice", ["/scenarios", "/attempts"]],
      ["Review", ["/review"]],
      ["Institution", ["/admin/members", "/groups"]],
      ["Authoring", ["/authoring"]],
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

  it("grants nothing by inheritance, and gives Author only Scenario debriefs", () => {
    expect(paths(["author"])).toEqual([
      [null, ["/"]],
      ["Authoring", ["/authoring"]],
    ]);
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

    const nav = within(
      screen.getByRole("navigation", { name: "Primary navigation" }),
    );
    expect(nav.getAllByRole("link").map((link) => link.textContent)).toEqual([
      "Home",
      "Scenarios",
      "Your Attempts",
      "Ended Attempts",
      "Members",
      "Learning Groups",
    ]);
    expect(nav.queryByText("Deployment check")).toBeNull();
    expect(screen.queryByText("member@example.edu")).toBeNull();
    fireEvent.click(nav.getByRole("button", { name: /My account/ }));
    const account = within(screen.getByRole("dialog", { name: "My account" }));
    expect(account.getByText("member@example.edu")).toBeTruthy();
    expect(
      account.getByText("All listed roles are active together."),
    ).toBeTruthy();
    expect(account.getByText("Institutional Admin")).toBeTruthy();
    expect(account.getByText("Learner")).toBeTruthy();
    fireEvent.click(account.getByRole("button", { name: "Sign out" }));
    expect(testState.signOut).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Page")).toBeTruthy();
  });

  it("opens Settings above the account menu and restores focus on close", () => {
    testState.membership = member(["learner"]);
    render(
      <AppShell>
        <main>Page</main>
      </AppShell>,
    );
    const trigger = screen.getByRole("button", { name: /My account/ });
    fireEvent.click(trigger);
    const settings = screen.getByRole("button", { name: "Settings" });
    fireEvent.click(settings);
    const dialog = screen.getByRole("dialog", { name: "Settings" });
    expect(screen.getByRole("dialog", { name: "My account" })).toBeTruthy();
    fireEvent.click(
      within(dialog).getByRole("combobox", { name: "Appearance" }),
    );
    expect(within(dialog).getAllByRole("option").length).toBe(3);
    fireEvent(
      dialog,
      new Event("cancel", { bubbles: false, cancelable: true }),
    );
    expect(screen.queryByRole("dialog", { name: "Settings" })).toBeNull();
    expect(document.activeElement).toBe(settings);
    fireEvent.click(settings);
    fireEvent.click(
      within(screen.getByRole("dialog", { name: "Settings" })).getByRole(
        "button",
        { name: "Close dialog" },
      ),
    );
    expect(screen.getByRole("dialog", { name: "My account" })).toBeTruthy();
    expect(document.activeElement).toBe(settings);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "My account" })).toBeNull();
    expect(document.activeElement).toBe(trigger);
    fireEvent.click(trigger);
    fireEvent.click(screen.getByText("Page"));
    expect(screen.queryByRole("dialog", { name: "My account" })).toBeNull();
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

    const nav = within(
      screen.getByRole("navigation", { name: "Primary navigation" }),
    );
    expect(nav.getAllByRole("link").map((link) => link.textContent)).toEqual([
      "Home",
      "Scenarios",
      "Your Attempts",
    ]);
    expect(nav.queryByRole("button", { name: "Sign out" })).toBeNull();
  });
});
