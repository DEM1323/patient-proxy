// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { getFunctionName } from "convex/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ScenarioListPage } from ".";

const testState = vi.hoisted(() => ({
  roles: [] as string[],
  reads: [] as string[],
}));

vi.mock("../membership-access", () => ({
  MembershipGate: ({ children }: { children: (member: unknown) => React.ReactNode }) =>
    children({
      membership: {
        id: "membership-id",
        institution: { id: "institution-id", key: "umb", name: "UMB" },
        roles: testState.roles,
        status: "active",
      },
      signOut: () => undefined,
    }),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
  useNavigate: () => vi.fn(),
}));

vi.mock("convex/react", () => ({
  useQuery: (reference: Parameters<typeof getFunctionName>[0]) => {
    testState.reads.push(getFunctionName(reference));
    return [];
  },
  useMutation: () => vi.fn(),
}));

const renderAs = (roles: string[]) => {
  testState.roles = roles;
  render(<ScenarioListPage />);
};

describe("Scenarios page role sections", () => {
  afterEach(() => {
    cleanup();
    testState.reads.length = 0;
  });

  it("shows a Learner only what they can practice", () => {
    renderAs(["learner"]);
    expect(screen.getByRole("heading", { name: "Available Scenarios" })).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Debrief content" })).toBeNull();
    expect(testState.reads).toEqual(["attemptStart/access:availableScenarios"]);
  });

  it("shows an Author only debrief content", () => {
    renderAs(["author"]);
    expect(screen.getByRole("region", { name: "Debrief content" })).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Practice" })).toBeNull();
    expect(testState.reads).toEqual(["scenarioAuthoring/access:scenarios"]);
  });

  it("gives a Learner who is also an Author both sections on one page", () => {
    renderAs(["learner", "author"]);
    expect(screen.getByRole("heading", { name: "Available to practice" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Debrief content" })).toBeTruthy();
  });

  it("reads nothing for roles without Scenarios", () => {
    renderAs(["faculty", "institutionalAdmin"]);
    expect(screen.getByText(/Learner or Author role/)).toBeTruthy();
    expect(testState.reads).toEqual([]);
  });
});
