import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { Appearance } from "./appearance";

const options: { value: Appearance; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "device", label: "Use device settings" },
];

export function AppearanceSelect({
  value,
  onChange,
}: {
  value: Appearance;
  onChange: (value: Appearance) => void;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [above, setAbove] = useState(false);
  const [menuHeight, setMenuHeight] = useState<number>();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const selected = options.findIndex((option) => option.value === value);
  useLayoutEffect(() => {
    if (open)
      document
        .getElementById(`${id}-option-${active}`)
        ?.scrollIntoView?.({ block: "nearest" });
  }, [active, id, open, menuHeight]);
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = trigger.current?.getBoundingClientRect();
      if (rect) {
        const below = window.innerHeight - rect.bottom - 24;
        const above = rect.top - 24;
        const opensAbove = below < 144 && above > below;
        setAbove(opensAbove);
        setMenuHeight(Math.max(44, opensAbove ? above : below));
      }
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [open]);
  const show = () => {
    setActive(selected);
    setOpen(true);
  };
  const choose = (index: number) => {
    onChange(options[index].value);
    setOpen(false);
    trigger.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const outside = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("click", outside);
    return () => document.removeEventListener("click", outside);
  }, [open]);

  return (
    <div ref={root} className="relative">
      <label
        id={`${id}-label`}
        className="mb-2 block text-ui font-semibold"
        onClick={() => trigger.current?.focus()}
      >
        Appearance
      </label>
      <button
        ref={trigger}
        data-initial-focus
        type="button"
        role="combobox"
        aria-labelledby={`${id}-label`}
        aria-describedby="appearance-help"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-options`}
        aria-activedescendant={open ? `${id}-option-${active}` : undefined}
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-md border border-line bg-surface px-3 text-left text-ui text-ink hover:border-ceil-2 focus-visible:border-blue focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
        onClick={() => (open ? setOpen(false) : show())}
        onBlur={(event) => {
          if (!root.current?.contains(event.relatedTarget as Node))
            setOpen(false);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape" && open) {
            event.preventDefault();
            event.stopPropagation();
            setOpen(false);
            return;
          }
          if (event.key === "Tab") {
            setOpen(false);
            return;
          }
          if (
            ["ArrowDown", "ArrowUp", "Home", "End", "Enter", " "].includes(
              event.key,
            )
          ) {
            event.preventDefault();
            if (!open) {
              show();
              return;
            }
            if (event.key === "Enter" || event.key === " ") choose(active);
            else if (event.key === "Home") setActive(0);
            else if (event.key === "End") setActive(options.length - 1);
            else
              setActive(
                (index) =>
                  (index +
                    (event.key === "ArrowDown" ? 1 : -1) +
                    options.length) %
                  options.length,
              );
            return;
          }
          if (event.key.length === 1) {
            const index = options.findIndex((option) =>
              option.label.toLowerCase().startsWith(event.key.toLowerCase()),
            );
            if (index >= 0) {
              event.preventDefault();
              setActive(index);
              setOpen(true);
            }
          }
        }}
      >
        <span>{options[selected].label}</span>
        <span
          aria-hidden="true"
          className={`flex h-5 w-5 shrink-0 items-center justify-center text-ink-2 ${open ? "rotate-180" : ""}`}
        >
          <span className="mb-1 h-2 w-2 rotate-45 border-b-2 border-r-2 border-current" />
        </span>
      </button>
      {open && (
        <ul
          id={`${id}-options`}
          role="listbox"
          aria-labelledby={`${id}-label`}
          style={{ maxHeight: menuHeight }}
          className={`absolute left-0 right-0 z-10 overflow-y-auto rounded-md border border-line bg-surface p-1 text-ui text-ink shadow-xl ${above ? "bottom-[52px]" : "top-full mt-2"}`}
        >
          {options.map((option, index) => (
            <li
              key={option.value}
              id={`${id}-option-${index}`}
              role="option"
              aria-selected={option.value === value}
              className={`flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-sm px-3 ${active === index ? "bg-ceil outline outline-1 -outline-offset-1 outline-ceil-2" : "hover:bg-sunken"}`}
              onMouseEnter={() => setActive(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(index)}
            >
              <span>{option.label}</span>
              <span
                aria-hidden="true"
                className="flex h-5 w-5 shrink-0 items-center justify-center font-semibold text-blue-text"
              >
                {option.value === value ? "✓" : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
