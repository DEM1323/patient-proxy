// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { getFunctionName } from "convex/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MembersPage } from ".";
import { roleDestinations } from "../membership-access/navigation";

const testState = vi.hoisted(() => ({
  roles: ["institutionalAdmin"] as string[],
  data: undefined as unknown,
  preapprove: vi.fn(),
  revoke: vi.fn(),
}));

vi.mock("../membership-access", () => ({
  MembershipGate: ({ children }: { children: (member: unknown) => React.ReactNode }) =>
    children({
      membership: {
        id: "membership-id",
        institution: { id: "institution-id", key: "umb", name: "UMB" },
        roles: testState.roles,
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
    getFunctionName(reference) === "institutionAdmin/access:revoke"
      ? testState.revoke
      : testState.preapprove,
}));

const data = {
  rosterSource: "database",
  members: [
    {
      id: "member-1",
      email: "admin@example.edu",
      roles: ["faculty", "institutionalAdmin"],
      admittedAt: 1,
    },
  ],
  pending: [
    { id: "entry-1", email: "pending@example.edu", roles: ["learner"], approvedAt: 2 },
  ],
};

describe("Role-aware navigation", () => {
  it("lists each implemented destination once, with no inheritance or dead Author link", () => {
    expect(roleDestinations(["faculty", "institutionalAdmin"]).map(({ to }) => to)).toEqual([
      "/review",
      "/admin/members",
    ]);
    expect(roleDestinations(["institutionalAdmin"]).map(({ to }) => to)).not.toContain(
      "/scenarios",
    );
    expect(roleDestinations(["author"])).toEqual([]);
    expect(
      roleDestinations(["learner", "faculty", "author", "institutionalAdmin"]).map(({ to }) => to),
    ).toEqual(["/scenarios", "/attempts", "/review", "/admin/members"]);
  });
});

describe("Members page", () => {
  afterEach(() => {
    cleanup();
    testState.roles = ["institutionalAdmin"];
    testState.preapprove.mockReset();
    testState.revoke.mockReset();
  });

  it("lists Members and pending approvals separately", () => {
    testState.data = data;
    render(<MembersPage />);

    expect(screen.getByText("admin@example.edu")).toBeTruthy();
    expect(screen.getByText("pending@example.edu")).toBeTruthy();
    expect(screen.getByText(/awaiting first sign-in/)).toBeTruthy();
    expect(
      within(screen.getByRole("region", { name: "Members" })).getByText("Institutional Admin"),
    ).toBeTruthy();
  });

  it("pre-approves an identity with all four roles, without implying an email is sent", async () => {
    testState.data = data;
    testState.preapprove.mockResolvedValue({ status: "preapproved", rosterEntryId: "entry-2" });
    render(<MembersPage />);

    expect(screen.getByText(/does not send an invitation/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Approved identity (email)"), {
      target: { value: "new@example.edu" },
    });
    for (const role of ["Learner", "Faculty", "Author", "Institutional Admin"]) {
      fireEvent.click(screen.getByRole("checkbox", { name: role }));
    }
    fireEvent.click(screen.getByRole("button", { name: "Pre-approve identity" }));

    await waitFor(() =>
      expect(testState.preapprove).toHaveBeenCalledWith({
        email: "new@example.edu",
        roles: ["learner", "faculty", "author", "institutionalAdmin"],
      }),
    );
    expect((await screen.findByRole("status")).textContent).toMatch(/is pre-approved/);
  });

  it("revokes a pending approval and explains when binding won", async () => {
    testState.data = data;
    testState.revoke.mockResolvedValue({ status: "already_member" });
    render(<MembersPage />);

    fireEvent.click(screen.getByRole("button", { name: "Revoke approval" }));
    await waitFor(() =>
      expect(testState.revoke).toHaveBeenCalledWith({ rosterEntryId: "entry-1" }),
    );
    expect((await screen.findByRole("alert")).textContent).toMatch(/already signed in/);
  });

  it("holds pre-approval until the roster migration and gates non-admins", () => {
    testState.data = { ...data, rosterSource: "environment" };
    render(<MembersPage />);
    expect(screen.queryByRole("button", { name: "Pre-approve identity" })).toBeNull();
    expect(screen.getByText(/after the operator moves the Pilot Roster/)).toBeTruthy();
    cleanup();

    testState.roles = ["learner", "faculty"];
    render(<MembersPage />);
    expect(screen.getByText("Institutional Admin role required")).toBeTruthy();
    expect(screen.queryByText("admin@example.edu")).toBeNull();
  });
});
