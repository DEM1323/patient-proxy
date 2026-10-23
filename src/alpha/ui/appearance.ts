export type Appearance = "light" | "dark" | "device";
export const appearanceKey = "patient-proxy:appearance";
const changeEvent = "patient-proxy:appearance-change";

export function readAppearance(): Appearance {
  try {
    const saved = window.localStorage.getItem(appearanceKey);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    /* Storage can be disabled; appearance still works for this page. */
  }
  return "device";
}

let current: Appearance = "device";
export function getAppearance() {
  return current;
}
export function applyAppearance(value: Appearance) {
  document.documentElement.dataset.theme =
    value === "device"
      ? window.matchMedia?.("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : value;
}

export function setAppearance(value: Appearance) {
  current = value;
  try {
    window.localStorage.setItem(appearanceKey, value);
  } catch {
    /* Retain this page's selection. */
  }
  applyAppearance(value);
  window.dispatchEvent(new Event(changeEvent));
}

export function subscribeAppearance(listener: () => void) {
  window.addEventListener(changeEvent, listener);
  return () => window.removeEventListener(changeEvent, listener);
}

export function initializeAppearance() {
  current = readAppearance();
  applyAppearance(current);
  const device = window.matchMedia?.("(prefers-color-scheme: dark)");
  const onDeviceChange = () => {
    if (current === "device") applyAppearance(current);
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key === appearanceKey || event.key === null) {
      current = readAppearance();
      applyAppearance(current);
      window.dispatchEvent(new Event(changeEvent));
    }
  };
  device?.addEventListener("change", onDeviceChange);
  window.addEventListener("storage", onStorage);
  return () => {
    device?.removeEventListener("change", onDeviceChange);
    window.removeEventListener("storage", onStorage);
  };
}
