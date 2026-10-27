import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { MembershipGate } from "../membership-access";
import { AccessLoadingView } from "../membership-access/view";
import { Empty, Page } from "../../ui/primitives";
import {
  AuthorRequiredView,
  AuthoringScenarioTable,
  DebriefEditorView,
  toContent,
  toDraft,
  type EditorNotice,
  type ScenarioDebrief,
} from "./view";

function AuthorGate({ children }: { children: () => React.ReactNode }) {
  return (
    <MembershipGate>
      {({ membership }) =>
        membership.roles.includes("author") ? children() : <AuthorRequiredView />
      }
    </MembershipGate>
  );
}

// The Author section of the Scenarios page and an Author-only Home.
export function AuthoringScenarios() {
  const scenarios = useQuery(api.scenarioAuthoring.access.scenarios, {});
  if (scenarios === undefined) {
    return <p role="status">Loading Scenarios…</p>;
  }
  return <AuthoringScenarioTable scenarios={scenarios} />;
}

export function DebriefEditorPage({ scenarioId }: { scenarioId: string }) {
  return <AuthorGate>{() => <DebriefEditor scenarioId={scenarioId} />}</AuthorGate>;
}

function DebriefEditor({ scenarioId }: { scenarioId: string }) {
  const scenario = useQuery(api.scenarioAuthoring.access.scenarioDebrief, { scenarioId });
  // Outlives the form, which resets to the published content of each version.
  const [notice, setNotice] = useState<EditorNotice>(null);
  if (scenario === undefined) {
    return <AccessLoadingView message="Loading debrief content" />;
  }
  if (scenario === null) {
    return (
      <Page title="Debrief content">
        <Empty title="Scenario not found">
          This Scenario does not exist or is not in your institution.
        </Empty>
      </Page>
    );
  }
  return (
    <DebriefForm
      key={scenario.version}
      scenario={scenario}
      notice={notice}
      setNotice={setNotice}
    />
  );
}

function DebriefForm({
  scenario,
  notice,
  setNotice,
}: {
  scenario: ScenarioDebrief;
  notice: EditorNotice;
  setNotice: (notice: EditorNotice) => void;
}) {
  const publish = useMutation(api.scenarioAuthoring.access.publish);
  const [draft, setDraft] = useState(() => toDraft(scenario.debrief));
  const [generated, setGenerated] = useState(false);
  const [adopt, setAdopt] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const onPublish = async () => {
    setSubmitting(true);
    setNotice(null);
    try {
      const result = await publish({
        scenarioId: scenario.id,
        debrief: toContent(draft),
        adoptTemplate: adopt,
      });
      setNotice(
        result.status === "published"
          ? {
              tone: "success",
              text: `Published version ${result.version}. Attempts already started keep the version they started with.`,
            }
          : result.status === "unchanged"
            ? { tone: "success", text: `Nothing changed; version ${result.version} is still current.` }
            : result.status === "template_not_adopted"
              ? { tone: "error", text: "Edit the generated template, or confirm that you adopt it unchanged." }
              : result.status === "invalid"
                ? {
                    tone: "error",
                    text: "Every criterion needs a name and description, and the Reflection Prompts need both questions or neither.",
                  }
                : { tone: "error", text: "This Scenario is no longer available to you." },
      );
    } catch {
      setNotice({
        tone: "error",
        text: "That change could not be saved. Check your connection and try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DebriefEditorView
      scenario={scenario}
      draft={draft}
      onDraftChange={(next) => {
        setDraft(next);
        setAdopt(false);
      }}
      generated={generated}
      onGenerate={() => {
        if (scenario.template) {
          setDraft(toDraft(scenario.template.content));
          setGenerated(true);
          setAdopt(false);
          setNotice(null);
        }
      }}
      adopt={adopt}
      onAdoptChange={setAdopt}
      submitting={submitting}
      notice={notice}
      onPublish={() => void onPublish()}
    />
  );
}
