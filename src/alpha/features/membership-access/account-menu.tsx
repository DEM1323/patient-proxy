import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { button } from "../../ui/button";
import { Modal } from "../../ui/primitives";
import { AppearanceSelect } from "../../ui/appearance-select";
import {
  getAppearance,
  setAppearance,
  subscribeAppearance,
} from "../../ui/appearance";
import { inRoleOrder, roleLabels, roleDescriptions } from "./roles";
import type { MembershipSummary } from "./view";

export function AccountMenu({
  membership,
  email,
  name,
  onSignOut,
}: {
  membership: MembershipSummary;
  email?: string;
  name?: string;
  onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState(false);
  const [position, setPosition] = useState({ left: 14, bottom: 82 });
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const settingsButton = useRef<HTMLButtonElement>(null);
  const wasSettingsOpen = useRef(false);
  const appearance = useSyncExternalStore(subscribeAppearance, getAppearance);
  const initials = (
    name
      ?.trim()
      .split(/\s+/)
      .map((part) => part[0])
      .slice(0, 2)
      .join("") ||
    email?.slice(0, 2) ||
    "Me"
  ).toUpperCase();
  const closeAccount = () => {
    setOpen(false);
    trigger.current?.focus();
  };

  useEffect(() => {
    if (wasSettingsOpen.current && !settings && open)
      settingsButton.current?.focus();
    wasSettingsOpen.current = settings;
  }, [settings, open]);

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = trigger.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(360, window.innerWidth - 28);
      setPosition({
        left: Math.max(14, Math.min(rect.left, window.innerWidth - width - 14)),
        bottom: Math.max(14, window.innerHeight - rect.top + 12),
      });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    settingsButton.current?.focus();
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open || settings) return;
    const outside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        !panel.current?.contains(target) &&
        !trigger.current?.contains(target)
      )
        setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("click", outside, true);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("click", outside, true);
      document.removeEventListener("keydown", escape);
    };
  }, [open, settings]);

  return (
    <div className="mt-auto pt-4">
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls="account-popover"
        aria-haspopup="dialog"
        onClick={() => (open ? closeAccount() : setOpen(true))}
        className={`flex h-[52px] w-full items-center gap-3 rounded-md px-2 text-ui font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${open ? "bg-ceil text-ink" : "bg-surface text-ink hover:bg-ceil"}`}
      >
        <span
          aria-hidden="true"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ceil text-small font-semibold text-blue-text"
        >
          {initials}
        </span>
        <span className="flex-1 text-left">My account</span>
        <span aria-hidden="true">{open ? "⌄" : "⌃"}</span>
      </button>
      {open &&
        createPortal(
          <div
            ref={panel}
            id="account-popover"
            role="dialog"
            aria-label="My account"
            className="account-popover fixed z-30 flex w-[360px] max-w-[calc(100vw_-_28px)] flex-col gap-4 overflow-y-auto rounded-lg border border-line bg-surface p-4 text-ink shadow-xl"
            style={position}
          >
            <div className="min-w-0">
              {name && <p className="text-subheading font-bold">{name}</p>}
              {email && (
                <p
                  className={`${name ? "mt-1 text-small text-ink-2" : "text-compact font-semibold"} truncate`}
                  title={email}
                  tabIndex={0}
                >
                  {email}
                </p>
              )}
              <p className="mt-1 text-small text-ink-2">
                {membership.institution.name}
              </p>
            </div>
            <div className="border-t border-line pt-4">
              <h2 className="text-ui font-bold">Your access</h2>
              <p className="mt-1 text-small text-ink-2">
                All listed roles are active together.
              </p>
            </div>
            <dl className="space-y-4">
              {inRoleOrder(membership.roles).map((role) => (
                <div key={role}>
                  <dt className="text-compact font-semibold">
                    {roleLabels[role]}
                  </dt>
                  <dd className="mt-1 text-small text-ink-2">
                    {roleDescriptions[role]}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="border-t border-line pt-3">
              <div className="-mx-3 flex flex-col gap-1">
                <button
                  ref={settingsButton}
                  type="button"
                  className="min-h-10 rounded-md px-3 text-left text-ui font-semibold text-ink hover:bg-ceil focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
                  onClick={() => setSettings(true)}
                >
                  Settings
                </button>
                <button
                  type="button"
                  className="min-h-10 rounded-md px-3 text-left text-ui font-semibold text-ink hover:bg-ceil focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
                  onClick={onSignOut}
                >
                  Sign out
                </button>
              </div>
            </div>
            {settings && (
              <Modal
                title="Settings"
                kind="dialog"
                closeText="×"
                className="max-w-[480px] min-h-[296px] overflow-visible"
                onClose={() => setSettings(false)}
                returnFocus={settingsButton}
              >
                <AppearanceSelect value={appearance} onChange={setAppearance} />
                <p id="appearance-help" className="mt-2 text-small text-ink-2">
                  {appearance === "device"
                    ? "Matches your device’s light or dark appearance."
                    : `Always use ${appearance} mode on this device.`}
                </p>
                <div className="mt-5 flex justify-end">
                  <button
                    type="button"
                    className={button()}
                    onClick={() => setSettings(false)}
                  >
                    Done
                  </button>
                </div>
              </Modal>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
