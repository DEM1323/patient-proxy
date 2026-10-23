import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type MouseEvent,
} from "react";
import { Modal } from "./primitives";

const EvidenceContext = createContext<((sequence: number) => void) | null>(
  null,
);

export function EvidenceProvider({
  children,
  renderRecord,
}: {
  children: ReactNode;
  renderRecord: (prefix: string) => ReactNode;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  return (
    <EvidenceContext.Provider value={setSelected}>
      {children}
      {selected !== null && (
        <Modal
          title={`Record, event #${selected}`}
          sheet
          onClose={() => setSelected(null)}
        >
          <EvidenceRecord selected={selected}>
            {renderRecord("evidence-")}
          </EvidenceRecord>
        </Modal>
      )}
    </EvidenceContext.Provider>
  );
}

function EvidenceRecord({
  selected,
  children,
}: {
  selected: number;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const timer = setTimeout(() => {
      const target = ref.current?.querySelector<HTMLElement>(
        `#evidence-event-${selected}`,
      );
      target?.classList.add("evidence-selected");
      target?.scrollIntoView?.({ block: "center" });
      target?.focus({ preventScroll: true });
    }, 0);
    return () => clearTimeout(timer);
  }, [selected]);
  return <div ref={ref}>{children}</div>;
}

export function EvidenceLink({ sequence }: { sequence: number }) {
  const open = useContext(EvidenceContext);
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (open && window.matchMedia("(max-width: 1023px)").matches) {
      event.preventDefault();
      open(sequence);
    } else
      document
        .getElementById(`event-${sequence}`)
        ?.focus({ preventScroll: true });
  };
  return (
    <a
      href={`#event-${sequence}`}
      aria-label={`event ${sequence}`}
      onClick={onClick}
      className="mx-0.5 inline-flex rounded-sm bg-ceil px-1.5 py-0.5 text-meta font-bold text-blue-text hover:bg-ceil-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue"
    >
      #{sequence}
    </a>
  );
}
