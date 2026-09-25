import { Link } from "@tanstack/react-router";
import type { FunctionReturnType } from "convex/server";
import { useEffect, useRef } from "react";
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

const primaryButton =
  "inline-flex rounded-md bg-primary px-5 py-3 font-semibold text-white shadow-sm hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
const secondaryButton =
  "inline-flex rounded-md border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700 hover:border-slate-400 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
const backLink =
  "text-sm font-semibold text-primary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

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
      <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-950">
        Available Scenarios
      </h1>
      <p className="mt-3 max-w-2xl leading-7 text-slate-600">
        Scenarios made available through your current Learning Groups.
      </p>
      {scenarios.length === 0 ? (
        <p className="mt-8 rounded-lg border border-slate-200 bg-white px-5 py-4 text-slate-700">
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
                className="block rounded-2xl border border-sky-200 bg-sky-50 p-6 shadow-sm hover:border-sky-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-600">
                  {scenario.setting}
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  {scenario.title}
                </h2>
                <p className="mt-2 text-slate-700">
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
      <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-secondary">
        Learner Brief · {content.setting}
      </p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950">
        {title}
      </h1>
      <p className="mt-3 text-lg text-slate-700">
        {content.patientName} · about {content.estimatedMinutes.min}–
        {content.estimatedMinutes.max} minutes
      </p>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Handoff</h2>
        <div className="mt-3 space-y-3 leading-7 text-slate-700">
          {content.handoff.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        <h2 className="mt-6 text-lg font-semibold text-slate-950">
          What you can see on arrival
        </h2>
        <ul className="mt-3 list-disc space-y-1 pl-6 text-slate-700">
          {content.visibleSigns.map((sign) => (
            <li key={sign}>{sign}</li>
          ))}
        </ul>
        <p className="mt-6 border-t border-slate-200 pt-5 text-xs leading-5 text-slate-500">
          Synthetic patient for communication practice. An Attempt is one
          continuous run: once started it cannot be paused or resumed later.
        </p>
      </section>

      {startState.step === "confirmEnding" ? (
        <section
          role="alertdialog"
          aria-labelledby="end-active-attempt-title"
          aria-describedby="end-active-attempt-description"
          className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-7 shadow-sm"
        >
          <h2
            id="end-active-attempt-title"
            className="text-xl font-semibold text-slate-950"
          >
            End your Active Attempt first?
          </h2>
          <p
            id="end-active-attempt-description"
            className="mt-3 max-w-2xl leading-7 text-slate-700"
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
            <p role="alert" className="mt-4 font-medium text-rose-700">
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
      <h1 className="text-3xl font-bold tracking-tight text-slate-950">
        This Scenario is not available to you.
      </h1>
      <p className="mt-4 leading-7 text-slate-600">
        Only Scenarios made available through your current Learning Groups can
        be started.
      </p>
      <Link to="/scenarios" className={`mt-6 inline-block ${backLink}`}>
        View Available Scenarios
      </Link>
    </main>
  );
}

const timelineLabels: Record<OwnAttempt["timeline"][number]["kind"], string> = {
  attempt_started: "Attempt started",
  attempt_ended: "Attempt ended",
};

export function AttemptView({ attempt }: { attempt: OwnAttempt }) {
  const active = attempt.status === "active";
  return (
    <main className="mx-auto max-w-4xl px-5 py-12 sm:py-16">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-secondary">
        {active ? "Active Attempt" : "Ended Attempt"} · {attempt.scenario.setting}
      </p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950">
        {attempt.scenario.title}
      </h1>
      <p className="mt-3 text-lg text-slate-700">
        {attempt.scenario.patientName} · Scenario Version{" "}
        {attempt.scenario.version}
      </p>

      {active ? (
        <p className="mt-6 rounded-lg border border-sky-200 bg-sky-50 px-5 py-4 leading-7 text-slate-700">
          This simulation is continuous. If your connection drops or this page
          reloads, it reconnects to this same Attempt. The conversation with{" "}
          {attempt.scenario.patientName} is not yet available in this alpha
          build.
        </p>
      ) : (
        <p className="mt-6 rounded-lg border border-slate-200 bg-white px-5 py-4 leading-7 text-slate-700">
          This Attempt has ended and can no longer change.
        </p>
      )}

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Timeline</h2>
        <ol className="mt-4 space-y-3">
          {attempt.timeline.map((event) => (
            <li key={event.sequence} className="flex gap-4 text-slate-700">
              <time
                dateTime={new Date(event.occurredAt).toISOString()}
                className="w-24 shrink-0 font-mono text-sm text-slate-500"
              >
                {formatTime(event.occurredAt)}
              </time>
              <span>{timelineLabels[event.kind]}</span>
            </li>
          ))}
        </ol>
      </section>

      {!active && (
        <Link to="/scenarios" className={`mt-8 inline-block ${backLink}`}>
          View Available Scenarios
        </Link>
      )}
    </main>
  );
}

export function AttemptNotFoundView() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-16">
      <h1 className="text-3xl font-bold tracking-tight text-slate-950">
        Attempt not found
      </h1>
      <p className="mt-4 leading-7 text-slate-600">
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
      <h1 className="text-3xl font-bold tracking-tight text-slate-950">
        Learner role required
      </h1>
      <p className="mt-4 leading-7 text-slate-600">
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
