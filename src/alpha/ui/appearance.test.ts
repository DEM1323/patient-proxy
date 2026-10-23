// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  appearanceKey,
  getAppearance,
  initializeAppearance,
  setAppearance,
} from "./appearance";

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  delete document.documentElement.dataset.theme;
});

describe("Appearance preference", () => {
  function device(initial: boolean) {
    let matches = initial;
    let listener: (() => void) | undefined;
    vi.stubGlobal("matchMedia", () => ({
      get matches() {
        return matches;
      },
      addEventListener: (_: string, fn: () => void) => {
        listener = fn;
      },
      removeEventListener: () => {
        listener = undefined;
      },
    }));
    return (dark: boolean) => {
      matches = dark;
      listener?.();
    };
  }

  it("follows device changes only while Use device settings is selected", () => {
    const changeDevice = device(true);
    const stop = initializeAppearance();
    expect(document.documentElement.dataset.theme).toBe("dark");
    setAppearance("light");
    changeDevice(false);
    changeDevice(true);
    expect(document.documentElement.dataset.theme).toBe("light");
    setAppearance("device");
    expect(document.documentElement.dataset.theme).toBe("dark");
    changeDevice(false);
    expect(document.documentElement.dataset.theme).toBe("light");
    stop();
  });

  it("restores saved choices on startup and syncs other tabs", () => {
    device(false);
    localStorage.setItem(appearanceKey, "dark");
    const stop = initializeAppearance();
    expect(getAppearance()).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    localStorage.setItem(appearanceKey, "light");
    window.dispatchEvent(new StorageEvent("storage", { key: appearanceKey }));
    expect(getAppearance()).toBe("light");
    setAppearance("device");
    expect(localStorage.getItem(appearanceKey)).toBe("device");
    stop();
  });

  it("still applies a choice when local storage is unavailable", () => {
    device(false);
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const stop = initializeAppearance();
    setAppearance("dark");
    expect(getAppearance()).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    stop();
  });
});
