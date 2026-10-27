import { Link } from "@tanstack/react-router";
import { useState, type FormEvent, type ReactNode } from "react";
import type { FunctionReturnType } from "convex/server";
import type { api } from "@/convex/_generated/api";
import type { DebriefContent } from "@/convex/attemptStart/scenarioContent";
import { button } from "../../ui/button";
import { Badge, Empty, Modal, Notice, Page, Table, textLink } from "../../ui/primitives";

export type AuthoringScenario = FunctionReturnType<
  typeof api.scenarioAuthoring.access.scenarios
>[number];
export type ScenarioDebrief = NonNullable<
  FunctionReturnType<typeof api.scenarioAuthoring.access.scenarioDebrief>
>;
type Source = AuthoringScenario["debrief"];

export type DebriefDraft = {
  feedbackGuidance: string;
  criteria: { key: string; label: string; description: string }[];
  interpretation: string;
  planning: string;
};

export type EditorNotice = { tone: "success" | "error"; text: string } | null;

const sources: Record<Source, { label: string; tone: "neutral" | "blue" | "teal" | "amber" }> = {
  none: { label: "Not authored", tone: "neutral" },
  provisioned: { label: "Provisioned", tone: "blue" },
  author: { label: "Author-written", tone: "teal" },
  adopted_template: { label: "Adopted generated template", tone: "amber" },
};

export function SourceBadge({ source }: { source: Source }) {
  return <Badge tone={sources[source].tone}>{sources[source].label}</Badge>;
}

export function AuthorRequiredView() {
  return (
    <Page title="Debrief content">
      <Empty title="Author role required">
        Ask your Institutional Admin to add the Author role if you write
        Scenario debrief content.
      </Empty>
    </Page>
  );
}

export function AuthoringScenarioTable({ scenarios }: { scenarios: AuthoringScenario[] }) {
  if (scenarios.length === 0) {
    return <Empty title="No Scenarios yet">Published Scenarios appear here.</Empty>;
  }
  return (
    <Table label="Scenario debriefs">
      <thead>
        <tr>
          <th scope="col">Scenario</th>
          <th scope="col">Current version</th>
          <th scope="col">Debrief content</th>
          <th scope="col">
            <span className="sr-only">Action</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {scenarios.map((scenario) => (
          <tr key={scenario.id}>
            <td className="font-semibold">{scenario.title}</td>
            <td>Version {scenario.version}</td>
            <td>
              <SourceBadge source={scenario.debrief} />
            </td>
            <td className="text-right">
              <Link
                className={textLink}
                to="/scenarios/$scenarioId/debrief"
                params={{ scenarioId: scenario.id }}
              >
                Edit debrief
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

export function toDraft(content: DebriefContent | null): DebriefDraft {
  return {
    feedbackGuidance: content?.feedbackGuidance ?? "",
    criteria: content?.communicationCriteria?.map((criterion) => ({ ...criterion })) ?? [],
    interpretation: content?.reflectionPrompts?.interpretation ?? "",
    planning: content?.reflectionPrompts?.planning ?? "",
  };
}

// Rows left entirely blank are dropped; the server trims and validates the rest.
export function toContent(draft: DebriefDraft): DebriefContent {
  const criteria = draft.criteria.filter(
    ({ label, description }) => label.trim() || description.trim(),
  );
  return {
    ...(draft.feedbackGuidance.trim() ? { feedbackGuidance: draft.feedbackGuidance } : {}),
    ...(criteria.length ? { communicationCriteria: criteria } : {}),
    ...(draft.interpretation.trim() || draft.planning.trim()
      ? { reflectionPrompts: { interpretation: draft.interpretation, planning: draft.planning } }
      : {}),
  };
}

export function sameContent(a: DebriefContent, b: DebriefContent) {
  return stable(a) === stable(b);
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stable((value as Record<string, unknown>)[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(typeof value === "string" ? value.trim() : value);
}

export type EditorProps = {
  scenario: ScenarioDebrief;
  draft: DebriefDraft;
  onDraftChange: (draft: DebriefDraft) => void;
  generated: boolean;
  onGenerate: () => void;
  adopt: boolean;
  onAdoptChange: (adopt: boolean) => void;
  submitting: boolean;
  notice: EditorNotice;
  onPublish: () => void;
};

export function DebriefEditorView(props: EditorProps) {
  const { scenario, draft } = props;
  const [confirmGenerate, setConfirmGenerate] = useState(false);
  const content = toContent(draft);
  const unchangedTemplate =
    scenario.template !== null && sameContent(content, scenario.template.content);
  const hasEntries = Object.keys(content).length > 0;
  const set = (patch: Partial<DebriefDraft>) => props.onDraftChange({ ...draft, ...patch });
  const setCriterion = (index: number, patch: Partial<DebriefDraft["criteria"][number]>) =>
    set({
      criteria: draft.criteria.map((criterion, i) =>
        i === index ? { ...criterion, ...patch } : criterion,
      ),
    });
  const generate = () => {
    if (hasEntries) {
      setConfirmGenerate(true);
    } else {
      props.onGenerate();
    }
  };

  return (
    <Page
      title={`${scenario.title} debrief`}
      description={
        <>
          {scenario.patientName} · {scenario.setting}. Publishing creates
          version {scenario.version + 1}; Attempts already started keep the
          version they started with.
        </>
      }
      action={
        scenario.template && (
          <button type="button" className={button("secondary")} onClick={generate}>
            Generate template
          </button>
        )
      }
    >
      <div className="space-y-7">
        {props.notice && <Notice tone={props.notice.tone}>{props.notice.text}</Notice>}
        <section
          aria-label="Current version"
          className="flex flex-wrap items-center gap-3 text-compact text-ink-2"
        >
          <span className="font-semibold text-ink">Version {scenario.version}</span>
          <SourceBadge source={scenario.source} />
          {scenario.publication && (
            <span>
              Published by {scenario.publication.publishedBy ?? "a former Member"} on{" "}
              <time dateTime={new Date(scenario.publication.publishedAt).toISOString()}>
                {new Date(scenario.publication.publishedAt).toLocaleString()}
              </time>
            </span>
          )}
        </section>
        {props.generated && scenario.template && (
          <Notice tone="warning">
            <strong>Generated template, edit before use.</strong>{" "}
            {scenario.template.notice} Review every field and change it to fit
            your course.
          </Notice>
        )}
        <form
          className="space-y-7"
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            props.onPublish();
          }}
        >
          <Field
            id="feedback-guidance"
            label="Feedback guidance"
            hint="Instructions for the feedback AI: tone, focus, what to look for. Evidence rules always take precedence."
          >
            <textarea
              id="feedback-guidance"
              rows={4}
              maxLength={4000}
              className="proxy-input mt-2 min-h-[112px]"
              value={draft.feedbackGuidance}
              onChange={(event) => set({ feedbackGuidance: event.target.value })}
            />
          </Field>

          <fieldset className="min-w-0 rounded-xl border border-line bg-surface p-6">
            <legend className="px-1 font-bold">Communication Criteria</legend>
            <p className="mb-4 text-small text-ink-3">
              Observable communication behaviors that feedback rates as
              demonstrated, partially demonstrated, or not yet demonstrated.
              They are not a grade.
            </p>
            <ol className="space-y-5">
              {draft.criteria.map((criterion, index) => (
                <li key={criterion.key} className="space-y-3 border-b border-line pb-5 last:border-0">
                  <div>
                    <label htmlFor={`criterion-label-${index}`} className="text-label font-semibold">
                      Criterion {index + 1}
                    </label>
                    <input
                      id={`criterion-label-${index}`}
                      className="proxy-input mt-2"
                      maxLength={120}
                      value={criterion.label}
                      onChange={(event) => setCriterion(index, { label: event.target.value })}
                    />
                  </div>
                  <div>
                    <label htmlFor={`criterion-description-${index}`} className="text-label font-semibold">
                      Description of criterion {index + 1}
                    </label>
                    <textarea
                      id={`criterion-description-${index}`}
                      rows={2}
                      maxLength={600}
                      className="proxy-input mt-2"
                      value={criterion.description}
                      onChange={(event) =>
                        setCriterion(index, { description: event.target.value })
                      }
                    />
                  </div>
                  <button
                    type="button"
                    className={button("danger", "sm")}
                    onClick={() =>
                      set({ criteria: draft.criteria.filter((_, i) => i !== index) })
                    }
                  >
                    Remove criterion {index + 1}
                  </button>
                </li>
              ))}
            </ol>
            <button
              type="button"
              className={`${button("secondary", "sm")} mt-4`}
              disabled={draft.criteria.length >= 12}
              onClick={() =>
                set({
                  criteria: [
                    ...draft.criteria,
                    { key: `criterion_${crypto.randomUUID().slice(0, 8)}`, label: "", description: "" },
                  ],
                })
              }
            >
              Add criterion
            </button>
          </fieldset>

          <fieldset className="min-w-0 space-y-5 rounded-xl border border-line bg-surface p-6">
            <legend className="px-1 font-bold">Reflection Prompts</legend>
            <p className="text-small text-ink-3">
              Learners answer or skip both before feedback is revealed. Fill in
              both, or leave both blank: prompts are then written from your
              guidance, or the platform defaults apply.
            </p>
            <Field id="prompt-interpretation" label="Interpretation prompt">
              <textarea
                id="prompt-interpretation"
                rows={2}
                maxLength={600}
                className="proxy-input mt-2"
                value={draft.interpretation}
                onChange={(event) => set({ interpretation: event.target.value })}
              />
            </Field>
            <Field id="prompt-planning" label="Planning prompt">
              <textarea
                id="prompt-planning"
                rows={2}
                maxLength={600}
                className="proxy-input mt-2"
                value={draft.planning}
                onChange={(event) => set({ planning: event.target.value })}
              />
            </Field>
          </fieldset>

          {unchangedTemplate && (
            <label className="flex items-start gap-3 rounded-lg border border-amber-line bg-amber-tint px-4 py-3 text-compact">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 shrink-0"
                checked={props.adopt}
                onChange={(event) => props.onAdoptChange(event.target.checked)}
              />
              <span>
                I reviewed this generated template and adopt it unchanged.
                Patient Proxy records that you adopted it.
              </span>
            </label>
          )}
          <button
            type="submit"
            className={button()}
            disabled={props.submitting || (unchangedTemplate && !props.adopt)}
          >
            {props.submitting ? "Publishing…" : `Publish as version ${scenario.version + 1}`}
          </button>
        </form>
        <Link className={textLink} to="/scenarios">
          All Scenarios
        </Link>
      </div>
      {confirmGenerate && (
        <Modal title="Replace your entries?" onClose={() => setConfirmGenerate(false)}>
          <p className="text-ink-2">
            The generated template replaces everything in this form. Nothing is
            published until you publish.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              data-initial-focus
              className={button()}
              onClick={() => {
                setConfirmGenerate(false);
                props.onGenerate();
              }}
            >
              Replace with template
            </button>
            <button
              type="button"
              className={button("secondary")}
              onClick={() => setConfirmGenerate(false)}
            >
              Keep my entries
            </button>
          </div>
        </Modal>
      )}
    </Page>
  );
}

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-label font-semibold">
        {label}
      </label>
      {hint && <p className="mt-1 text-small text-ink-3">{hint}</p>}
      {children}
    </div>
  );
}
