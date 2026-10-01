// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { getFunctionName } from "convex/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LearningGroupsPage } from ".";

const testState = vi.hoisted(() => ({
  roles: ["institutionalAdmin"] as string[],
  data: undefined as unknown,
  mutations: {
    createGroup: vi.fn(),
    setMembership: vi.fn(),
    setAvailability: vi.fn(),
  } as Record<string, ReturnType<typeof vi.fn>>,
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
}));

vi.mock("convex/react", () => ({
  useQuery: () => testState.data,
  useMutation: (reference: Parameters<typeof getFunctionName>[0]) =>
    testState.mutations[getFunctionName(reference).replace("learningGroups/access:", "")],
}));

const adminView = {
  canManageGroups: true,
  groups: [
    {
      id: "group-1",
      name: "PACU Pilot",
      canChangeAvailability: true,
      members: [
        { id: "m-learner", email: "learner@example.edu", roles: ["learner"], status: "active" },
      ],
      availableScenarioIds: ["scenario-1"],
    },
  ],
  scenarios: [{ id: "scenario-1", title: "Initial PACU Assessment" }],
  institutionMembers: [
    { id: "m-learner", email: "learner@example.edu", roles: ["learner"], status: "active" },
    { id: "m-faculty", email: "faculty@example.edu", roles: ["faculty"], status: "active" },
  ],
};

const group = () => within(screen.getByRole("region", { name: "PACU Pilot" }));

describe("Learning Groups page", () => {
  afterEach(() => {
    cleanup();
    testState.roles = ["institutionalAdmin"];
    for (const mutation of Object.values(testState.mutations)) mutation.mockReset();
  });

  it("lets an Institutional Admin create a group and enroll or remove Members", async () => {
    testState.data = adminView;
    testState.mutations.createGroup.mockResolvedValue({
      status: "created",
      learningGroupId: "group-2",
    });
    testState.mutations.setMembership.mockResolvedValue({ status: "updated" });
    render(<LearningGroupsPage />);

    fireEvent.change(screen.getByLabelText("Group name"), { target: { value: "Spring Cohort" } });
    fireEvent.click(screen.getByRole("button", { name: "Create group" }));
    await waitFor(() =>
      expect(testState.mutations.createGroup).toHaveBeenCalledWith({ name: "Spring Cohort" }),
    );

    // Only Members not already in the group are offered.
    const select = group().getByLabelText("Add a Member") as HTMLSelectElement;
    expect([...select.options].map(({ value }) => value)).toEqual(["", "m-faculty"]);
    fireEvent.change(select, { target: { value: "m-faculty" } });
    fireEvent.click(group().getByRole("button", { name: "Add to group" }));
    await waitFor(() =>
      expect(testState.mutations.setMembership).toHaveBeenCalledWith({
        learningGroupId: "group-1",
        membershipId: "m-faculty",
        enrolled: true,
      }),
    );

    fireEvent.click(group().getByRole("button", { name: "Remove" }));
    await waitFor(() =>
      expect(testState.mutations.setMembership).toHaveBeenLastCalledWith({
        learningGroupId: "group-1",
        membershipId: "m-learner",
        enrolled: false,
      }),
    );
  });

  it("lets Faculty change availability for their groups without enrollment controls", async () => {
    testState.roles = ["faculty"];
    testState.data = { ...adminView, canManageGroups: false, institutionMembers: [] };
    testState.mutations.setAvailability.mockResolvedValue({ status: "updated" });
    render(<LearningGroupsPage />);

    expect(screen.queryByLabelText("Group name")).toBeNull();
    expect(group().queryByRole("button", { name: "Remove" })).toBeNull();
    expect(group().queryByLabelText("Add a Member")).toBeNull();
    fireEvent.click(group().getByRole("checkbox", { name: "Initial PACU Assessment" }));
    await waitFor(() =>
      expect(testState.mutations.setAvailability).toHaveBeenCalledWith({
        learningGroupId: "group-1",
        scenarioId: "scenario-1",
        available: false,
      }),
    );
    expect((await screen.findByRole("status")).textContent).toMatch(/availability removed/);
  });

  it("explains that removal never ends an Attempt in progress, and gates other roles", () => {
    testState.data = adminView;
    render(<LearningGroupsPage />);
    expect(screen.getByText(/never ends an Attempt already in progress/)).toBeTruthy();
    cleanup();

    testState.roles = ["learner", "author"];
    render(<LearningGroupsPage />);
    expect(screen.getByText("Faculty or Institutional Admin role required")).toBeTruthy();
  });
});
