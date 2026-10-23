import { Link } from "@tanstack/react-router";
import type { FunctionReturnType } from "convex/server";
import type { api } from "@/convex/_generated/api";
import { Badge, Empty, Page, Table, textLink } from "../../ui/primitives";
type Entry = FunctionReturnType<
  typeof api.learnerAttemptHistory.access.ownEndedAttempts
>[number];
export const debriefLabels = {
  none: "No Debrief",
  reflecting: "Reflection in progress",
  complete: "Reflection questions answered",
} as const;
export function AttemptHistoryView({ attempts }: { attempts: Entry[] }) {
  return (
    <Page
      title="Your Ended Attempts"
      description="Revisit your record and Attempt Debrief. Ended Attempts cannot change or be resumed."
    >
      <AttemptHistoryTable attempts={attempts} />
      <p className="mt-5 text-small text-ink-3">
        Each Ended Attempt and its Debrief is deleted automatically 90 days
        after it ended.
      </p>
    </Page>
  );
}
export function AttemptHistoryTable({
  attempts,
  label = "Your Attempts",
}: {
  attempts: Entry[];
  label?: string;
}) {
  if (!attempts.length)
    return (
      <Empty title="You have no Ended Attempts yet.">
        <p className="mb-4">
          After an encounter, your record and Debrief will appear here.
        </p>
        <Link to="/scenarios" className={textLink}>
          View Available Scenarios
        </Link>
      </Empty>
    );
  return (
    <Table label={label}>
      <thead>
        <tr>
          <th>Scenario</th>
          <th>Ended</th>
          <th>Debrief</th>
          <th>
            <span className="sr-only">Action</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {attempts.map((attempt) => (
          <tr key={attempt.id}>
            <td>
              <Link
                to="/attempts/$attemptId"
                params={{ attemptId: attempt.id }}
                className="font-bold hover:underline"
              >
                {attempt.scenarioTitle}
              </Link>
              <p className="text-small text-ink-3">
                Scenario Version {attempt.scenarioVersion}
              </p>
            </td>
            <td className="min-w-[140px]">
              <time dateTime={new Date(attempt.endedAt).toISOString()}>
                {new Date(attempt.endedAt).toLocaleString([], {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </time>
            </td>
            <td>
              <Badge
                tone={
                  attempt.debrief === "reflecting"
                    ? "lav"
                    : attempt.debrief === "complete"
                      ? "teal"
                      : "neutral"
                }
              >
                {debriefLabels[attempt.debrief]}
              </Badge>
              {attempt.debrief === "none" && (
                <p className="mt-1 text-small text-ink-3">
                  {attempt.endReason === "access_suspended"
                    ? "No Debrief: this Attempt ended when your access was changed."
                    : "No Debrief: this Attempt ended when you started a new one."}
                </p>
              )}
            </td>
            <td className="min-w-[150px]">
              <Link
                to="/attempts/$attemptId"
                params={{ attemptId: attempt.id }}
                hash={attempt.debrief === "none" ? undefined : "debrief-title"}
                className={textLink}
              >
                {attempt.debrief === "none"
                  ? "Open record"
                  : "Open the Attempt Debrief"}
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
