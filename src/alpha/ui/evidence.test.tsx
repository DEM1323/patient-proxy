// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EvidenceLink, EvidenceProvider } from "./evidence";

describe("feedback evidence navigation", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });
  it("keeps a normal anchor on desktop and opens a focused contextual record on phone", async () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    render(
      <EvidenceProvider
        renderRecord={(prefix) => (
          <ol>
            <li id={`${prefix}event-12`} tabIndex={-1}>
              Recorded learner message
            </li>
          </ol>
        )}
      >
        <EvidenceLink sequence={12} />
      </EvidenceProvider>,
    );
    const link = screen.getByRole("link", { name: "event 12" });
    expect(link.getAttribute("href")).toBe("#event-12");
    fireEvent.click(link);
    const sheet = screen.getByRole("dialog", { name: "Record, event #12" });
    expect(within(sheet).getByText("Recorded learner message")).toBeTruthy();
    await waitFor(() =>
      expect(document.activeElement?.id).toBe("evidence-event-12"),
    );
    fireEvent.click(
      within(sheet).getByRole("button", { name: "Close dialog" }),
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
