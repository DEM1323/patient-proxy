import { Link } from "@tanstack/react-router";
import type { FunctionReturnType } from "convex/server";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { button } from "../../ui/button";
import { EvidenceProvider } from "../../ui/evidence";
import { Icon } from "../../ui/icon";
import {
  Badge,
  Empty,
  Modal,
  Notice,
  Page,
  textLink,
} from "../../ui/primitives";
import { useCompactRail } from "../membership-access/navigation";
type AvailableScenario = FunctionReturnType<
  typeof api.attemptStart.access.availableScenarios
>[number];
type LearnerBrief = Extract<
  FunctionReturnType<typeof api.attemptStart.access.learnerBrief>,
  { status: "available" }
>;
export type OwnAttempt = NonNullable<
  FunctionReturnType<typeof api.attemptStart.access.ownAttempt>
>;
export const primaryButton = button();
export const secondaryButton = button("secondary");
const backLink = textLink;

export function ScenarioCards({
  scenarios,
}: {
  scenarios: AvailableScenario[] | undefined;
}) {
  if (scenarios === undefined)
    return <p role="status">Loading available Scenarios…</p>;
  if (!scenarios.length)
    return (
      <Empty title="No Scenarios available">
        <p>
          No Scenarios are currently available to your Learning Groups. Contact
          your Faculty or Institutional Admin if you expected one.
        </p>
      </Empty>
    );
  return (
    <ul className="space-y-4">
      {scenarios.map((scenario) => (
        <li
          key={scenario.scenarioId}
          className="flex flex-wrap items-center gap-5 rounded-xl border border-line bg-surface p-6"
        >
          <div
            aria-hidden="true"
            className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-xl bg-lav-tint text-2xl font-extrabold text-lav-ink"
          >
            {scenario.patientName
              .split(" ")
              .map((s) => s[0])
              .join("")}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-heading font-bold">{scenario.title}</h2>
            <p className="mt-2 text-ui text-ink-2">
              {scenario.patientName}, {scenario.setting}. About{" "}
              {scenario.estimatedMinutes.min} to {scenario.estimatedMinutes.max}{" "}
              minutes.
            </p>
          </div>
          <Link
            to="/scenarios/$scenarioId"
            params={{ scenarioId: scenario.scenarioId }}
            className={primaryButton}
          >
            Read the brief
          </Link>
        </li>
      ))}
    </ul>
  );
}
export function ScenarioListView({
  scenarios,
}: {
  scenarios: AvailableScenario[];
}) {
  return (
    <Page
      title="Available Scenarios"
      description="Scenarios made available through your current Learning Groups."
    >
      <ScenarioCards scenarios={scenarios} />
    </Page>
  );
}
export type StartState =
  | { step: "idle" }
  | { step: "confirmEnding"; activeAttemptId: Id<"attempts"> }
  | { step: "starting" }
  | { step: "failed"; message: string };

export function LearnerBriefView({
  brief,
  onCancelEnding,
  onConfirmEnding,
  onStart,
  startState,
}: {
  brief: LearnerBrief;
  onCancelEnding: () => void;
  onConfirmEnding: (id: Id<"attempts">) => void;
  onStart: () => void;
  startState: StartState;
}) {
  const content = brief.brief;
  const startButton = useRef<HTMLButtonElement>(null);
  const previous = useRef(startState.step);
  useEffect(() => {
    if (
      previous.current === "confirmEnding" &&
      startState.step !== "confirmEnding"
    )
      startButton.current?.focus();
    previous.current = startState.step;
  }, [startState.step]);
  return (
    <>
      <div className="border-b border-line bg-surface px-5 py-5 text-small md:px-10">
        <Link to="/scenarios" className={textLink}>
          Available Scenarios
        </Link>
        <span className="mx-3">/</span>
        {brief.title}
      </div>
      <Page
        title={brief.title}
        description="Learner Brief. Read the handoff, then start when you are ready."
      >
        <div className="grid gap-8 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
          <section className="space-y-7">
            <div className="rounded-lg bg-lav-tint p-5">
              <h2 className="text-heading font-bold">{content.patientName}</h2>
              <dl className="mt-3 flex flex-wrap gap-8">
                <div>
                  <dt className="text-caption text-lav-ink">Setting</dt>
                  <dd className="mt-1 font-bold">{content.setting}</dd>
                </div>
                <div>
                  <dt className="text-caption text-lav-ink">Estimated time</dt>
                  <dd className="mt-1 font-bold">
                    {content.estimatedMinutes.min} to{" "}
                    {content.estimatedMinutes.max} minutes
                  </dd>
                </div>
              </dl>
            </div>
            <div>
              <h2 className="mb-3 text-subheading font-bold">Handoff</h2>
              <div className="space-y-3">
                {content.handoff.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            </div>
            <div>
              <h2 className="mb-3 text-subheading font-bold">
                What you can see on arrival
              </h2>
              <ul className="flex flex-wrap gap-2">
                {content.visibleSigns.map((sign) => (
                  <li
                    key={sign}
                    className="rounded-sm bg-ceil px-2 py-1 text-small font-semibold text-blue-text"
                  >
                    {sign}
                  </li>
                ))}
              </ul>
            </div>
          </section>
          <aside className="h-fit space-y-5 rounded-xl border border-line bg-surface p-6">
            <h2 className="text-subheading font-bold">How an Attempt works</h2>
            <ol className="list-decimal space-y-4 pl-5">
              <li>
                Talk with {content.patientName.split(" ")[0]} in your own words.
                The patient chart stays beside the conversation.
              </li>
              <li>
                Take Clinical Actions to reveal observations. Actions are
                recorded, not graded.
              </li>
              <li>
                End when ready, answer or skip two reflection questions, then
                read your feedback.
              </li>
            </ol>
            <button
              ref={startButton}
              type="button"
              disabled={startState.step === "starting"}
              className={primaryButton + " w-full"}
              onClick={onStart}
            >
              {startState.step === "starting" ? "Starting…" : "Start Attempt"}
            </button>
            {startState.step === "failed" && (
              <Notice tone="error">{startState.message}</Notice>
            )}
            <p className="text-small text-ink-3">
              An Attempt is one continuous run and cannot be paused. Unfinished
              Attempts are deleted after 30 days without activity; Ended
              Attempts after 90 days.
            </p>
          </aside>
        </div>
      </Page>
      {startState.step === "confirmEnding" && (
        <Modal title="End your Active Attempt first?" onClose={onCancelEnding}>
          <p>
            You already have an Active Attempt. Starting again ends that Attempt
            permanently, and a new Attempt begins only after it has ended.
          </p>
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <button
              autoFocus
              data-initial-focus
              type="button"
              className={secondaryButton}
              onClick={onCancelEnding}
            >
              Cancel
            </button>
            <button
              type="button"
              className={button("dangerSolid")}
              onClick={() => onConfirmEnding(startState.activeAttemptId)}
            >
              End it and start a new Attempt
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
export function ScenarioUnavailableView() {
  return (
    <Page title="This Scenario is not available to you.">
      <p>
        Only Scenarios made available through your current Learning Groups can
        be started.
      </p>
      <Link to="/scenarios" className={textLink}>
        View Available Scenarios
      </Link>
    </Page>
  );
}
export type ComposerProps = {
  draft: string;
  onDraftChange: (draft: string) => void;
  onSend: () => void;
  onRetry: () => void;
  // A send or retry command is awaiting the server.
  submitting: boolean;
  notice: string | null;
};

export type ActionPanelProps = {
  onAction: (actionKey: string) => void;
  // Retries the last action whose response was lost, with the same request.
  onRetryAction: () => void;
  submitting: boolean;
  notice: string | null;
  canRetry: boolean;
};

const lifecycleLabels = {
  attempt_started: "Attempt started",
  attempt_ended: "Attempt ended",
};

export const maxMessageLength = 2000;

export type EndingProps = {
  confirming: boolean;
  onRequestEnd: () => void;
  // Also retries after a lost response; ending is idempotent.
  onConfirmEnd: () => void;
  onCancelEnd: () => void;
  submitting: boolean;
  notice: string | null;
};

export const endingMinimum =
  "You can end after three messages, or after one message and one Clinical Action.";

export function AttemptView({
  actionPanel,
  attempt,
  composer,
  debrief,
  ending,
}: {
  actionPanel: ActionPanelProps;
  attempt: OwnAttempt;
  composer: ComposerProps;
  debrief?: ReactNode;
  ending: EndingProps;
}) {
  const active = attempt.status === "active";
  const endButton = useRef<HTMLButtonElement>(null);
  useCompactRail(active);
  const [sheet, setSheet] = useState<"chart" | "actions" | null>(null);
  const [chartTab, setChartTab] = useState<
    "handoff" | "arrival" | "observations"
  >("handoff");
  const [elapsed, setElapsed] = useState(() => Date.now() - attempt.startedAt);
  const [newReply, setNewReply] = useState(false);
  const scroll = useRef<HTMLDivElement>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);
  const workspace = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(
      () => setElapsed(Date.now() - attempt.startedAt),
      1000,
    );
    return () => clearInterval(timer);
  }, [active, attempt.startedAt]);
  useEffect(() => {
    if (!active) return;
    const update = () => {
      if (workspace.current && window.visualViewport)
        workspace.current.style.height =
          Math.max(
            200,
            window.visualViewport.height -
              (window.matchMedia("(min-width: 768px)").matches ? 0 : 52),
          ) + "px";
    };
    update();
    window.visualViewport?.addEventListener("resize", update);
    return () => window.visualViewport?.removeEventListener("resize", update);
  }, [active]);
  useEffect(() => {
    if (!active) return;
    if (pinned.current) bottom.current?.scrollIntoView?.({ block: "end" });
    else setNewReply(true);
  }, [active, attempt.timeline.length, attempt.exchange?.status]);
  const observations = attempt.timeline.filter(
    (e) => e.kind === "clinical_action" && e.action,
  );
  const firstName = attempt.scenario.patientName.split(" ")[0];
  const chart = (
    <>
      <div className="m-4 rounded-lg bg-lav-tint p-4">
        <h2 className="text-heading font-extrabold">
          {attempt.scenario.patientName}
        </h2>
        <p className="mt-2 text-small font-semibold">
          {attempt.scenario.setting}
        </p>
      </div>
      <div
        role="tablist"
        aria-label="Patient chart"
        className="flex border-b border-line px-4"
      >
        {(
          [
            ["handoff", "Handoff"],
            ["arrival", "On arrival"],
            ["observations", "Observations " + observations.length],
          ] as const
        ).map(([key, label]) => (
          <button
            role="tab"
            id={"chart-tab-" + key}
            aria-selected={chartTab === key}
            aria-controls="chart-content"
            key={key}
            type="button"
            className={
              "min-h-11 border-b-2 px-3 text-small font-semibold " +
              (chartTab === key
                ? "border-blue text-blue-text"
                : "border-transparent text-ink-2")
            }
            onClick={() => setChartTab(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <div
        id="chart-content"
        role="tabpanel"
        aria-labelledby={"chart-tab-" + chartTab}
        className="space-y-3 p-4 text-ui"
      >
        {chartTab === "handoff" ? (
          (attempt.brief?.handoff.map((p) => <p key={p}>{p}</p>) ?? (
            <p className="text-ink-2">
              The handoff is not available in this version of the connection.
              Your recorded conversation is preserved.
            </p>
          ))
        ) : chartTab === "arrival" ? (
          <ul className="list-disc space-y-2 pl-4">
            {attempt.brief?.visibleSigns.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        ) : observations.length ? (
          observations.map((e) => (
            <div
              key={e.sequence}
              className="rounded-lg border border-teal-line p-3"
            >
              <p className="font-bold text-teal">
                #{e.sequence} {e.action!.label}
              </p>
              <p className="mt-1">{e.action!.observation}</p>
            </div>
          ))
        ) : (
          <p className="text-ink-2">
            Take a Clinical Action to reveal observations.
          </p>
        )}
      </div>
    </>
  );
  if (!active)
    return (
      <EvidenceProvider
        renderRecord={(prefix) => (
          <AttemptTimeline
            prefix={prefix}
            timeline={attempt.timeline}
            patientName={attempt.scenario.patientName}
            learnerLabel="You"
          />
        )}
      >
        <main className="min-w-0">
          <header className="flex flex-wrap items-center gap-3 border-b border-line bg-surface px-5 py-5 text-small md:px-8">
            <Link to="/attempts" className={textLink}>
              Your Attempts
            </Link>
            <span>/</span>
            <h1 className="font-bold">{attempt.scenario.title}</h1>
            <Badge>Ended</Badge>
            <p className="text-ink-2 xl:ml-auto">
              {attempt.endReason === "learner_restarted"
                ? "This Attempt ended when you started a new one. "
                : attempt.endReason === "access_suspended"
                  ? "This Attempt ended when your access was changed. "
                  : "You ended this Attempt. "}
              The encounter record can no longer change.
            </p>
          </header>
          <div className="grid min-w-0 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
            <section aria-label="Attempt record" className="min-w-0 p-5 md:p-8">
              <h2 className="font-bold">Record</h2>
              <AttemptTimeline
                timeline={attempt.timeline}
                patientName={attempt.scenario.patientName}
                learnerLabel="You"
              />
            </section>
            <aside className="min-w-0 border-line bg-surface p-5 md:p-8 lg:border-l">
              {debrief}
            </aside>
          </div>
        </main>
      </EvidenceProvider>
    );
  return (
    <main
      ref={workspace}
      className="flex h-[calc(100dvh-52px)] min-h-0 flex-col md:h-dvh"
    >
      <header
        aria-hidden={ending.confirming || undefined}
        className="flex min-h-[68px] shrink-0 items-center justify-between gap-3 border-b border-line bg-surface px-4 py-3 md:px-8"
      >
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <div>
            <h1 className="text-subheading font-bold">
              {attempt.scenario.title}
            </h1>
            <p className="text-small text-ink-3">
              Scenario Version {attempt.scenario.version}
            </p>
          </div>
          <Badge tone="blue">Active</Badge>
          <span className="inline-flex items-center gap-1.5 text-small tabular-nums text-ink-2">
            <Icon name="clock" size={15} />
            Elapsed{" "}
            {String(Math.max(0, Math.floor(elapsed / 60000))).padStart(2, "0")}:
            {String(Math.max(0, Math.floor(elapsed / 1000) % 60)).padStart(
              2,
              "0",
            )}
          </span>
        </div>
        <button
          type="button"
          ref={endButton}
          className={button("danger")}
          disabled={!attempt.canEnd || ending.submitting}
          onClick={ending.onRequestEnd}
        >
          End Attempt
        </button>
      </header>
      <div className="flex min-h-0 flex-1">
        <section
          aria-label={"Conversation with " + attempt.scenario.patientName}
          className="flex min-w-0 flex-1 flex-col"
        >
          <button
            type="button"
            className="flex shrink-0 items-center justify-between bg-lav-tint px-4 py-3 text-small lg:hidden"
            onClick={() => setSheet("chart")}
          >
            <strong>{attempt.scenario.patientName}</strong>
            <span className="font-bold text-lav-ink">Open chart</span>
          </button>
          <div
            ref={scroll}
            onScroll={() => {
              const n = scroll.current;
              pinned.current =
                !n || n.scrollHeight - n.scrollTop - n.clientHeight < 80;
              if (pinned.current) setNewReply(false);
            }}
            className="min-h-0 flex-1 overflow-y-auto px-4 py-5 md:px-8"
          >
            <h2 className="sr-only">
              Conversation with {attempt.scenario.patientName}
            </h2>
            <AttemptTimeline
              timeline={attempt.timeline}
              patientName={attempt.scenario.patientName}
              learnerLabel="You"
            />
            <div aria-live="polite">
              {attempt.exchange?.status === "pending" && (
                <p className="mt-4 w-fit rounded-bubble bg-lav-tint px-4 py-2 text-small text-lav-ink">
                  {firstName} is responding…
                </p>
              )}
            </div>
            {attempt.exchange?.status === "failed" && (
              <div className="mt-4">
                <Notice tone="error">
                  <p className="font-bold">
                    {firstName} could not respond to your last message.
                  </p>
                  <p className="mt-1">
                    Retry it, or send a different message instead. Your message
                    is saved.
                  </p>
                  <button
                    type="button"
                    className={secondaryButton + " mt-3"}
                    disabled={composer.submitting}
                    onClick={composer.onRetry}
                  >
                    Retry
                  </button>
                </Notice>
              </div>
            )}
            <div ref={bottom} />
          </div>
          {newReply && (
            <button
              type="button"
              className={button("secondary", "sm") + " mx-auto mb-2"}
              onClick={() => {
                pinned.current = true;
                setNewReply(false);
                bottom.current?.scrollIntoView?.({ block: "end" });
              }}
            >
              New activity below ↓
            </button>
          )}
          <div className="shrink-0 border-t border-line bg-surface p-3 lg:border-0 lg:bg-canvas lg:px-8 lg:pb-4">
            <div className="mb-2 flex gap-2 lg:hidden">
              <button
                type="button"
                className={button("secondary", "sm")}
                onClick={() => setSheet("actions")}
              >
                Clinical Actions
              </button>
              <button
                type="button"
                className={button("quiet", "sm")}
                onClick={() => setSheet("chart")}
              >
                Chart
              </button>
            </div>
            <Composer
              composer={composer}
              patientFirstName={firstName}
              waiting={attempt.exchange?.status === "pending"}
            />
            {!attempt.canEnd && (
              <p className="mt-2 text-caption text-ink-3">{endingMinimum}</p>
            )}
            {ending.notice && <Notice tone="error">{ending.notice}</Notice>}
          </div>
        </section>
        <aside
          aria-label="Patient chart and Clinical Actions"
          className="hidden w-[392px] shrink-0 overflow-y-auto border-l border-line bg-surface lg:block"
        >
          {chart}
          <div className="border-t border-line p-4">
            <ActionPanel
              actions={attempt.clinicalActions}
              panel={actionPanel}
              timeline={attempt.timeline}
            />
          </div>
        </aside>
      </div>
      {sheet && (
        <Modal
          title={sheet === "chart" ? "Patient chart" : "Clinical Actions"}
          onClose={() => setSheet(null)}
          sheet
        >
          {sheet === "chart" ? (
            chart
          ) : (
            <ActionPanel
              actions={attempt.clinicalActions}
              panel={actionPanel}
              timeline={attempt.timeline}
            />
          )}
        </Modal>
      )}
      {ending.confirming && (
        <Modal
          title="End this Attempt?"
          returnFocus={endButton}
          onClose={() => {
            if (!ending.submitting) ending.onCancelEnd();
          }}
        >
          <p>
            You will not be able to send messages or take Clinical Actions
            afterward. Ending records only that you stopped; it is not a pass, a
            fail, or a grade.
          </p>
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <button
              autoFocus
              data-initial-focus
              type="button"
              className={secondaryButton}
              disabled={ending.submitting}
              onClick={ending.onCancelEnd}
            >
              Keep going
            </button>
            <button
              type="button"
              className={button("dangerSolid")}
              disabled={ending.submitting}
              onClick={ending.onConfirmEnd}
            >
              {ending.submitting ? "Ending…" : "End Attempt"}
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}

export function AttemptTimeline({
  learnerLabel,
  patientName,
  timeline,
  prefix = "",
}: {
  learnerLabel: string;
  patientName: string;
  timeline: OwnAttempt["timeline"];
  prefix?: string;
}) {
  return (
    <ol className="event-record mt-4 space-y-4">
      {timeline.map((event) => (
        <li
          key={event.sequence}
          id={prefix + "event-" + event.sequence}
          tabIndex={-1}
          className="grid scroll-mt-8 grid-cols-[36px_minmax(0,1fr)] gap-3 sm:grid-cols-[56px_minmax(0,1fr)]"
        >
          <div className="pt-1 text-right text-meta tabular-nums">
            <strong className="text-ink-2">#{event.sequence}</strong>
            <time
              className="mt-1 block text-ink-3"
              dateTime={new Date(event.occurredAt).toISOString()}
            >
              {formatTime(event.occurredAt)}
            </time>
          </div>
          <div className="min-w-0">
            {event.kind === "learner_message" ||
            event.kind === "patient_message" ? (
              <Message
                speaker={
                  event.kind === "learner_message" ? learnerLabel : patientName
                }
                fromLearner={event.kind === "learner_message"}
                text={event.text ?? ""}
              />
            ) : event.kind === "clinical_action" && event.action ? (
              <div className="flex max-w-[640px] gap-3 rounded-lg border border-teal-line bg-surface px-3.5 py-3">
                <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-md bg-teal-tint text-teal">
                  <Icon name="pulse" size={16} />
                </span>
                <div>
                  <p className="text-label font-bold text-teal">
                    <span className="sr-only">Clinical Action · </span>
                    {event.action.label}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-ui">
                    {event.action.observation}
                  </p>
                </div>
              </div>
            ) : (
              <p className="py-1 text-caption text-ink-3">
                {lifecycleLabels[event.kind as keyof typeof lifecycleLabels]}
                {event.text && ". " + event.text}
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
function Message({
  fromLearner,
  speaker,
  text,
}: {
  fromLearner: boolean;
  speaker: string;
  text: string;
}) {
  return (
    <div className={fromLearner ? "ml-auto max-w-[560px]" : "max-w-[560px]"}>
      <p
        className={
          "mb-1 text-caption font-bold " +
          (fromLearner ? "text-right text-blue-text" : "text-lav-ink")
        }
      >
        {speaker}
      </p>
      <p
        className={
          "whitespace-pre-wrap break-words rounded-bubble px-[15px] py-[11px] text-body " +
          (fromLearner
            ? "rounded-br-sm bg-blue font-bold text-on-blue"
            : "rounded-bl-sm bg-lav-tint")
        }
      >
        {text}
      </p>
    </div>
  );
}
function ActionPanel({
  actions,
  panel,
  timeline,
}: {
  actions: OwnAttempt["clinicalActions"];
  panel: ActionPanelProps;
  timeline: OwnAttempt["timeline"];
}) {
  return (
    <section aria-label="Clinical Actions">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-ui font-bold">Clinical Actions</h2>
        <p className="text-small text-ink-3">Recorded, not graded</p>
      </div>
      <div className="space-y-2">
        {actions.map((action) => (
          <button
            aria-label={action.label}
            type="button"
            key={action.key}
            disabled={panel.submitting}
            onClick={() => panel.onAction(action.key)}
            className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border border-line bg-surface px-3 py-2.5 text-left text-compact font-semibold hover:border-blue focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue disabled:cursor-wait"
          >
            <span>{action.label}</span>
            {timeline.some((e) => e.action?.key === action.key) && (
              <span
                title="Recorded. You can perform this action again."
                className="rounded-full bg-teal-tint px-2 py-1 text-meta font-bold text-teal"
              >
                Done
              </span>
            )}
          </button>
        ))}
      </div>
      {panel.notice && (
        <div className="mt-3">
          <Notice tone={panel.canRetry ? "warning" : "error"}>
            {panel.notice}
            {panel.canRetry && (
              <button
                className={secondaryButton + " mt-3"}
                type="button"
                disabled={panel.submitting}
                onClick={panel.onRetryAction}
              >
                Retry action
              </button>
            )}
          </Notice>
        </div>
      )}
    </section>
  );
}
function Composer({
  composer,
  patientFirstName,
  waiting,
}: {
  composer: ComposerProps;
  patientFirstName: string;
  waiting: boolean;
}) {
  const canSend =
    !waiting && !composer.submitting && composer.draft.trim().length > 0;
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (canSend) composer.onSend();
      }}
    >
      {composer.notice && (
        <div className="mb-3">
          <Notice tone="warning">{composer.notice}</Notice>
        </div>
      )}
      <label className="sr-only" htmlFor="attempt-message">
        Message to {patientFirstName}
      </label>
      <div className="flex items-end gap-3 rounded-xl border border-ceil-2 bg-surface p-3 shadow-sm">
        <textarea
          id="attempt-message"
          rows={2}
          maxLength={maxMessageLength}
          value={composer.draft}
          placeholder={"Speak to " + patientFirstName + "…"}
          onChange={(e) => composer.onDraftChange(e.target.value)}
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              !e.shiftKey &&
              !e.nativeEvent.isComposing
            ) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          className="max-h-36 min-h-10 w-full resize-none bg-transparent p-1 text-ui outline-none focus-visible:ring-1 focus-visible:ring-blue"
        />
        <button
          aria-label={composer.submitting ? "Sending…" : "Send"}
          type="submit"
          className={primaryButton + " !h-[42px] !w-[42px] !px-0"}
          disabled={!canSend}
        >
          <Icon name="send" size={20} />
        </button>
      </div>
      <p className="mt-2 hidden text-caption text-ink-3 lg:block">
        Press Enter to send. Shift + Enter adds a new line.{" "}
        {waiting &&
          "You can send your next message after " +
            patientFirstName +
            " responds."}
      </p>
    </form>
  );
}
export function AttemptNotFoundView() {
  return (
    <Page title="Attempt not found">
      <p>You can open only your own Attempts.</p>
      <Link to="/scenarios" className={backLink}>
        View Available Scenarios
      </Link>
    </Page>
  );
}
export function LearnerRoleRequiredView() {
  return (
    <Page title="Learner role required">
      <p>Your Pilot Membership does not include the Learner role.</p>
      <Link to="/" className={backLink}>
        Home
      </Link>
    </Page>
  );
}
function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}
