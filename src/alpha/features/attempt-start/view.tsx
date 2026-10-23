import { Link } from "@tanstack/react-router";
import type { FunctionReturnType } from "convex/server";
import { useEffect, useRef, type ReactNode } from "react";
import type { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

type AvailableScenario = FunctionReturnType<
  typeof api.attemptStart.access.availableScenarios
>[number];
type LearnerBrief = Extract<
  FunctionReturnType<typeof api.attemptStart.access.learnerBrief>,
  { status: "available" }
>;
type OwnAttempt = NonNullable<
  FunctionReturnType<typeof api.attemptStart.access.ownAttempt>
>;

export const primaryButton =
  "inline-flex rounded-md bg-blue px-5 py-3 font-semibold text-white shadow-sm hover:bg-harbor disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue";
export const secondaryButton =
  "inline-flex rounded-md border border-line bg-surface px-4 py-2 font-semibold text-ink-2 hover:border-ceil-2 hover:bg-neutral disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue";
const backLink =
  "text-sm font-semibold text-blue-text hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue";

export function ScenarioListView({
  scenarios,
}: {
  scenarios: AvailableScenario[];
}) {
  return (
    <main className="mx-auto max-w-4xl px-5 py-12 sm:py-16">
      <Link to="/" className={backLink}>
        ← Home
      </Link>
      <h1 className="mt-4 text-4xl font-bold tracking-tight text-ink">
        Available Scenarios
      </h1>
      <p className="mt-3 max-w-2xl leading-7 text-ink-2">
        Scenarios made available through your current Learning Groups.
      </p>
      {scenarios.length === 0 ? (
        <p className="mt-8 rounded-lg border border-line bg-surface px-5 py-4 text-ink-2">
          No Scenarios are currently available to your Learning Groups. Contact
          your Faculty if you expected one.
        </p>
      ) : (
        <ul className="mt-8 grid gap-4">
          {scenarios.map((scenario) => (
            <li key={scenario.scenarioId}>
              <Link
                to="/scenarios/$scenarioId"
                params={{ scenarioId: scenario.scenarioId }}
                className="block rounded-2xl border border-ceil-2 bg-ceil p-6 shadow-sm hover:border-ceil-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
              >
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-ink-2">
                  {scenario.setting}
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
                  {scenario.title}
                </h2>
                <p className="mt-2 text-ink-2">
                  {scenario.patientName} · about {scenario.estimatedMinutes.min}–
                  {scenario.estimatedMinutes.max} minutes
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
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
  onConfirmEnding: (activeAttemptId: Id<"attempts">) => void;
  onStart: () => void;
  startState: StartState;
}) {
  const { brief: content, title } = brief;
  const starting = startState.step === "starting";
  const startButton = useRef<HTMLButtonElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  const previousStep = useRef(startState.step);

  // The confirmation replaces the Start button, so move focus explicitly:
  // into the confirmation (its least destructive action), and back on cancel.
  useEffect(() => {
    if (startState.step === "confirmEnding") {
      cancelButton.current?.focus();
    } else if (previousStep.current === "confirmEnding") {
      startButton.current?.focus();
    }
    previousStep.current = startState.step;
  }, [startState.step]);

  return (
    <main className="mx-auto max-w-4xl px-5 py-12 sm:py-16">
      <Link to="/scenarios" className={backLink}>
        ← Available Scenarios
      </Link>
      <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-blue-text">
        Learner Brief · {content.setting}
      </p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-ink">
        {title}
      </h1>
      <p className="mt-3 text-lg text-ink-2">
        {content.patientName} · about {content.estimatedMinutes.min}–
        {content.estimatedMinutes.max} minutes
      </p>

      <section className="mt-8 rounded-2xl border border-line bg-surface p-7 shadow-sm">
        <h2 className="text-lg font-semibold text-ink">Handoff</h2>
        <div className="mt-3 space-y-3 leading-7 text-ink-2">
          {content.handoff.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        <h2 className="mt-6 text-lg font-semibold text-ink">
          What you can see on arrival
        </h2>
        <ul className="mt-3 list-disc space-y-1 pl-6 text-ink-2">
          {content.visibleSigns.map((sign) => (
            <li key={sign}>{sign}</li>
          ))}
        </ul>
        <p className="mt-6 border-t border-line pt-5 text-xs leading-5 text-ink-3">
          Synthetic patient for communication practice. An Attempt is one
          continuous run: once started it cannot be paused or resumed later.
          An unfinished Attempt is deleted after 30 days without activity; an
          Ended Attempt 90 days after it ends.
        </p>
      </section>

      {startState.step === "confirmEnding" ? (
        <section
          role="alertdialog"
          aria-labelledby="end-active-attempt-title"
          aria-describedby="end-active-attempt-description"
          className="mt-8 rounded-2xl border border-amber-line bg-amber-tint p-7 shadow-sm"
        >
          <h2
            id="end-active-attempt-title"
            className="text-xl font-semibold text-ink"
          >
            End your Active Attempt first?
          </h2>
          <p
            id="end-active-attempt-description"
            className="mt-3 max-w-2xl leading-7 text-ink-2"
          >
            You already have an Active Attempt. Starting again ends that Attempt
            permanently, and a new Attempt begins only after it has ended.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              className={primaryButton}
              onClick={() => onConfirmEnding(startState.activeAttemptId)}
            >
              End it and start a new Attempt
            </button>
            <button
              ref={cancelButton}
              type="button"
              className={secondaryButton}
              onClick={onCancelEnding}
            >
              Cancel
            </button>
          </div>
        </section>
      ) : (
        <div className="mt-8">
          <button
            ref={startButton}
            type="button"
            className={primaryButton}
            disabled={starting}
            onClick={onStart}
          >
            {starting ? "Starting…" : "Start Attempt"}
          </button>
          {startState.step === "failed" && (
            <p role="alert" className="mt-4 font-medium text-red">
              {startState.message}
            </p>
          )}
        </div>
      )}
    </main>
  );
}

export function ScenarioUnavailableView() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-16">
      <h1 className="text-3xl font-bold tracking-tight text-ink">
        This Scenario is not available to you.
      </h1>
      <p className="mt-4 leading-7 text-ink-2">
        Only Scenarios made available through your current Learning Groups can
        be started.
      </p>
      <Link to="/scenarios" className={`mt-6 inline-block ${backLink}`}>
        View Available Scenarios
      </Link>
    </main>
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
  // The Attempt Debrief for an Ended Attempt, owned by attempt-debrief.
  debrief?: ReactNode;
  ending: EndingProps;
}) {
  const active = attempt.status === "active";
  const patientName = attempt.scenario.patientName;
  const firstName = patientName.split(" ")[0];
  const { exchange } = attempt;
  return (
    <main className="mx-auto max-w-4xl px-5 py-12 sm:py-16">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-text">
        {active ? "Active Attempt" : "Ended Attempt"} · {attempt.scenario.setting}
      </p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-ink">
        {attempt.scenario.title}
      </h1>
      <p className="mt-3 text-lg text-ink-2">
        {patientName} · Scenario Version {attempt.scenario.version}
      </p>

      {active ? (
        <p className="mt-6 rounded-lg border border-ceil-2 bg-ceil px-5 py-4 leading-7 text-ink-2">
          This simulation is continuous. If your connection drops or this page
          reloads, it reconnects to this same Attempt and its recorded
          conversation.
        </p>
      ) : (
        <p className="mt-6 rounded-lg border border-line bg-surface px-5 py-4 leading-7 text-ink-2">
          {attempt.endReason === "learner_ended"
            ? "You ended this Attempt. "
            : attempt.endReason === "learner_restarted"
              ? "This Attempt ended when you started a new one. "
              : attempt.endReason === "access_suspended"
                ? "This Attempt ended when your access was changed by an Institutional Admin. "
                : ""}
          It can no longer change.
        </p>
      )}

      <section
        aria-labelledby="conversation-title"
        className="mt-8 rounded-2xl border border-line bg-surface p-7 shadow-sm"
      >
        <h2 id="conversation-title" className="text-lg font-semibold text-ink">
          Conversation with {patientName}
        </h2>
        <AttemptTimeline
          timeline={attempt.timeline}
          patientName={patientName}
          learnerLabel="You"
        />
        <div aria-live="polite">
          {exchange?.status === "pending" && (
            <p className="mt-4 max-w-[80%] rounded-2xl rounded-bl-sm bg-neutral px-4 py-3 italic text-ink-2">
              {firstName} is responding…
            </p>
          )}
        </div>
        {exchange?.status === "failed" && (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-red-line bg-red-tint px-5 py-4"
          >
            <p className="font-medium text-red">
              {firstName} could not respond to your last message.
            </p>
            <p className="mt-1 text-sm text-red">
              Retry it, or send a different message instead.
            </p>
            <button
              type="button"
              className={`mt-3 ${secondaryButton}`}
              disabled={composer.submitting}
              onClick={composer.onRetry}
            >
              Retry
            </button>
          </div>
        )}
      </section>

      {active && (
        <Composer
          composer={composer}
          patientFirstName={firstName}
          waiting={exchange?.status === "pending"}
        />
      )}

      {active && attempt.clinicalActions.length > 0 && (
        <ActionPanel actions={attempt.clinicalActions} panel={actionPanel} />
      )}

      {active && <EndPanel canEnd={attempt.canEnd} ending={ending} />}

      {!active && debrief}

      {!active && (
        <Link to="/scenarios" className={`mt-8 inline-block ${backLink}`}>
          View Available Scenarios
        </Link>
      )}
    </main>
  );
}

/**
 * The recorded timeline, in sequence order. Each entry has an `event-N`
 * anchor that Formative Feedback evidence links to. Shared with
 * attempt-review, where the Learner is named rather than "You".
 */
export function AttemptTimeline({
  learnerLabel,
  patientName,
  timeline,
}: {
  learnerLabel: string;
  patientName: string;
  timeline: OwnAttempt["timeline"];
}) {
  return (
    <ol className="mt-4 space-y-4">
      {timeline.map((event) => (
        <li
          key={event.sequence}
          id={`event-${event.sequence}`}
          className="scroll-mt-6"
        >
          {event.kind === "learner_message" ||
          event.kind === "patient_message" ? (
            <Message
              speaker={event.kind === "learner_message" ? learnerLabel : patientName}
              fromLearner={event.kind === "learner_message"}
              text={event.text ?? ""}
              occurredAt={event.occurredAt}
            />
          ) : event.kind === "clinical_action" ? (
            event.action && (
              <ActionEntry
                label={event.action.label}
                observation={event.action.observation}
                occurredAt={event.occurredAt}
              />
            )
          ) : (
            <p className="text-center text-sm text-ink-3">
              {lifecycleLabels[event.kind]} ·{" "}
              <time dateTime={new Date(event.occurredAt).toISOString()}>
                {formatTime(event.occurredAt)}
              </time>
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}

function EndPanel({
  canEnd,
  ending,
}: {
  canEnd: boolean;
  ending: EndingProps;
}) {
  const endButton = useRef<HTMLButtonElement>(null);
  const keepGoingButton = useRef<HTMLButtonElement>(null);
  const wasConfirming = useRef(ending.confirming);

  // The confirmation replaces the End button, so move focus explicitly: into
  // the confirmation (its least destructive action), and back on cancel.
  useEffect(() => {
    if (ending.confirming) {
      keepGoingButton.current?.focus();
    } else if (wasConfirming.current) {
      endButton.current?.focus();
    }
    wasConfirming.current = ending.confirming;
  }, [ending.confirming]);

  return (
    <section
      aria-labelledby="end-attempt-title"
      className="mt-8 rounded-2xl border border-line bg-surface p-7 shadow-sm"
    >
      <h2 id="end-attempt-title" className="text-lg font-semibold text-ink">
        End the Attempt
      </h2>
      {ending.confirming ? (
        <div
          role="alertdialog"
          aria-labelledby="confirm-end-title"
          aria-describedby="confirm-end-description"
          className="mt-4 rounded-lg border border-amber-line bg-amber-tint p-5"
        >
          <p id="confirm-end-title" className="font-semibold text-ink">
            End this Attempt?
          </p>
          <p id="confirm-end-description" className="mt-2 leading-7 text-ink-2">
            You will not be able to send messages or take Clinical Actions
            afterward. Ending records only that you stopped; it is not a pass,
            a fail, or a grade.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              className={primaryButton}
              disabled={ending.submitting}
              onClick={ending.onConfirmEnd}
            >
              {ending.submitting ? "Ending…" : "End Attempt"}
            </button>
            <button
              ref={keepGoingButton}
              type="button"
              className={secondaryButton}
              disabled={ending.submitting}
              onClick={ending.onCancelEnd}
            >
              Keep going
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3">
          <p className="text-sm leading-6 text-ink-2">
            {canEnd
              ? "End when you are ready. Missing actions do not prevent ending."
              : endingMinimum}
          </p>
          <button
            ref={endButton}
            type="button"
            className={`mt-3 ${secondaryButton}`}
            disabled={!canEnd}
            onClick={ending.onRequestEnd}
          >
            End Attempt
          </button>
        </div>
      )}
      {ending.notice && (
        <p role="alert" className="mt-4 font-medium text-red">
          {ending.notice}
        </p>
      )}
    </section>
  );
}

function ActionEntry({
  label,
  observation,
  occurredAt,
}: {
  label: string;
  observation: string;
  occurredAt: number;
}) {
  return (
    <div className="rounded-lg border border-amber-line bg-amber-tint px-4 py-3">
      <p className="text-xs font-semibold text-amber-ink">
        Clinical Action · {label} ·{" "}
        <time dateTime={new Date(occurredAt).toISOString()}>
          {formatTime(occurredAt)}
        </time>
      </p>
      <p className="mt-1 leading-7 text-ink">{observation}</p>
    </div>
  );
}

function ActionPanel({
  actions,
  panel,
}: {
  actions: OwnAttempt["clinicalActions"];
  panel: ActionPanelProps;
}) {
  return (
    <section
      aria-labelledby="clinical-actions-title"
      className="mt-8 rounded-2xl border border-line bg-surface p-7 shadow-sm"
    >
      <h2
        id="clinical-actions-title"
        className="text-lg font-semibold text-ink"
      >
        Clinical Actions
      </h2>
      <p className="mt-2 text-sm leading-6 text-ink-2">
        Choosing an action records that you performed it and shows what you
        observe. It does not assess your technique.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {actions.map((action) => (
          <button
            key={action.key}
            type="button"
            className={`${secondaryButton} justify-start text-left`}
            disabled={panel.submitting}
            onClick={() => panel.onAction(action.key)}
          >
            {action.label}
          </button>
        ))}
      </div>
      {panel.notice && (
        <div role="alert" className="mt-4">
          <p className="font-medium text-red">{panel.notice}</p>
          {panel.canRetry && (
            <button
              type="button"
              className={`mt-3 ${secondaryButton}`}
              disabled={panel.submitting}
              onClick={panel.onRetryAction}
            >
              Retry action
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function Message({
  fromLearner,
  occurredAt,
  speaker,
  text,
}: {
  fromLearner: boolean;
  occurredAt: number;
  speaker: string;
  text: string;
}) {
  return (
    <div className={fromLearner ? "ml-auto max-w-[80%]" : "max-w-[80%]"}>
      <p
        className={`text-xs font-semibold text-ink-3 ${fromLearner ? "text-right" : ""}`}
      >
        {speaker} ·{" "}
        <time dateTime={new Date(occurredAt).toISOString()}>
          {formatTime(occurredAt)}
        </time>
      </p>
      <p
        className={`mt-1 whitespace-pre-wrap rounded-2xl px-4 py-3 leading-7 ${
          fromLearner
            ? "rounded-br-sm bg-blue text-white"
            : "rounded-bl-sm bg-neutral text-ink"
        }`}
      >
        {text}
      </p>
    </div>
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
  const disabled = waiting || composer.submitting;
  const canSend = !disabled && composer.draft.trim().length > 0;
  return (
    <form
      className="mt-6"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSend) {
          composer.onSend();
        }
      }}
    >
      <label
        htmlFor="attempt-message"
        className="block font-semibold text-ink"
      >
        Message to {patientFirstName}
      </label>
      <textarea
        id="attempt-message"
        rows={3}
        maxLength={maxMessageLength}
        value={composer.draft}
        onChange={(event) => composer.onDraftChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            event.currentTarget.form?.requestSubmit();
          }
        }}
        className="mt-2 block w-full rounded-lg border border-line px-4 py-3 leading-7 text-ink focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue"
      />
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <button type="submit" className={primaryButton} disabled={!canSend}>
          {composer.submitting ? "Sending…" : "Send"}
        </button>
        {waiting && (
          <p className="text-sm text-ink-2">
            You can send your next message after {patientFirstName} responds.
          </p>
        )}
      </div>
      {composer.notice && (
        <p role="alert" className="mt-4 font-medium text-red">
          {composer.notice}
        </p>
      )}
    </form>
  );
}

export function AttemptNotFoundView() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-16">
      <h1 className="text-3xl font-bold tracking-tight text-ink">
        Attempt not found
      </h1>
      <p className="mt-4 leading-7 text-ink-2">
        You can open only your own Attempts.
      </p>
      <Link to="/scenarios" className={`mt-6 inline-block ${backLink}`}>
        View Available Scenarios
      </Link>
    </main>
  );
}

export function LearnerRoleRequiredView() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-16">
      <h1 className="text-3xl font-bold tracking-tight text-ink">
        Learner role required
      </h1>
      <p className="mt-4 leading-7 text-ink-2">
        Your Pilot Membership does not include the Learner role.
      </p>
      <Link to="/" className={`mt-6 inline-block ${backLink}`}>
        ← Home
      </Link>
    </main>
  );
}

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}
