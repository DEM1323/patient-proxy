// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { getFunctionName } from "convex/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AttemptDebrief } from ".";

const testState = vi.hoisted(() => ({
  debrief: null as unknown,
  reflect: vi.fn(),
  retryFeedback: vi.fn(),
}));

vi.mock("convex/react", () => ({
  useQuery: () => testState.debrief,
  useMutation: (reference: Parameters<typeof getFunctionName>[0]) =>
    getFunctionName(reference) === "attemptDebrief/access:reflect"
      ? testState.reflect
      : testState.retryFeedback,
}));

const prompts = (interpretation: unknown[] = [], planning: unknown[] = []) => [
  { key: "interpretation", text: "What was happening?", responses: interpretation },
  { key: "planning", text: "What would you change?", responses: planning },
];
const skipped = { response: "skip", text: null, submittedAt: 1 };

const sections = {
  summary: [{ text: "You greeted Elena and recorded vital signs.", evidence: [2, 4] }],
  strengths: [{ text: "You introduced yourself.", evidence: [2] }],
  priorities: [
    {
      text: "Escalation of concern was not observed in this Attempt.",
      evidence: [],
      observed: false,
    },
  ],
  criteria: null,
  suggestions: ["Tell Elena where she is.", "Say aloud what concerns you."],
};

describe("Attempt Debrief", () => {
  afterEach(() => {
    cleanup();
    testState.reflect.mockReset();
    testState.retryFeedback.mockReset();
  });

  it("asks both Reflection Prompts before any feedback and appends an answer", async () => {
    testState.debrief = { status: "reflecting", prompts: prompts(), feedback: null };
    testState.reflect.mockResolvedValue({ status: "recorded" });
    render(<AttemptDebrief attemptId="attempt-id" />);

    expect(screen.getByText("What was happening?")).toBeTruthy();
    expect(screen.getByText("What would you change?")).toBeTruthy();
    expect(screen.queryByText("Formative Feedback")).toBeNull();

    const [interpretationBox] = screen.getAllByRole("textbox", { name: "Your reflection" });
    fireEvent.change(interpretationBox, { target: { value: " Her breathing was slow. " } });
    fireEvent.click(screen.getAllByRole("button", { name: "Submit reflection" })[0]);

    await waitFor(() =>
      expect(testState.reflect).toHaveBeenCalledWith({
        attemptId: "attempt-id",
        clientRequestId: expect.any(String),
        prompt: "interpretation",
        response: "answer",
        text: "Her breathing was slow.",
      }),
    );
    await waitFor(() => expect((interpretationBox as HTMLTextAreaElement).value).toBe(""));
  });

  it("skips explicitly and retries a lost skip with the same request id", async () => {
    testState.debrief = { status: "reflecting", prompts: prompts(), feedback: null };
    testState.reflect
      .mockRejectedValueOnce(new Error("Connection lost"))
      .mockResolvedValueOnce({ status: "recorded" });
    render(<AttemptDebrief attemptId="attempt-id" />);

    fireEvent.click(screen.getAllByRole("button", { name: "Skip this question" })[1]);
    expect((await screen.findByRole("alert")).textContent).toMatch(/could not be saved/);
    fireEvent.click(screen.getAllByRole("button", { name: "Skip this question" })[1]);

    await waitFor(() => expect(testState.reflect).toHaveBeenCalledTimes(2));
    const [first, retried] = testState.reflect.mock.calls.map(([args]) => args);
    expect(first).toMatchObject({ prompt: "planning", response: "skip" });
    expect(retried).toEqual(first);
  });

  it("reveals evidence-linked feedback after both prompts, with no grade", () => {
    testState.debrief = {
      status: "revealed",
      prompts: prompts([{ response: "answer", text: "Slow breathing.", submittedAt: 1 }], [skipped]),
      feedback: { status: "completed", sections },
    };
    render(<AttemptDebrief attemptId="attempt-id" />);

    expect(screen.getByText("Formative Feedback")).toBeTruthy();
    expect(screen.getByText("Slow breathing.")).toBeTruthy();
    expect(screen.getByText("Skipped", { exact: false })).toBeTruthy();
    // Skip is only offered before a prompt has any response.
    expect(screen.queryByRole("button", { name: "Skip this question" })).toBeNull();
    expect(
      screen.getAllByRole("link", { name: "event 4" })[0].getAttribute("href"),
    ).toBe("#event-4");
    expect(screen.getByText("Not observed")).toBeTruthy();
    expect(
      screen.getByText(/have not set Communication Criteria for this Scenario yet/),
    ).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/passed|failed|score/i);
  });

  it("offers a retry when feedback generation failed", async () => {
    testState.debrief = {
      status: "revealed",
      prompts: prompts([skipped], [skipped]),
      feedback: { status: "failed" },
    };
    testState.retryFeedback.mockResolvedValue({ status: "pending" });
    render(<AttemptDebrief attemptId="attempt-id" />);

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() =>
      expect(testState.retryFeedback).toHaveBeenCalledWith({ attemptId: "attempt-id" }),
    );
  });

  it("waits for generated Reflection Prompts and offers a retry if they fail", async () => {
    testState.debrief = { status: "preparing", failed: false };
    const { rerender } = render(<AttemptDebrief attemptId="attempt-id" />);
    expect(screen.getByText("Preparing your reflection questions…")).toBeTruthy();
    expect(screen.queryByRole("textbox")).toBeNull();

    testState.debrief = { status: "preparing", failed: true };
    testState.retryFeedback.mockResolvedValue({ status: "pending" });
    rerender(<AttemptDebrief attemptId="attempt-id" />);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() =>
      expect(testState.retryFeedback).toHaveBeenCalledWith({ attemptId: "attempt-id" }),
    );
  });

  it("explains that a restarted Attempt has no Debrief", () => {
    testState.debrief = { status: "not_available", reason: "restarted" };
    render(<AttemptDebrief attemptId="attempt-id" />);

    expect(screen.getByText(/ended when you started a new one/)).toBeTruthy();
    expect(screen.queryByRole("textbox")).toBeNull();
  });
});
