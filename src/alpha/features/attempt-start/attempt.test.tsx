// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { getFunctionName } from "convex/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AttemptPage } from ".";

const testState = vi.hoisted(() => ({
  attempt: null as unknown,
  send: vi.fn(),
  retry: vi.fn(),
  takeAction: vi.fn(),
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
  useNavigate: () => vi.fn(),
}));

vi.mock("convex/react", () => ({
  useQuery: () => testState.attempt,
  useMutation: (reference: Parameters<typeof getFunctionName>[0]) =>
    ({
      "attemptInteraction/access:retry": testState.retry,
      "attemptInteraction/access:takeAction": testState.takeAction,
    })[getFunctionName(reference)] ?? testState.send,
}));

function attempt(overrides: Record<string, unknown> = {}) {
  return {
    id: "attempt-id",
    status: "active",
    startedAt: 1,
    endedAt: null,
    scenario: {
      title: "Initial PACU Assessment",
      patientName: "Elena Ruiz",
      setting: "Post-anesthesia care unit (PACU)",
      version: 1,
    },
    timeline: [
      { sequence: 1, kind: "attempt_started", occurredAt: 1 },
      {
        sequence: 2,
        kind: "learner_message",
        occurredAt: 2,
        text: "Can you tell me where you are?",
      },
      {
        sequence: 3,
        kind: "patient_message",
        occurredAt: 3,
        text: "I'm not sure...",
      },
    ],
    exchange: null,
    clinicalActions: [
      { key: "vital_signs", label: "Obtain all vital signs" },
      { key: "assess_pain", label: "Assess pain" },
    ],
    ...overrides,
  };
}

const messageBox = () => screen.getByRole("textbox", { name: "Message to Elena" });
const sendButton = () => screen.getByRole("button", { name: "Send" });

describe("Attempt conversation", () => {
  afterEach(() => {
    cleanup();
    testState.send.mockReset();
    testState.retry.mockReset();
    testState.takeAction.mockReset();
  });

  it("shows recorded messages and sends a new message with a request id", async () => {
    testState.attempt = attempt();
    testState.send.mockResolvedValue({ status: "pending" });
    render(<AttemptPage attemptId="attempt-id" />);

    expect(screen.getByText("Can you tell me where you are?")).toBeTruthy();
    expect(screen.getByText("I'm not sure...")).toBeTruthy();
    expect((sendButton() as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(messageBox(), { target: { value: "  You're in recovery.  " } });
    fireEvent.click(sendButton());

    await waitFor(() => expect((messageBox() as HTMLTextAreaElement).value).toBe(""));
    expect(testState.send).toHaveBeenCalledWith({
      attemptId: "attempt-id",
      clientRequestId: expect.any(String),
      text: "You're in recovery.",
    });
  });

  it("resends an unacknowledged message with the same request id", async () => {
    testState.attempt = attempt();
    testState.send
      .mockRejectedValueOnce(new Error("Connection lost"))
      .mockResolvedValueOnce({ status: "pending" });
    render(<AttemptPage attemptId="attempt-id" />);

    fireEvent.change(messageBox(), { target: { value: "Hello, Elena." } });
    fireEvent.click(sendButton());
    expect((await screen.findByRole("alert")).textContent).toMatch(
      /could not be sent/,
    );
    expect((messageBox() as HTMLTextAreaElement).value).toBe("Hello, Elena.");

    fireEvent.click(sendButton());
    await waitFor(() => expect(testState.send).toHaveBeenCalledTimes(2));
    const [first, second] = testState.send.mock.calls.map(
      ([args]) => args.clientRequestId,
    );
    expect(second).toBe(first);
  });

  it("waits while Elena is responding and offers Retry after a failure", async () => {
    testState.attempt = attempt({
      exchange: { clientRequestId: "request-1", status: "pending" },
    });
    const { rerender } = render(<AttemptPage attemptId="attempt-id" />);

    expect(screen.getByText("Elena is responding…")).toBeTruthy();
    fireEvent.change(messageBox(), { target: { value: "Are you there?" } });
    expect((sendButton() as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();

    testState.attempt = attempt({
      exchange: { clientRequestId: "request-1", status: "failed" },
    });
    testState.retry.mockResolvedValue({ status: "pending" });
    rerender(<AttemptPage attemptId="attempt-id" />);

    expect(screen.getByRole("alert").textContent).toMatch(
      /could not respond to your last message/,
    );
    // A deliberate new message stays possible.
    expect((sendButton() as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() =>
      expect(testState.retry).toHaveBeenCalledWith({
        attemptId: "attempt-id",
        clientRequestId: "request-1",
      }),
    );
    expect(testState.send).not.toHaveBeenCalled();
  });

  it("records a Clinical Action and retries a lost response with the same request id", async () => {
    testState.attempt = attempt();
    testState.takeAction
      .mockRejectedValueOnce(new Error("Connection lost"))
      .mockResolvedValueOnce({ status: "recorded" });
    render(<AttemptPage attemptId="attempt-id" />);

    fireEvent.click(screen.getByRole("button", { name: "Obtain all vital signs" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(
      /could not be confirmed/,
    );
    fireEvent.click(screen.getByRole("button", { name: "Retry action" }));

    await waitFor(() => expect(testState.takeAction).toHaveBeenCalledTimes(2));
    const [first, retried] = testState.takeAction.mock.calls.map(([args]) => args);
    expect(first).toEqual({
      attemptId: "attempt-id",
      clientRequestId: expect.any(String),
      actionKey: "vital_signs",
    });
    expect(retried).toEqual(first);
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());

    // Choosing the action again is an intentional repeat with a new id.
    testState.takeAction.mockResolvedValueOnce({ status: "recorded" });
    fireEvent.click(screen.getByRole("button", { name: "Obtain all vital signs" }));
    await waitFor(() => expect(testState.takeAction).toHaveBeenCalledTimes(3));
    expect(testState.takeAction.mock.calls[2][0].clientRequestId).not.toBe(
      first.clientRequestId,
    );
  });

  it("shows revealed observations in the timeline", () => {
    testState.attempt = attempt({
      timeline: [
        { sequence: 1, kind: "attempt_started", occurredAt: 1 },
        {
          sequence: 2,
          kind: "clinical_action",
          occurredAt: 2,
          action: {
            key: "vital_signs",
            label: "Obtain all vital signs",
            observation: "BP 124/84, HR 92, RR 8, SpO2 93% on room air, temperature 98.4 F.",
          },
        },
      ],
    });
    render(<AttemptPage attemptId="attempt-id" />);

    expect(screen.getByText(/Clinical Action · Obtain all vital signs/)).toBeTruthy();
    expect(screen.getByText(/SpO2 93% on room air/)).toBeTruthy();
  });

  it("shows an Ended Attempt's messages without a composer", () => {
    testState.attempt = attempt({ status: "ended", endedAt: 4 });
    render(<AttemptPage attemptId="attempt-id" />);

    expect(screen.getByText("I'm not sure...")).toBeTruthy();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByRole("button", { name: /send|retry|resume/i })).toBeNull();
    expect(screen.queryByRole("button", { name: "Obtain all vital signs" })).toBeNull();
  });
});
