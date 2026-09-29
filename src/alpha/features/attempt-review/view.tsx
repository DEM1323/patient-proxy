import { Link } from "@tanstack/react-router";
import type { FunctionReturnType } from "convex/server";
import type { api } from "@/convex/_generated/api";
import { FeedbackSections } from "../attempt-debrief/view";
import { AttemptTimeline } from "../attempt-start/view";

type Entry = FunctionReturnType<
  typeof api.attemptReview.access.reviewableAttempts
>[number];
type Detail = NonNullable<
  FunctionReturnType<typeof api.attemptReview.access.reviewAttempt>
>;

const link =
  "font-semibold text-primary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
const sectionClass =
  "mt-8 rounded-2xl border border-slate-200 bg-white p-7 shadow-sm";

const stageLabels: Record<Entry["debrief"], string> = {
  none: "No Debrief (ended by starting again)",
  reflecting: "Reflection in progress",
  complete: "Reflection questions answered",
};
const promptHeadings = {
  interpretation: "Interpreting the Attempt",
  planning: "Planning the next Attempt",
};
const feedbackStatus = {
  not_started: "Formative Feedback has not been generated yet.",
  pending: "Formative Feedback is being generated.",
  failed: "Formative Feedback generation failed. The Learner can retry it from their Debrief.",
};

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleString();
}

export function ReviewListView({ attempts }: { attempts: Entry[] }) {
  return (
    <main className="mx-auto max-w-4xl px-5 py-12 sm:py-16">
      <Link to="/" className={`text-sm ${link}`}>
        ← Home
      </Link>
      <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-950">
        Review Ended Attempts
      </h1>
      <p className="mt-3 max-w-2xl leading-7 text-slate-600">
        Ended Attempts you are currently authorized to review. Faculty access
        follows current Learning Group membership and Scenario availability
        and changes immediately when either changes. Institutional Admin
        access covers every Ended Attempt in the Pilot Institution.
      </p>
      {attempts.length === 0 ? (
        <p className="mt-8 rounded-lg border border-slate-200 bg-white px-5 py-4 text-slate-700">
          No Ended Attempts are currently available for your review.
        </p>
      ) : (
        <ul className="mt-8 grid gap-4">
          {attempts.map((attempt) => (
            <li
              key={attempt.id}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h2 className="text-lg font-semibold text-slate-950">
                <Link
                  to="/review/$attemptId"
                  params={{ attemptId: attempt.id }}
                  className="hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  {attempt.learnerEmail} · {attempt.scenarioTitle}
                </Link>
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Scenario Version {attempt.scenarioVersion} · ended{" "}
                <time dateTime={new Date(attempt.endedAt).toISOString()}>
                  {formatDate(attempt.endedAt)}
                </time>{" "}
                · {stageLabels[attempt.debrief]}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

// Read-only: reviewers see the recorded evidence, Learner Reflections, and
// Formative Feedback, with no controls that change the Attempt.
export function ReviewDetailView({ review }: { review: Detail }) {
  const { attempt, debrief, learnerEmail } = review;
  return (
    <main className="mx-auto max-w-4xl px-5 py-12 sm:py-16">
      <Link to="/review" className={`text-sm ${link}`}>
        ← Review Ended Attempts
      </Link>
      <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-secondary">
        Review · Ended Attempt · {attempt.scenario.setting}
      </p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950">
        {attempt.scenario.title}
      </h1>
      <p className="mt-3 text-lg text-slate-700">
        {learnerEmail} · Scenario Version {attempt.scenario.version}
        {attempt.endedAt !== null && <> · ended {formatDate(attempt.endedAt)}</>}
      </p>
      <p className="mt-6 rounded-lg border border-slate-200 bg-white px-5 py-4 leading-7 text-slate-700">
        {attempt.endReason === "learner_restarted"
          ? "This Attempt ended when the Learner started a new one."
          : "The Learner ended this Attempt."}{" "}
        It can no longer change.
      </p>

      <section aria-labelledby="review-conversation-title" className={sectionClass}>
        <h2 id="review-conversation-title" className="text-lg font-semibold text-slate-950">
          Conversation with {attempt.scenario.patientName}
        </h2>
        <AttemptTimeline
          timeline={attempt.timeline}
          patientName={attempt.scenario.patientName}
          learnerLabel="Learner"
        />
      </section>

      {debrief.status === "none" ? (
        <p className={`${sectionClass} leading-7 text-slate-700`}>
          This Attempt has no Debrief because it ended when the Learner started
          a new one.
        </p>
      ) : (
        <>
          <section aria-labelledby="review-reflections-title" className={sectionClass}>
            <h2 id="review-reflections-title" className="text-lg font-semibold text-slate-950">
              Learner Reflections
            </h2>
            {debrief.prompts.map((prompt) => (
              <div key={prompt.key} className="mt-6 border-t border-slate-200 pt-6">
                <h3 className="font-semibold text-slate-950">
                  {promptHeadings[prompt.key]}
                </h3>
                {prompt.text && (
                  <p className="mt-1 leading-7 text-slate-700">{prompt.text}</p>
                )}
                {prompt.responses.length === 0 ? (
                  <p className="mt-3 text-slate-600">No response yet.</p>
                ) : (
                  <ol className="mt-3 space-y-2">
                    {prompt.responses.map((response, index) => (
                      <li key={index} className="rounded-lg bg-slate-50 px-4 py-3 text-slate-800">
                        <p className="text-xs font-semibold text-slate-500">
                          {response.response === "skip" ? "Skipped" : "Reflection"} ·{" "}
                          <time dateTime={new Date(response.submittedAt).toISOString()}>
                            {formatDate(response.submittedAt)}
                          </time>
                        </p>
                        {response.text && (
                          <p className="mt-1 whitespace-pre-wrap leading-7">{response.text}</p>
                        )}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            ))}
          </section>

          <section aria-labelledby="review-feedback-title" className={sectionClass}>
            <h2 id="review-feedback-title" className="text-lg font-semibold text-slate-950">
              Formative Feedback
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Synthetic educational feedback on communication, linked to
              recorded events. It is not clinical guidance, a grade, or a
              competency assessment.
            </p>
            {debrief.feedback.status === "completed" ? (
              <FeedbackSections
                sections={debrief.feedback.sections}
                noCriteriaText="Instructors have not set Communication Criteria for this Scenario yet."
              />
            ) : (
              <p className="mt-4 text-slate-700">
                {feedbackStatus[debrief.feedback.status]}
              </p>
            )}
          </section>
        </>
      )}
    </main>
  );
}

export function ReviewNotAvailableView() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-16">
      <h1 className="text-3xl font-bold tracking-tight text-slate-950">
        This Attempt is not available for your review
      </h1>
      <p className="mt-4 leading-7 text-slate-600">
        You can review only Ended Attempts within your current authorized
        scope.
      </p>
      <Link to="/review" className={`mt-6 inline-block ${link}`}>
        Review Ended Attempts
      </Link>
    </main>
  );
}

export function ReviewerRoleRequiredView() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-16">
      <h1 className="text-3xl font-bold tracking-tight text-slate-950">
        Faculty or Institutional Admin role required
      </h1>
      <p className="mt-4 leading-7 text-slate-600">
        Your Pilot Membership does not include a review role.
      </p>
      <Link to="/" className={`mt-6 inline-block ${link}`}>
        ← Home
      </Link>
    </main>
  );
}
