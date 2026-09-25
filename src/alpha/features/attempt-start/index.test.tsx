// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LearnerBriefPage } from ".";

const testState = vi.hoisted(() => ({
  brief: null as unknown,
  start: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock("../membership-access", () => ({
  MembershipGate: ({
    children,
  }: {
    children: (member: unknown) => React.ReactNode;
  }) =>
    children({
      membership: {
        id: "membership-id",
        institution: { id: "institution-id", key: "umb", name: "UMB" },
        roles: ["learner"],
      },
      signOut: () => undefined,
    }),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
  useNavigate: () => testState.navigate,
}));

vi.mock("convex/react", () => ({
  useQuery: () => testState.brief,
  useMutation: () => testState.start,
}));

const brief = {
  status: "available",
  scenarioId: "scenario-id",
  title: "Initial PACU Assessment",
  brief: {
    patientName: "Elena Ruiz",
    setting: "Post-anesthesia care unit (PACU)",
    estimatedMinutes: { min: 8, max: 12 },
    handoff: ["Elena Ruiz has just arrived in the PACU."],
    visibleSigns: ["Responds to her name"],
  },
};

describe("Learner Brief start", () => {
  afterEach(() => {
    cleanup();
    testState.start.mockReset();
    testState.navigate.mockReset();
  });

  it("starts a new Attempt directly when none is active", async () => {
    testState.brief = { ...brief, activeAttemptId: null };
    testState.start.mockResolvedValue({ status: "started", attemptId: "new-id" });
    render(<LearnerBriefPage scenarioId="scenario-id" />);

    fireEvent.click(screen.getByRole("button", { name: "Start Attempt" }));

    await waitFor(() =>
      expect(testState.navigate).toHaveBeenCalledWith({
        to: "/attempts/$attemptId",
        params: { attemptId: "new-id" },
      }),
    );
    expect(testState.start).toHaveBeenCalledWith({
      scenarioId: "scenario-id",
      endActiveAttemptId: undefined,
    });
  });

  it("requires confirming the end of the Active Attempt and offers no resume", async () => {
    testState.brief = { ...brief, activeAttemptId: "active-id" };
    testState.start.mockResolvedValue({ status: "started", attemptId: "new-id" });
    render(<LearnerBriefPage scenarioId="scenario-id" />);

    expect(screen.queryByRole("button", { name: /resume|continue/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /resume|continue/i })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Start Attempt" }));

    expect(screen.getByRole("alertdialog")).toBeTruthy();
    expect(testState.start).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Cancel" }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Start Attempt" }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Start Attempt" }));
    fireEvent.click(
      screen.getByRole("button", { name: "End it and start a new Attempt" }),
    );

    await waitFor(() =>
      expect(testState.start).toHaveBeenCalledWith({
        scenarioId: "scenario-id",
        endActiveAttemptId: "active-id",
      }),
    );
    expect(testState.navigate).toHaveBeenCalledTimes(1);
  });

  it("asks for confirmation when the server reports an Attempt started elsewhere", async () => {
    // The brief loaded before another tab started an Attempt.
    testState.brief = { ...brief, activeAttemptId: null };
    testState.start
      .mockResolvedValueOnce({
        status: "active_attempt_exists",
        activeAttemptId: "other-tab-id",
      })
      .mockResolvedValueOnce({ status: "started", attemptId: "new-id" });
    render(<LearnerBriefPage scenarioId="scenario-id" />);

    fireEvent.click(screen.getByRole("button", { name: "Start Attempt" }));

    expect(await screen.findByRole("alertdialog")).toBeTruthy();
    expect(testState.navigate).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole("button", { name: "End it and start a new Attempt" }),
    );

    await waitFor(() =>
      expect(testState.start).toHaveBeenLastCalledWith({
        scenarioId: "scenario-id",
        endActiveAttemptId: "other-tab-id",
      }),
    );
    expect(testState.navigate).toHaveBeenCalledTimes(1);
  });
});
