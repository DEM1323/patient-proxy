import { Link } from "@tanstack/react-router";
import type { FunctionReturnType } from "convex/server";
import type { api } from "@/convex/_generated/api";
import { EvidenceProvider } from "../../ui/evidence";
import { FeedbackSections } from "../attempt-debrief/view";
import { Badge, Empty, Page, Table, textLink } from "../../ui/primitives";
import { AttemptTimeline } from "../attempt-start/view";

type Entry = FunctionReturnType<
  typeof api.attemptReview.access.reviewableAttempts
>[number];
type Detail = NonNullable<
  FunctionReturnType<typeof api.attemptReview.access.reviewAttempt>
>;

const link =
  "font-semibold text-blue-text hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue";

const stageLabels: Record<Entry["debrief"], string> = {
  none: "No Debrief",
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
  failed:
    "Formative Feedback generation failed. The Learner can retry it from their Debrief.",
};

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleString();
}

export function ReviewListView({ attempts }: { attempts: Entry[] }) {
  return (
    <Page
      title="Review Ended Attempts"
      description="Ended Attempts you are currently authorized to review."
    >
      <ReviewTable attempts={attempts} />
      <p className="mt-5 max-w-[80ch] text-small text-ink-3">
        Faculty access follows current shared Learning Groups and Scenario
        availability. Institutional Admin access covers the Pilot Institution.
        Records are deleted automatically 90 days after ending.
      </p>
    </Page>
  );
}

export function ReviewTable({ attempts }: { attempts: Entry[] }) {
  if (!attempts.length)
    return (
      <Empty title="No Ended Attempts are currently available for your review." />
    );
  return (
    <Table label="Review Ended Attempts">
      <thead>
        <tr>
          <th>Learner</th>
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
            <td className="font-bold">{attempt.learnerEmail}</td>
            <td>
              {attempt.scenarioTitle}
              <p className="text-small text-ink-3">
                Scenario Version {attempt.scenarioVersion}
              </p>
            </td>
            <td className="min-w-[130px]">{formatDate(attempt.endedAt)}</td>
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
                {stageLabels[attempt.debrief]}
              </Badge>
            </td>
            <td>
              <Link
                to="/review/$attemptId"
                aria-label={
                  attempt.learnerEmail + " · " + attempt.scenarioTitle
                }
                params={{ attemptId: attempt.id }}
                className={textLink}
              >
                Review
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

// Read-only: reviewers see the recorded evidence, Learner Reflections, and
// Formative Feedback, with no controls that change the Attempt.
export function ReviewDetailView({ review }: { review: Detail }) {
  const { attempt, debrief, learnerEmail } = review;
  const record = (prefix = "") => (
    <AttemptTimeline
      prefix={prefix}
      timeline={attempt.timeline}
      patientName={attempt.scenario.patientName}
      learnerLabel="Learner"
    />
  );
  return (
    <EvidenceProvider renderRecord={record}>
      <main className="min-w-0">
        <header className="flex flex-wrap items-center gap-3 border-b border-line bg-surface px-5 py-5 text-small md:px-8">
          <Link to="/review" className={textLink}>
            Review Ended Attempts
          </Link>
          <span>/</span>
          <h1 className="break-all font-bold">{learnerEmail}</h1>
          <Badge>Ended</Badge>
          <p className="text-ink-2 xl:ml-auto">
            Read-only. Your access follows current Membership and Scenario
            scope.
          </p>
        </header>
        <dl className="flex flex-wrap gap-8 border-b border-line bg-surface px-5 py-5 md:px-8">
          {[
            ["Learner", learnerEmail],
            [
              "Scenario",
              attempt.scenario.title +
                ", Scenario Version " +
                attempt.scenario.version,
            ],
            [
              "Ended",
              attempt.endedAt === null ? "—" : formatDate(attempt.endedAt),
            ],
            [
              "Debrief",
              debrief.status === "none" ? "No Debrief" : "Learner Reflections",
            ],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-small text-ink-2">{label}</dt>
              <dd className="mt-1 break-all font-bold">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="grid min-w-0 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <section
            aria-labelledby="review-conversation-title"
            className="min-w-0 p-5 md:p-8"
          >
            <h2 id="review-conversation-title" className="font-bold">
              Conversation with {attempt.scenario.patientName}
            </h2>
            {record()}
          </section>
          <aside className="min-w-0 space-y-7 border-line bg-surface p-5 md:p-8 lg:border-l">
            {debrief.status === "none" ? (
              <p>
                This Attempt has no Debrief: only Attempts the Learner ends
                deliberately have one.
              </p>
            ) : (
              <>
                <section aria-labelledby="review-reflections-title">
                  <h2
                    id="review-reflections-title"
                    className="mb-5 text-heading font-bold"
                  >
                    Learner Reflections
                  </h2>
                  {debrief.prompts.map((prompt) => (
                    <div key={prompt.key} className="mb-5">
                      <h3 className="font-bold">
                        {promptHeadings[prompt.key]}
                      </h3>
                      {prompt.text && (
                        <p className="mt-2 text-small text-ink-2">
                          {prompt.text}
                        </p>
                      )}
                      {!prompt.responses.length ? (
                        <p className="mt-3 text-small text-ink-2">
                          No response yet.
                        </p>
                      ) : (
                        <ol className="mt-3 space-y-2">
                          {prompt.responses.map((response, index) => (
                            <li
                              key={index}
                              className="rounded-lg bg-sunken px-4 py-3 text-ui"
                            >
                              <p className="mb-1 text-meta text-ink-3">
                                {response.response === "skip"
                                  ? "Skipped"
                                  : "Reflection"}
                                , {formatDate(response.submittedAt)}
                              </p>
                              {response.text ? (
                                <p className="whitespace-pre-wrap">
                                  {response.text}
                                </p>
                              ) : (
                                <p>The Learner skipped this question.</p>
                              )}
                            </li>
                          ))}
                        </ol>
                      )}
                    </div>
                  ))}
                </section>
                <section aria-labelledby="review-feedback-title">
                  <h2
                    id="review-feedback-title"
                    className="text-heading font-bold"
                  >
                    Formative Feedback
                  </h2>
                  <p className="mt-2 text-small text-ink-2">
                    Educational feedback on communication linked to recorded
                    events. It is not clinical guidance, a grade, or a
                    competency assessment.
                  </p>
                  {debrief.feedback.status === "completed" ? (
                    <FeedbackSections
                      sections={debrief.feedback.sections}
                      noCriteriaText="Instructors have not set Communication Criteria for this Scenario yet."
                    />
                  ) : (
                    <p className="mt-4 text-ink-2">
                      {feedbackStatus[debrief.feedback.status]}
                    </p>
                  )}
                </section>
              </>
            )}
          </aside>
        </div>
      </main>
    </EvidenceProvider>
  );
}

export function ReviewNotAvailableView() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-16">
      <h1 className="text-3xl font-bold tracking-tight text-ink">
        This Attempt is not available for your review
      </h1>
      <p className="mt-4 leading-7 text-ink-2">
        You can review only Ended Attempts within your current authorized scope.
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
      <h1 className="text-3xl font-bold tracking-tight text-ink">
        Faculty or Institutional Admin role required
      </h1>
      <p className="mt-4 leading-7 text-ink-2">
        Your Pilot Membership does not include a review role.
      </p>
      <Link to="/" className={`mt-6 inline-block ${link}`}>
        ← Home
      </Link>
    </main>
  );
}
