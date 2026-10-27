// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { getFunctionName } from "convex/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DebriefEditorPage } from ".";

// TEST FIXTURE ONLY: stands in for a generated template.
const templateContent = {
  feedbackGuidance: "Fixture guidance.",
  communicationCriteria: [
    { key: "fixture_c1", label: "Fixture criterion", description: "Fixture description." },
  ],
  reflectionPrompts: { interpretation: "Fixture interpretation?", planning: "Fixture planning?" },
};

const testState = vi.hoisted(() => ({
  roles: ["author"] as string[],
  reads: [] as string[],
  debrief: null as unknown,
  publish: vi.fn(),
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
  useQuery: (reference: Parameters<typeof getFunctionName>[0]) => {
    testState.reads.push(getFunctionName(reference));
    return {
      id: "scenario-1",
      title: "Initial PACU Assessment",
      patientName: "Elena Ruiz",
      setting: "PACU",
      version: 1,
      debrief: testState.debrief,
      source: testState.debrief ? "author" : "none",
      publication: null,
      template: {
        notice: "Generated template, edit before use. Fixture notice.",
        content: templateContent,
      },
    };
  },
  useMutation: () => testState.publish,
}));

const publishButton = () => screen.getByRole("button", { name: "Publish as version 2" });

describe("Author debrief editor", () => {
  afterEach(() => {
    cleanup();
    testState.roles = ["author"];
    testState.reads.length = 0;
    testState.debrief = null;
    testState.publish.mockReset();
  });

  it("fills in the labeled template, and publishes it unchanged only with an explicit adoption", async () => {
    testState.publish.mockResolvedValue({ status: "published", version: 2 });
    render(<DebriefEditorPage scenarioId="scenario-1" />);
    fireEvent.click(screen.getByRole("button", { name: "Generate template" }));

    expect(screen.getByRole("alert").textContent).toContain("Generated template, edit before use.");
    expect((screen.getByLabelText("Feedback guidance") as HTMLTextAreaElement).value).toBe(
      "Fixture guidance.",
    );
    expect((screen.getByLabelText("Criterion 1") as HTMLInputElement).value).toBe(
      "Fixture criterion",
    );
    expect((publishButton() as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByRole("checkbox", { name: /adopt it unchanged/ }));
    fireEvent.click(publishButton());
    await waitFor(() => expect(testState.publish).toHaveBeenCalledTimes(1));
    expect(testState.publish).toHaveBeenCalledWith({
      scenarioId: "scenario-1",
      debrief: templateContent,
      adoptTemplate: true,
    });
    expect((await screen.findByRole("status")).textContent).toContain("Published version 2");
  });

  it("publishes an edited template as the Author's own wording without asking for adoption", async () => {
    testState.publish.mockResolvedValue({ status: "published", version: 2 });
    render(<DebriefEditorPage scenarioId="scenario-1" />);
    fireEvent.click(screen.getByRole("button", { name: "Generate template" }));
    fireEvent.change(screen.getByLabelText("Planning prompt"), {
      target: { value: "Fixture: edited planning?" },
    });

    expect(screen.queryByRole("checkbox", { name: /adopt it unchanged/ })).toBeNull();
    fireEvent.click(publishButton());
    await waitFor(() => expect(testState.publish).toHaveBeenCalledTimes(1));
    expect(testState.publish.mock.calls[0][0]).toMatchObject({
      adoptTemplate: false,
      debrief: {
        reflectionPrompts: {
          interpretation: "Fixture interpretation?",
          planning: "Fixture: edited planning?",
        },
      },
    });
  });

  it("asks before Generate replaces existing entries", () => {
    testState.debrief = { feedbackGuidance: "Fixture: the Author's guidance." };
    render(<DebriefEditorPage scenarioId="scenario-1" />);
    fireEvent.click(screen.getByRole("button", { name: "Generate template" }));
    fireEvent.click(screen.getByRole("button", { name: "Keep my entries" }));
    expect((screen.getByLabelText("Feedback guidance") as HTMLTextAreaElement).value).toBe(
      "Fixture: the Author's guidance.",
    );

    fireEvent.click(screen.getByRole("button", { name: "Generate template" }));
    fireEvent.click(screen.getByRole("button", { name: "Replace with template" }));
    expect((screen.getByLabelText("Feedback guidance") as HTMLTextAreaElement).value).toBe(
      "Fixture guidance.",
    );
  });

  it("explains a rejected publication", async () => {
    testState.publish.mockResolvedValue({ status: "invalid" });
    render(<DebriefEditorPage scenarioId="scenario-1" />);
    fireEvent.click(screen.getByRole("button", { name: "Add criterion" }));
    fireEvent.change(screen.getByLabelText("Criterion 1"), { target: { value: "Fixture" } });
    fireEvent.click(publishButton());
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Every criterion needs a name and description",
    );
  });

  it("shows other roles nothing and reads nothing", () => {
    testState.roles = ["learner", "faculty", "institutionalAdmin"];
    render(<DebriefEditorPage scenarioId="scenario-1" />);
    expect(screen.getByText("Author role required")).toBeTruthy();
    expect(testState.reads).toEqual([]);
  });
});
