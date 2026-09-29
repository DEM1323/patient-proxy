// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AttemptHistoryPage } from ".";

const testState = vi.hoisted(() => ({ attempts: undefined as unknown }));

vi.mock("../attempt-start", () => ({
  LearnerGate: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    hash,
    params,
    to,
  }: {
    children: React.ReactNode;
    hash?: string;
    params?: { attemptId: string };
    to: string;
  }) => (
    <a href={`${to.replace("$attemptId", params?.attemptId ?? "")}${hash ? `#${hash}` : ""}`}>
      {children}
    </a>
  ),
}));

vi.mock("convex/react", () => ({
  useQuery: () => testState.attempts,
}));

describe("Attempt history", () => {
  afterEach(cleanup);

  it("links each Ended Attempt to its record and Debrief, with no download or resume", () => {
    testState.attempts = [
      {
        id: "restarted-id",
        scenarioTitle: "Initial PACU Assessment",
        scenarioVersion: 2,
        startedAt: 1,
        endedAt: 3,
        endReason: "learner_restarted",
        debrief: "none",
      },
      {
        id: "ended-id",
        scenarioTitle: "Initial PACU Assessment",
        scenarioVersion: 2,
        startedAt: 1,
        endedAt: 2,
        endReason: "learner_ended",
        debrief: "complete",
      },
    ];
    render(<AttemptHistoryPage />);

    const records = screen.getAllByRole("link", { name: "Initial PACU Assessment" });
    expect(records.map((link) => link.getAttribute("href"))).toEqual([
      "/attempts/restarted-id",
      "/attempts/ended-id",
    ]);
    // Only the deliberately ended Attempt has a Debrief.
    expect(
      screen
        .getAllByRole("link", { name: "Open the Attempt Debrief" })
        .map((link) => link.getAttribute("href")),
    ).toEqual(["/attempts/ended-id#debrief-title"]);
    expect(screen.getByText(/No Debrief/)).toBeTruthy();
    expect(screen.getByText(/reflection questions answered/)).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: /download|export|transcript|resume|continue/i }),
    ).toBeNull();
    expect(
      screen.queryByRole("link", { name: /download|export|transcript|resume|continue/i }),
    ).toBeNull();
  });

  it("explains an empty history", () => {
    testState.attempts = [];
    render(<AttemptHistoryPage />);

    expect(screen.getByText(/You have no Ended Attempts yet/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "View Available Scenarios" })).toBeTruthy();
  });
});
