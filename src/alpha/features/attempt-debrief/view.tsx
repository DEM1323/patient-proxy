import type { FunctionReturnType } from "convex/server";
import type { api } from "@/convex/_generated/api";
import { primaryButton, secondaryButton } from "../attempt-start/view";

type Debrief = NonNullable<
  FunctionReturnType<typeof api.attemptDebrief.access.ownDebrief>
>;
type ActiveDebrief = Extract<Debrief, { prompts: unknown }>;
type PromptKey = ActiveDebrief["prompts"][number]["key"];
type Sections = Extract<
  NonNullable<ActiveDebrief["feedback"]>,
  { status: "completed" }
>["sections"];

export type DebriefProps = {
  drafts: Record<PromptKey, string>;
  onDraftChange: (prompt: PromptKey, draft: string) => void;
  onAnswer: (prompt: PromptKey) => void;
  onSkip: (prompt: PromptKey) => void;
  onRetryFeedback: () => void;
  // A reflection or retry command is awaiting the server.
  submitting: boolean;
  notice: string | null;
};

const promptHeadings: Record<PromptKey, string> = {
  interpretation: "Interpreting this Attempt",
  planning: "Planning your next Attempt",
};

const ratingLabels = {
  demonstrated: "Demonstrated",
  partially_demonstrated: "Partially demonstrated",
  not_yet_demonstrated: "Not observed in this Attempt",
};

const sectionClass =
  "mt-8 rounded-2xl border border-slate-200 bg-white p-7 shadow-sm";

export function DebriefView({
  debrief,
  props,
}: {
  debrief: Debrief;
  props: DebriefProps;
}) {
  if (debrief.status === "not_available") {
    return debrief.reason === "restarted" ? (
      <section className={sectionClass}>
        <h2 className="text-lg font-semibold text-slate-950">Attempt Debrief</h2>
        <p className="mt-2 leading-7 text-slate-700">
          This Attempt ended when you started a new one, so it has no Debrief.
        </p>
      </section>
    ) : null;
  }

  const revealed = debrief.status === "revealed";
  return (
    <>
      <section aria-labelledby="debrief-title" className={sectionClass}>
        <h2 id="debrief-title" className="text-lg font-semibold text-slate-950">
          Attempt Debrief
        </h2>
        <p className="mt-2 leading-7 text-slate-700">
          {revealed
            ? "Your reflections are saved with this Attempt. You can add to them at any time; earlier responses are never replaced."
            : "Answer or skip each question to see your Formative Feedback. Your reflections are saved with this Attempt and shared with your authorized Faculty."}
        </p>
        {debrief.prompts.map((prompt) => (
          <ReflectionPrompt
            key={prompt.key}
            prompt={prompt}
            props={props}
          />
        ))}
        {props.notice && (
          <p role="alert" className="mt-4 font-medium text-rose-700">
            {props.notice}
          </p>
        )}
      </section>

      {revealed && debrief.feedback && (
        <FeedbackView feedback={debrief.feedback} props={props} />
      )}
    </>
  );
}

function ReflectionPrompt({
  prompt,
  props,
}: {
  prompt: ActiveDebrief["prompts"][number];
  props: DebriefProps;
}) {
  const fieldId = `reflection-${prompt.key}`;
  const draft = props.drafts[prompt.key];
  const answered = prompt.responses.length > 0;
  return (
    <div className="mt-6 border-t border-slate-200 pt-6">
      <h3 className="font-semibold text-slate-950">
        {promptHeadings[prompt.key]}
      </h3>
      <p className="mt-1 leading-7 text-slate-700">{prompt.text}</p>
      {answered && (
        <ol className="mt-3 space-y-2">
          {prompt.responses.map((response, index) => (
            <li
              key={index}
              className="rounded-lg bg-slate-50 px-4 py-3 text-slate-800"
            >
              <p className="text-xs font-semibold text-slate-500">
                {response.response === "skip" ? "Skipped" : "Your reflection"} ·{" "}
                <time dateTime={new Date(response.submittedAt).toISOString()}>
                  {new Date(response.submittedAt).toLocaleString()}
                </time>
              </p>
              {response.text && (
                <p className="mt-1 whitespace-pre-wrap leading-7">
                  {response.text}
                </p>
              )}
            </li>
          ))}
        </ol>
      )}
      <label htmlFor={fieldId} className="mt-4 block text-sm font-semibold text-slate-800">
        {answered ? "Add to your reflection" : "Your reflection"}
      </label>
      <textarea
        id={fieldId}
        rows={3}
        maxLength={4000}
        value={draft}
        onChange={(event) => props.onDraftChange(prompt.key, event.target.value)}
        className="mt-2 block w-full rounded-lg border border-slate-300 px-4 py-3 leading-7 text-slate-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      />
      <div className="mt-3 flex flex-wrap gap-3">
        <button
          type="button"
          className={primaryButton}
          disabled={props.submitting || draft.trim().length === 0}
          onClick={() => props.onAnswer(prompt.key)}
        >
          Submit reflection
        </button>
        {!answered && (
          <button
            type="button"
            className={secondaryButton}
            disabled={props.submitting}
            onClick={() => props.onSkip(prompt.key)}
          >
            Skip this question
          </button>
        )}
      </div>
    </div>
  );
}

function FeedbackView({
  feedback,
  props,
}: {
  feedback: NonNullable<ActiveDebrief["feedback"]>;
  props: DebriefProps;
}) {
  return (
    <section aria-labelledby="feedback-title" className={sectionClass}>
      <h2 id="feedback-title" className="text-lg font-semibold text-slate-950">
        Formative Feedback
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Synthetic educational feedback on your communication, linked to
        recorded events in this Attempt. It is not clinical guidance, a grade,
        or a competency assessment.
      </p>
      <div aria-live="polite">
        {feedback.status === "pending" && (
          <p className="mt-4 italic text-slate-600">Preparing your feedback…</p>
        )}
      </div>
      {(feedback.status === "failed" || feedback.status === "not_started") && (
        <div role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-5 py-4">
          <p className="font-medium text-rose-800">
            Your feedback could not be prepared yet.
          </p>
          <button
            type="button"
            className={`mt-3 ${secondaryButton}`}
            disabled={props.submitting}
            onClick={props.onRetryFeedback}
          >
            Try again
          </button>
        </div>
      )}
      {feedback.status === "completed" && (
        <FeedbackSections sections={feedback.sections} />
      )}
    </section>
  );
}

function FeedbackSections({ sections }: { sections: Sections }) {
  return (
    <div className="mt-4 space-y-6 text-slate-800">
      <FeedbackList title="Encounter summary" items={sections.summary} />
      <FeedbackList
        title="Strengths"
        items={sections.strengths}
        empty="No strengths were identified from the recorded evidence."
      />
      <div>
        <h3 className="font-semibold text-slate-950">Priorities</h3>
        <ul className="mt-2 space-y-2">
          {sections.priorities.map((item, index) => (
            <li key={index} className="leading-7">
              {!item.observed && (
                <span className="mr-2 rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                  Not observed
                </span>
              )}
              {item.text} <Evidence sequences={item.evidence} />
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="font-semibold text-slate-950">Communication Criteria</h3>
        {sections.criteria === null ? (
          <p className="mt-2 leading-7 text-slate-600">
            Your instructors have not set Communication Criteria for this
            Scenario yet.
          </p>
        ) : (
          <ul className="mt-2 space-y-3">
            {sections.criteria.map((criterion) => (
              <li key={criterion.key} className="leading-7">
                <p className="font-medium text-slate-950">
                  {criterion.label}: {ratingLabels[criterion.rating]}
                </p>
                <p>
                  {criterion.rationale} <Evidence sequences={criterion.evidence} />
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <h3 className="font-semibold text-slate-950">
          Suggestions for another Attempt
        </h3>
        <ol className="mt-2 list-decimal space-y-1 pl-6 leading-7">
          {sections.suggestions.map((suggestion, index) => (
            <li key={index}>{suggestion}</li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function FeedbackList({
  empty,
  items,
  title,
}: {
  empty?: string;
  items: { text: string; evidence: number[] }[];
  title: string;
}) {
  return (
    <div>
      <h3 className="font-semibold text-slate-950">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-2 leading-7 text-slate-600">{empty}</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {items.map((item, index) => (
            <li key={index} className="leading-7">
              {item.text} <Evidence sequences={item.evidence} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Links each claim to the recorded timeline events that support it.
function Evidence({ sequences }: { sequences: number[] }) {
  if (sequences.length === 0) {
    return null;
  }
  return (
    <span className="text-sm text-slate-500">
      (evidence:{" "}
      {sequences.map((sequence, index) => (
        <span key={sequence}>
          {index > 0 && ", "}
          <a
            href={`#event-${sequence}`}
            className="font-semibold text-primary hover:underline"
          >
            event {sequence}
          </a>
        </span>
      ))}
      )
    </span>
  );
}
