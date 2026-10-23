import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { button } from "./button";

export const textLink =
  "font-bold text-blue-text hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue";

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "blue" | "teal" | "lav" | "amber";
}) {
  const tones = {
    neutral: "bg-neutral text-ink-2",
    blue: "bg-ceil text-blue-text",
    teal: "bg-teal-tint text-teal",
    lav: "bg-lav-tint text-lav-ink",
    amber: "bg-amber-tint text-amber-ink",
  };
  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-caption font-semibold leading-tight ${tones[tone]}`}
    >
      <span
        aria-hidden="true"
        className="h-1.5 w-1.5 shrink-0 rounded-full bg-current"
      />
      {children}
    </span>
  );
}

export function Page({
  title,
  description,
  children,
  action,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <main className="w-full min-w-0 px-5 py-8 md:px-10 md:py-9">
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-title font-extrabold">{title}</h1>
          {description && (
            <div className="mt-2 max-w-[80ch] text-lede text-ink-2">
              {description}
            </div>
          )}
        </div>
        {action}
      </header>
      {children}
    </main>
  );
}

export function Notice({
  children,
  tone = "info",
}: {
  children: ReactNode;
  tone?: "info" | "error" | "warning" | "success";
}) {
  const styles = {
    info: "border-ceil-2 bg-ceil",
    error: "border-red-line bg-red-tint",
    warning: "border-amber-line bg-amber-tint",
    success: "border-teal-line bg-teal-tint",
  };
  return (
    <div
      role={
        tone === "error" || tone === "warning"
          ? "alert"
          : tone === "success"
            ? "status"
            : undefined
      }
      className={`rounded-lg border px-4 py-3 text-compact ${styles[tone]}`}
    >
      {children}
    </div>
  );
}

export function Modal({
  title,
  children,
  onClose,
  sheet = false,
  returnFocus,
  kind = "alertdialog",
  className = "",
  closeText = "Close",
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  sheet?: boolean;
  returnFocus?: RefObject<HTMLElement | null>;
  kind?: "dialog" | "alertdialog";
  className?: string;
  closeText?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const node = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    const focusTarget = returnFocus?.current ?? previous;
    if (node && typeof node.showModal === "function") node.showModal();
    else node?.setAttribute("open", "");
    node?.querySelector<HTMLElement>("[data-initial-focus]")?.focus();
    return () => {
      node?.close?.();
      focusTarget?.focus();
    };
  }, [returnFocus]);
  return (
    <dialog
      ref={ref}
      role={sheet ? "dialog" : kind}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") event.stopPropagation();
      }}
      className={`proxy-dialog ${sheet ? "proxy-sheet" : ""} ${className}`}
    >
      <header className="mb-5 flex items-start justify-between gap-4">
        <h2 className="text-heading font-bold">{title}</h2>
        <button
          type="button"
          className={
            closeText === "×"
              ? "-mr-2 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-[26px] leading-none text-ink-2 hover:bg-ceil focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
              : button("quiet", "sm")
          }
          aria-label="Close dialog"
          onClick={onClose}
        >
          {closeText}
        </button>
      </header>
      {children}
    </dialog>
  );
}

export function Empty({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-line bg-surface px-6 py-12 text-center">
      <h2 className="text-heading font-bold">{title}</h2>
      {children && (
        <div className="mx-auto mt-3 max-w-xl text-ink-2">{children}</div>
      )}
    </section>
  );
}

export function Table({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-surface">
      <table
        aria-label={label}
        className="proxy-table w-full text-left text-ui"
      >
        {children}
      </table>
    </div>
  );
}
