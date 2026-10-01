// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { getFunctionName } from "convex/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MembersPage } from ".";
import { roleDestinations } from "../membership-access/navigation";

const testState = vi.hoisted(() => ({
  roles: ["institutionalAdmin"] as string[],
  data: undefined as unknown,
  auditLog: [] as unknown[],
  mutations: {
    preapprove: vi.fn(),
    revoke: vi.fn(),
    setRoles: vi.fn(),
    setPendingApprovalRoles: vi.fn(),
    deactivate: vi.fn(),
    reactivate: vi.fn(),
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

const nameOf = (reference: Parameters<typeof getFunctionName>[0]) =>
  getFunctionName(reference).replace("institutionAdmin/access:", "");

vi.mock("convex/react", () => ({
  useQuery: (reference: Parameters<typeof getFunctionName>[0]) =>
    nameOf(reference) === "auditLog" ? testState.auditLog : testState.data,
  useMutation: (reference: Parameters<typeof getFunctionName>[0]) =>
    testState.mutations[nameOf(reference)],
}));

const data = {
  rosterSource: "database",
  members: [
    {
      id: "member-admin",
      email: "admin@example.edu",
      roles: ["faculty", "institutionalAdmin"],
      admittedAt: 1,
      status: "active",
      isYou: true,
    },
    {
      id: "member-learner",
      email: "learner@example.edu",
      roles: ["learner"],
      admittedAt: 1,
      status: "active",
      isYou: false,
    },
    {
      id: "member-away",
      email: "away@example.edu",
      roles: ["faculty"],
      admittedAt: 1,
      status: "inactive",
      isYou: false,
    },
  ],
  pending: [
    { id: "entry-1", email: "pending@example.edu", roles: ["learner"], approvedAt: 2 },
  ],
};

const membersSection = () => within(screen.getByRole("region", { name: "Members" }));
const row = (email: string) =>
  within(membersSection().getByText(email).closest("li") as HTMLElement);

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
    testState.auditLog = [];
    for (const mutation of Object.values(testState.mutations)) mutation.mockReset();
  });

  it("lists Members and pending approvals separately, marking you and deactivated Members", () => {
    testState.data = data;
    render(<MembersPage />);

    expect(screen.getByText("pending@example.edu")).toBeTruthy();
    expect(screen.getByText(/awaiting first sign-in/)).toBeTruthy();
    expect(row("admin@example.edu").getByText("Institutional Admin")).toBeTruthy();
    expect(row("admin@example.edu").getByText("(you)")).toBeTruthy();
    // No controls on your own Membership.
    expect(row("admin@example.edu").queryByRole("button")).toBeNull();
    expect(row("away@example.edu").getByText("Deactivated")).toBeTruthy();
    expect(row("away@example.edu").getByRole("button", { name: "Reactivate" })).toBeTruthy();
  });

  it("pre-approves an identity with all four roles, without implying an email is sent", async () => {
    testState.data = data;
    testState.mutations.preapprove.mockResolvedValue({
      status: "preapproved",
      rosterEntryId: "entry-2",
    });
    render(<MembersPage />);

    expect(screen.getByText(/does not send an invitation/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Approved identity (email)"), {
      target: { value: "new@example.edu" },
    });
    const form = within(screen.getByRole("region", { name: "Pre-approve an identity" }));
    for (const role of ["Learner", "Faculty", "Author", "Institutional Admin"]) {
      fireEvent.click(form.getByRole("checkbox", { name: role }));
    }
    fireEvent.click(screen.getByRole("button", { name: "Pre-approve identity" }));

    await waitFor(() =>
      expect(testState.mutations.preapprove).toHaveBeenCalledWith({
        email: "new@example.edu",
        roles: ["learner", "faculty", "author", "institutionalAdmin"],
      }),
    );
    expect((await screen.findByRole("status")).textContent).toMatch(/is pre-approved/);
  });

  it("edits a Member's roles and explains a refused change", async () => {
    testState.data = data;
    testState.mutations.setRoles.mockResolvedValue({ status: "last_admin" });
    render(<MembersPage />);

    fireEvent.click(row("learner@example.edu").getByRole("button", { name: "Edit roles" }));
    fireEvent.click(row("learner@example.edu").getByRole("checkbox", { name: "Faculty" }));
    fireEvent.click(row("learner@example.edu").getByRole("button", { name: "Save roles" }));

    await waitFor(() =>
      expect(testState.mutations.setRoles).toHaveBeenCalledWith({
        membershipId: "member-learner",
        roles: ["learner", "faculty"],
      }),
    );
    expect((await screen.findByRole("alert")).textContent).toMatch(
      /without an active Institutional Admin/,
    );
  });

  it("asks before deactivating, and states what happens to the Member's work", async () => {
    testState.data = data;
    testState.mutations.deactivate.mockResolvedValue({ status: "updated" });
    render(<MembersPage />);

    fireEvent.click(row("learner@example.edu").getByRole("button", { name: "Deactivate" }));
    const dialog = screen.getByRole("alertdialog");
    expect(dialog.textContent).toMatch(/Active Attempt ends/);
    expect(dialog.textContent).toMatch(/are kept/);
    expect(testState.mutations.deactivate).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Deactivate Member" }));

    await waitFor(() =>
      expect(testState.mutations.deactivate).toHaveBeenCalledWith({
        membershipId: "member-learner",
      }),
    );
    expect((await screen.findByRole("status")).textContent).toMatch(/Member deactivated/);
  });

  it("edits a pending approval's roles", async () => {
    testState.data = data;
    testState.mutations.setPendingApprovalRoles.mockResolvedValue({ status: "updated" });
    render(<MembersPage />);

    const pending = within(screen.getByText("pending@example.edu").closest("li") as HTMLElement);
    fireEvent.click(pending.getByRole("button", { name: "Edit roles" }));
    fireEvent.click(pending.getByRole("checkbox", { name: "Author" }));
    fireEvent.click(pending.getByRole("button", { name: "Save roles" }));

    await waitFor(() =>
      expect(testState.mutations.setPendingApprovalRoles).toHaveBeenCalledWith({
        rosterEntryId: "entry-1",
        roles: ["learner", "author"],
      }),
    );
  });

  it("shows recent changes with who made them", () => {
    testState.data = data;
    testState.auditLog = [
      {
        id: "audit-1",
        occurredAt: 3,
        action: "member_roles_changed",
        actor: "member",
        actorEmail: "admin@example.edu",
        targetEmail: "learner@example.edu",
        before: { roles: ["learner"] },
        after: { roles: ["learner", "faculty"] },
        counts: null,
      },
    ];
    render(<MembersPage />);

    const log = within(screen.getByRole("region", { name: "Recent changes" }));
    expect(log.getByText("Roles changed")).toBeTruthy();
    expect(log.getByText(/Learner → Learner, Faculty/)).toBeTruthy();
    expect(log.getByText("by admin@example.edu")).toBeTruthy();
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
