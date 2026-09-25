import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useState, type ReactNode } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { MembershipGate } from "../membership-access";
import { AccessLoadingView } from "../membership-access/view";
import {
  AttemptNotFoundView,
  AttemptView,
  type ComposerProps,
  LearnerBriefView,
  LearnerRoleRequiredView,
  ScenarioListView,
  ScenarioUnavailableView,
  type StartState,
} from "./view";

type SendResult = FunctionReturnType<
  typeof api.attemptInteraction.access.send
>;

export function ScenarioListPage() {
  return (
    <LearnerGate>
      <ScenarioList />
    </LearnerGate>
  );
}

export function LearnerBriefPage({ scenarioId }: { scenarioId: string }) {
  return (
    <LearnerGate>
      <LearnerBrief scenarioId={scenarioId} />
    </LearnerGate>
  );
}

export function AttemptPage({ attemptId }: { attemptId: string }) {
  return (
    <LearnerGate>
      <Attempt attemptId={attemptId} />
    </LearnerGate>
  );
}

function LearnerGate({ children }: { children: ReactNode }) {
  return (
    <MembershipGate>
      {({ membership }) =>
        membership.roles.includes("learner") ? (
          children
        ) : (
          <LearnerRoleRequiredView />
        )
      }
    </MembershipGate>
  );
}

function ScenarioList() {
  const scenarios = useQuery(api.attemptStart.access.availableScenarios, {});
  if (scenarios === undefined) {
    return <AccessLoadingView message="Loading Available Scenarios" />;
  }
  return <ScenarioListView scenarios={scenarios} />;
}

function LearnerBrief({ scenarioId }: { scenarioId: string }) {
  const brief = useQuery(api.attemptStart.access.learnerBrief, { scenarioId });
  const start = useMutation(api.attemptStart.access.start);
  const navigate = useNavigate();
  const [startState, setStartState] = useState<StartState>({ step: "idle" });

  if (brief === undefined) {
    return <AccessLoadingView message="Loading the Learner Brief" />;
  }
  if (brief.status === "unavailable") {
    return <ScenarioUnavailableView />;
  }

  const runStart = async (endActiveAttemptId?: Id<"attempts">) => {
    setStartState({ step: "starting" });
    try {
      const result = await start({ scenarioId, endActiveAttemptId });
      if (result.status === "started") {
        await navigate({
          to: "/attempts/$attemptId",
          params: { attemptId: result.attemptId },
        });
      } else if (result.status === "active_attempt_exists") {
        setStartState({
          step: "confirmEnding",
          activeAttemptId: result.activeAttemptId,
        });
      } else {
        setStartState({
          step: "failed",
          message: "This Scenario is no longer available to you.",
        });
      }
    } catch {
      setStartState({
        step: "failed",
        message: "The Attempt could not be started. Try again.",
      });
    }
  };

  return (
    <LearnerBriefView
      brief={brief}
      startState={startState}
      onStart={() => {
        if (brief.activeAttemptId) {
          setStartState({
            step: "confirmEnding",
            activeAttemptId: brief.activeAttemptId,
          });
        } else {
          void runStart();
        }
      }}
      onConfirmEnding={(activeAttemptId) =>
        void runStart(activeAttemptId)
      }
      onCancelEnding={() => setStartState({ step: "idle" })}
    />
  );
}

function Attempt({ attemptId }: { attemptId: string }) {
  const attempt = useQuery(api.attemptStart.access.ownAttempt, { attemptId });
  const send = useMutation(api.attemptInteraction.access.send);
  const retry = useMutation(api.attemptInteraction.access.retry);
  const [draft, setDraft] = useState("");
  // A message whose send has not been acknowledged keeps its request id, so
  // sending the same text again cannot record it twice.
  const [unsent, setUnsent] = useState<{
    clientRequestId: string;
    text: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  if (attempt === undefined) {
    return <AccessLoadingView message="Restoring your Attempt" />;
  }
  if (attempt === null) {
    return <AttemptNotFoundView />;
  }
  const firstName = attempt.scenario.patientName.split(" ")[0];

  const runCommand = async (
    command: () => Promise<SendResult>,
    failureNotice: string,
  ) => {
    setSubmitting(true);
    setNotice(null);
    try {
      const result = await command();
      setUnsent(null);
      if (result.status === "pending" || result.status === "completed") {
        return true;
      }
      setNotice(
        result.status === "busy"
          ? `Wait for ${firstName} to respond before sending another message.`
          : result.status === "ended"
            ? "This Attempt has ended and no longer accepts messages."
            : "That message can no longer be answered. Send a new message instead.",
      );
    } catch {
      setNotice(failureNotice);
    } finally {
      setSubmitting(false);
    }
    return false;
  };

  const composer: ComposerProps = {
    draft,
    onDraftChange: setDraft,
    submitting,
    notice,
    onSend: () => {
      const text = draft.trim();
      const request =
        unsent?.text === text
          ? unsent
          : { clientRequestId: crypto.randomUUID(), text };
      setUnsent(request);
      void runCommand(
        () => send({ attemptId, ...request }),
        "Your message could not be sent. Check your connection and send it again.",
      ).then((accepted) => {
        if (accepted) {
          setDraft("");
        }
      });
    },
    onRetry: () => {
      const clientRequestId = attempt.exchange?.clientRequestId;
      if (clientRequestId) {
        void runCommand(
          () => retry({ attemptId, clientRequestId }),
          "The retry could not be sent. Check your connection and try again.",
        );
      }
    },
  };
  return <AttemptView attempt={attempt} composer={composer} />;
}
