// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReviewDetailPage, ReviewListPage } from ".";

const testState = vi.hoisted(() => ({
  roles: ["faculty"] as string[],
  result: undefined as unknown,
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
  Link: ({
    children,
    params,
    to,
  }: {
    children: React.ReactNode;
    params?: { attemptId: string };
    to: string;
  }) => <a href={to.replace("$attemptId", params?.attemptId ?? "")}>{children}</a>,
}));

vi.mock("convex/react", () => ({
  useQuery: () => testState.result,
}));

const review = {
  learnerEmail: "learner@example.edu",
  attempt: {
    id: "attempt-id",
    startedAt: 1,
    endedAt: 5,
    endReason: "learner_ended",
    scenario: {
      title: "Initial PACU Assessment",
      patientName: "Elena Ruiz",
      setting: "Post-anesthesia care unit (PACU)",
      version: 2,
    },
    timeline: [
      { sequence: 1, kind: "attempt_started", occurredAt: 1 },
      { sequence: 2, kind: "learner_message", occurredAt: 2, text: "Hi Elena." },
      {
        sequence: 3,
        kind: "clinical_action",
        occurredAt: 3,
        action: { key: "hand_hygiene", label: "Perform hand hygiene", observation: "Hand hygiene recorded." },
      },
      { sequence: 4, kind: "attempt_ended", occurredAt: 5 },
    ],
  },
  debrief: {
    status: "recorded",
    prompts: [
      {
        key: "interpretation",
        text: "What was happening?",
        responses: [{ response: "answer", text: "Her breathing was slow.", submittedAt: 6 }],
      },
      { key: "planning", text: "What would you change?", responses: [] },
    ],
    feedback: {
      status: "completed",
      sections: {
        summary: [{ text: "You greeted Elena.", evidence: [2] }],
        strengths: [],
        priorities: [{ text: "Reassurance was not observed in this Attempt.", evidence: [], observed: false }],
        criteria: null,
        suggestions: ["Tell Elena where she is.", "Explain each action aloud."],
      },
    },
  },
};

describe("Attempt review", () => {
  afterEach(() => {
    cleanup();
    testState.roles = ["faculty"];
  });

  it("lists authorized Ended Attempts with links to their review", () => {
    testState.result = [
      {
        id: "attempt-id",
        learnerEmail: "learner@example.edu",
        scenarioTitle: "Initial PACU Assessment",
        scenarioVersion: 2,
        endedAt: 5,
        endReason: "learner_ended",
        debrief: "reflecting",
      },
    ];
    render(<ReviewListPage />);

    expect(
      screen
        .getByRole("link", { name: "learner@example.edu · Initial PACU Assessment" })
        .getAttribute("href"),
    ).toBe("/review/attempt-id");
    expect(screen.getByText(/Reflection in progress/)).toBeTruthy();
  });

  it("shows evidence, Learner Reflections, and feedback read-only", () => {
    testState.roles = ["institutionalAdmin"];
    testState.result = review;
    render(<ReviewDetailPage attemptId="attempt-id" />);

    expect(screen.getByText("Hi Elena.")).toBeTruthy();
    expect(screen.getByText("Learner ·", { exact: false })).toBeTruthy();
    expect(screen.getByText("Hand hygiene recorded.")).toBeTruthy();
    expect(screen.getByText("Her breathing was slow.")).toBeTruthy();
    expect(screen.getByText("No response yet.")).toBeTruthy();
    expect(screen.getByText("Tell Elena where she is.")).toBeTruthy();
    expect(
      screen.getByText("Instructors have not set Communication Criteria for this Scenario yet."),
    ).toBeTruthy();
    expect(screen.queryByText(/Your instructors/)).toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("reveals nothing when the Attempt is outside the reviewer's scope", () => {
    testState.result = null;
    render(<ReviewDetailPage attemptId="attempt-id" />);

    expect(screen.getByText("This Attempt is not available for your review")).toBeTruthy();
    expect(screen.queryByText("Hi Elena.")).toBeNull();
  });

  it("does not render review pages for a Learner-only Membership", () => {
    testState.roles = ["learner"];
    testState.result = review;
    render(<ReviewDetailPage attemptId="attempt-id" />);

    expect(screen.getByText("Faculty or Institutional Admin role required")).toBeTruthy();
    expect(screen.queryByText("Hi Elena.")).toBeNull();
  });
});
