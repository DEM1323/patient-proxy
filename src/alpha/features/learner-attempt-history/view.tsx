import { Link } from "@tanstack/react-router";
import type { FunctionReturnType } from "convex/server";
import type { api } from "@/convex/_generated/api";

type Entry = FunctionReturnType<
  typeof api.learnerAttemptHistory.access.ownEndedAttempts
>[number];

const link =
  "font-semibold text-primary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

const debriefLabels: Record<Entry["debrief"], string> = {
  none: "No Debrief: this Attempt ended when you started a new one.",
  reflecting: "Debrief: answer or skip the reflection questions to see your feedback.",
  // Reflection progress only; feedback status is shown on the Attempt page.
  complete: "Debrief: reflection questions answered. Open it to see your feedback.",
};

// Records are view-only: there is deliberately no transcript or download
// action, and Active Attempts are not listed as resumable history.
export function AttemptHistoryView({ attempts }: { attempts: Entry[] }) {
  return (
    <main className="mx-auto max-w-4xl px-5 py-12 sm:py-16">
      <Link to="/" className={`text-sm ${link}`}>
        ← Home
      </Link>
      <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-950">
        Your Ended Attempts
      </h1>
      <p className="mt-3 max-w-2xl leading-7 text-slate-600">
        Reopen an Ended Attempt to review its record and Attempt Debrief. Ended
        Attempts cannot change or be resumed.
      </p>
      {attempts.length === 0 ? (
        <p className="mt-8 rounded-lg border border-slate-200 bg-white px-5 py-4 text-slate-700">
          You have no Ended Attempts yet.{" "}
          <Link to="/scenarios" className={link}>
            View Available Scenarios
          </Link>
        </p>
      ) : (
        <ul className="mt-8 grid gap-4">
          {attempts.map((attempt) => (
            <li
              key={attempt.id}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                <Link
                  to="/attempts/$attemptId"
                  params={{ attemptId: attempt.id }}
                  className="hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  {attempt.scenarioTitle}
                </Link>
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Scenario Version {attempt.scenarioVersion} · ended{" "}
                <time dateTime={new Date(attempt.endedAt).toISOString()}>
                  {new Date(attempt.endedAt).toLocaleString()}
                </time>
              </p>
              <p className="mt-3 text-slate-700">
                {attempt.debrief === "none" && attempt.endReason === "access_suspended"
                  ? "No Debrief: this Attempt ended when your access was changed."
                  : debriefLabels[attempt.debrief]}
              </p>
              {attempt.debrief !== "none" && (
                <Link
                  to="/attempts/$attemptId"
                  params={{ attemptId: attempt.id }}
                  hash="debrief-title"
                  className={`mt-3 inline-block ${link}`}
                >
                  Open the Attempt Debrief
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
