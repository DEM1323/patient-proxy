// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { getFunctionName } from "convex/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DebriefEditorPage } from ".";

// TEST FIXTURE ONLY: stands in for a generated draft.
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
  version: 1,
  publication: null as unknown,
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
      version: testState.version,
      debrief: testState.debrief,
      source: testState.debrief ? "author" : "none",
      publication: testState.publication,
      template: {
        notice: "Generated draft, edit before use. Fixture notice.",
        content: templateContent,
      },
    };
  },
  useMutation: () => testState.publish,
}));

const publishButton = (version = 2) =>
  screen.getByRole("button", { name: `Publish as version ${version}` });

describe("Author debrief editor", () => {
  afterEach(() => {
    cleanup();
    testState.roles = ["author"];
    testState.reads.length = 0;
    testState.debrief = null;
    testState.version = 1;
    testState.publication = null;
    testState.publish.mockReset();
  });

  it("fills in the labeled template, and publishes it unchanged only with an explicit adoption", async () => {
    testState.publish.mockResolvedValue({ status: "published", version: 2 });
    render(<DebriefEditorPage scenarioId="scenario-1" />);
    fireEvent.click(screen.getByRole("button", { name: "Generate a draft" }));

    expect(screen.getByRole("alert").textContent).toContain("Generated draft, edit before use.");
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
      expectedVersion: 1,
      debrief: templateContent,
      adoptTemplate: true,
    });
    expect((await screen.findByRole("status")).textContent).toContain("Published version 2");
  });

  it("publishes an edited template as the Author's own wording without asking for adoption", async () => {
    testState.publish.mockResolvedValue({ status: "published", version: 2 });
    render(<DebriefEditorPage scenarioId="scenario-1" />);
    fireEvent.click(screen.getByRole("button", { name: "Generate a draft" }));
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
    fireEvent.click(screen.getByRole("button", { name: "Generate a draft" }));
    fireEvent.click(screen.getByRole("button", { name: "Keep my entries" }));
    expect((screen.getByLabelText("Feedback guidance") as HTMLTextAreaElement).value).toBe(
      "Fixture: the Author's guidance.",
    );

    fireEvent.click(screen.getByRole("button", { name: "Generate a draft" }));
    fireEvent.click(screen.getByRole("button", { name: "Replace with draft" }));
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

  it("keeps the draft when another Author publishes, pauses publishing, and loads the new version only on request", () => {
    const { rerender } = render(<DebriefEditorPage scenarioId="scenario-1" />);
    fireEvent.change(screen.getByLabelText("Feedback guidance"), {
      target: { value: "Fixture: my unsaved guidance." },
    });

    testState.version = 2;
    testState.debrief = { feedbackGuidance: "Fixture: the other Author's guidance." };
    rerender(<DebriefEditorPage scenarioId="scenario-1" />);

    const guidance = () => screen.getByLabelText("Feedback guidance") as HTMLTextAreaElement;
    expect(guidance().value).toBe("Fixture: my unsaved guidance.");
    expect(screen.getByRole("alert").textContent).toContain(
      "Another Author published version 2 while you were editing",
    );
    expect((publishButton(3) as HTMLButtonElement).disabled).toBe(true);
    expect(testState.publish).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Load version 2 and discard my edits" }));
    expect(guidance().value).toBe("Fixture: the other Author's guidance.");
    expect(screen.queryByRole("alert")).toBeNull();
    expect((publishButton(3) as HTMLButtonElement).disabled).toBe(false);
  });

  it("publishes from the version it loaded, and from the newer one after loading it", async () => {
    testState.publish.mockResolvedValue({ status: "published", version: 3 });
    const { rerender } = render(<DebriefEditorPage scenarioId="scenario-1" />);
    testState.version = 2;
    rerender(<DebriefEditorPage scenarioId="scenario-1" />);
    fireEvent.click(screen.getByRole("button", { name: "Load version 2 and discard my edits" }));
    fireEvent.change(screen.getByLabelText("Feedback guidance"), {
      target: { value: "Fixture guidance." },
    });
    fireEvent.click(publishButton(3));
    await waitFor(() => expect(testState.publish).toHaveBeenCalledTimes(1));
    expect(testState.publish.mock.calls[0][0]).toMatchObject({ expectedVersion: 2 });
  });

  it("keeps the draft and explains a publication refused as stale", async () => {
    testState.publish.mockResolvedValue({ status: "stale_version" });
    render(<DebriefEditorPage scenarioId="scenario-1" />);
    fireEvent.change(screen.getByLabelText("Feedback guidance"), {
      target: { value: "Fixture: my guidance." },
    });
    fireEvent.click(publishButton());
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Another Author published a newer version, so nothing was published",
    );
    expect((screen.getByLabelText("Feedback guidance") as HTMLTextAreaElement).value).toBe(
      "Fixture: my guidance.",
    );
  });

  it("names the publisher only as you or another Author", () => {
    testState.version = 2;
    testState.publication = { byYou: false, publishedAt: Date.UTC(2026, 9, 30) };
    render(<DebriefEditorPage scenarioId="scenario-1" />);
    expect(screen.getByText(/Published by another Author on/)).toBeTruthy();
    cleanup();
    testState.publication = { byYou: true, publishedAt: Date.UTC(2026, 9, 30) };
    render(<DebriefEditorPage scenarioId="scenario-1" />);
    expect(screen.getByText(/Published by you on/)).toBeTruthy();
  });

  it("shows other roles nothing and reads nothing", () => {
    testState.roles = ["learner", "faculty", "institutionalAdmin"];
    render(<DebriefEditorPage scenarioId="scenario-1" />);
    expect(screen.getByText("Author role required")).toBeTruthy();
    expect(testState.reads).toEqual([]);
  });
});
