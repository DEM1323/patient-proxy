// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { getFunctionName } from "convex/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RoleHome } from "./home";
import type { MembershipSummary } from "./view";

const state = vi.hoisted(() => ({ reads: [] as string[] }));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));
vi.mock("convex/react", () => ({
  useQuery: (ref: Parameters<typeof getFunctionName>[0]) => {
    const name = getFunctionName(ref);
    state.reads.push(name);
    if (name === "institutionAdmin/access:members")
      return { members: [], pending: [] };
    if (name === "learningGroups/access:learningGroups")
      return { groups: [], scenarios: [], institutionMembers: [] };
    return [];
  },
}));
const membership: MembershipSummary = {
  id: "member",
  status: "active",
  institution: { id: "umb", key: "umb", name: "UMB Pilot Institution" },
  roles: [],
};

describe("Home role boundaries", () => {
  afterEach(() => {
    cleanup();
    state.reads.length = 0;
  });
  it("does not read Learner-owned content for an Institutional Admin-only Member", () => {
    render(
      <RoleHome
        membership={{ ...membership, roles: ["institutionalAdmin"] }}
      />,
    );
    expect(
      screen.getByRole("region", { name: "Institutional Admin journey" }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("region", { name: "Learner journey" }),
    ).toBeNull();
    expect(state.reads).not.toContain("attemptStart/access:availableScenarios");
    expect(state.reads).not.toContain(
      "learnerAttemptHistory/access:ownEndedAttempts",
    );
  });
  it("gives Faculty group management without reading the institution roster", () => {
    render(<RoleHome membership={{ ...membership, roles: ["faculty"] }} />);
    expect(
      screen.getByRole("region", { name: "Faculty journey" }),
    ).toBeTruthy();
    expect(state.reads).toContain("learningGroups/access:learningGroups");
    expect(state.reads).not.toContain("institutionAdmin/access:members");
    expect(state.reads).not.toContain(
      "learnerAttemptHistory/access:ownEndedAttempts",
    );
  });
  it("retains practice when Learner is additive and recognizes Author without a dead journey", () => {
    const { unmount } = render(
      <RoleHome
        membership={{
          ...membership,
          roles: ["institutionalAdmin", "learner", "author"],
        }}
      />,
    );
    expect(
      screen.getByRole("region", { name: "Learner journey" }),
    ).toBeTruthy();
    expect(state.reads).toContain(
      "learnerAttemptHistory/access:ownEndedAttempts",
    );
    unmount();
    state.reads.length = 0;
    render(<RoleHome membership={{ ...membership, roles: ["author"] }} />);
    expect(
      screen.getByText("Scenario authoring isn’t available yet"),
    ).toBeTruthy();
    expect(state.reads).toEqual([]);
  });
});
