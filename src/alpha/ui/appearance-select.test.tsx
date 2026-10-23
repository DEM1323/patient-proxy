// @vitest-environment jsdom
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { AppearanceSelect } from "./appearance-select";
import type { Appearance } from "./appearance";

afterEach(cleanup);

function Subject() {
  const [value, setValue] = useState<Appearance>("device");
  return <AppearanceSelect value={value} onChange={setValue} />;
}

it("opens with the saved choice selected and applies pointer selections", () => {
  render(<Subject />);
  const field = screen.getByRole("combobox", { name: "Appearance" });
  fireEvent.click(field);
  expect(
    screen
      .getByRole("option", { name: "Use device settings" })
      .getAttribute("aria-selected"),
  ).toBe("true");
  fireEvent.click(screen.getByRole("option", { name: "Dark" }));
  expect(field.textContent).toBe("Dark");
  expect(field.getAttribute("aria-expanded")).toBe("false");
  expect(document.activeElement).toBe(field);
});

it("supports keyboard navigation, typeahead, and Escape without dismissing Settings", () => {
  const closeParent = vi.fn();
  render(
    <div onKeyDown={closeParent}>
      <Subject />
    </div>,
  );
  const field = screen.getByRole("combobox", { name: "Appearance" });
  field.focus();
  fireEvent.keyDown(field, { key: "Enter" });
  fireEvent.keyDown(field, { key: "Home" });
  fireEvent.keyDown(field, { key: "ArrowDown" });
  fireEvent.keyDown(field, { key: "Enter" });
  expect(field.textContent).toBe("Dark");
  fireEvent.keyDown(field, { key: "u" });
  fireEvent.keyDown(field, { key: "Enter" });
  expect(field.textContent).toBe("Use device settings");
  fireEvent.click(field);
  closeParent.mockClear();
  fireEvent.keyDown(field, { key: "Escape" });
  expect(screen.queryByRole("listbox")).toBeNull();
  expect(closeParent).not.toHaveBeenCalled();
  expect(field.textContent).toBe("Use device settings");
});

it("dismisses on Tab and outside click without changing the preference", () => {
  render(
    <>
      <Subject />
      <button>Done</button>
    </>,
  );
  const field = screen.getByRole("combobox", { name: "Appearance" });
  fireEvent.click(field);
  fireEvent.keyDown(field, { key: "Tab" });
  expect(screen.queryByRole("listbox")).toBeNull();
  fireEvent.click(field);
  fireEvent.click(screen.getByRole("button", { name: "Done" }));
  expect(screen.queryByRole("listbox")).toBeNull();
  expect(field.textContent).toBe("Use device settings");
});
