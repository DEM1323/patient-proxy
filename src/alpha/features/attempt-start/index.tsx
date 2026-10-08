import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useState, type ReactNode } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useSessionState } from "../../session-state";
import { AttemptDebrief } from "../attempt-debrief";
import { MembershipGate } from "../membership-access";
import { AccessLoadingView } from "../membership-access/view";
import {
  AttemptNotFoundView,
  type ActionPanelProps,
  AttemptView,
  type ComposerProps,
  endingMinimum,
  type EndingProps,
  LearnerBriefView,
  LearnerRoleRequiredView,
  ScenarioListView,
  ScenarioUnavailableView,
  type StartState,
} from "./view";

type SendResult = FunctionReturnType<
  typeof api.attemptInteraction.access.send
>;
type StartRequest = {
  clientRequestId: string;
  endActiveAttemptId?: Id<"attempts">;
};

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
      <LearnerBrief key={scenarioId} scenarioId={scenarioId} />
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

// Also used by learner-attempt-history; the backend still enforces the role.
export function LearnerGate({ children }: { children: ReactNode }) {
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
  // A Start without a definitive answer keeps its request id, even across a
  // reload, so starting again returns the Attempt it may already have created.
  const [pendingStart, setPendingStart] = useSessionState<StartRequest>(
    `start:${scenarioId}`,
  );

  if (brief === undefined) {
    return <AccessLoadingView message="Loading the Learner Brief" />;
  }
  if (brief.status === "unavailable") {
    return <ScenarioUnavailableView />;
  }

  const runStart = async (request: StartRequest) => {
    setPendingStart(request);
    setStartState({ step: "starting" });
    try {
      const result = await start({ scenarioId, ...request });
      setPendingStart(null);
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
        if (pendingStart) {
          void runStart(pendingStart);
        } else if (brief.activeAttemptId) {
          setStartState({
            step: "confirmEnding",
            activeAttemptId: brief.activeAttemptId,
          });
        } else {
          void runStart({ clientRequestId: crypto.randomUUID() });
        }
      }}
      onConfirmEnding={(activeAttemptId) =>
        void runStart({
          clientRequestId: crypto.randomUUID(),
          endActiveAttemptId: activeAttemptId,
        })
      }
      onCancelEnding={() => setStartState({ step: "idle" })}
    />
  );
}

function Attempt({ attemptId }: { attemptId: string }) {
  const attempt = useQuery(api.attemptStart.access.ownAttempt, { attemptId });
  const send = useMutation(api.attemptInteraction.access.send);
  const retry = useMutation(api.attemptInteraction.access.retry);
  const takeAction = useMutation(api.attemptInteraction.access.takeAction);
  const end = useMutation(api.attemptEnding.access.end);
  const [draft, setDraft] = useState("");
  // A message whose send has not been acknowledged keeps its request id, so
  // sending the same text again cannot record it twice.
  const [unsent, setUnsent] = useState<{
    clientRequestId: string;
    text: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  // An action whose response was lost keeps its request id, so Retry can
  // never record it twice; choosing an action again is a new occurrence.
  const [unsentAction, setUnsentAction] = useState<{
    clientRequestId: string;
    actionKey: string;
  } | null>(null);
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  const [endSubmitting, setEndSubmitting] = useState(false);
  const [endNotice, setEndNotice] = useState<string | null>(null);

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
  const runAction = async (request: {
    clientRequestId: string;
    actionKey: string;
  }) => {
    setUnsentAction(request);
    setActionSubmitting(true);
    setActionNotice(null);
    try {
      const result = await takeAction({ attemptId, ...request });
      setUnsentAction(null);
      if (result.status !== "recorded") {
        setActionNotice(
          result.status === "ended"
            ? "This Attempt has ended and no longer accepts Clinical Actions."
            : "This Attempt is not available.",
        );
      }
    } catch {
      setActionNotice(
        "The Clinical Action could not be confirmed. Check your connection and retry it.",
      );
    } finally {
      setActionSubmitting(false);
    }
  };
  const actionPanel: ActionPanelProps = {
    submitting: actionSubmitting,
    notice: actionNotice,
    canRetry: unsentAction !== null,
    onAction: (actionKey) =>
      void runAction({ clientRequestId: crypto.randomUUID(), actionKey }),
    onRetryAction: () => {
      if (unsentAction) {
        void runAction(unsentAction);
      }
    },
  };
  const ending: EndingProps = {
    confirming: confirmingEnd,
    submitting: endSubmitting,
    notice: endNotice,
    onRequestEnd: () => {
      setEndNotice(null);
      setConfirmingEnd(true);
    },
    onCancelEnd: () => {
      setEndNotice(null);
      setConfirmingEnd(false);
    },
    onConfirmEnd: () => {
      setEndSubmitting(true);
      setEndNotice(null);
      end({ attemptId, confirmed: true })
        .then((result) => {
          if (result.status === "ended") {
            setConfirmingEnd(false);
          } else {
            setConfirmingEnd(false);
            setEndNotice(
              result.status === "too_early"
                ? endingMinimum
                : "This Attempt is not available.",
            );
          }
        })
        .catch(() => {
          // Ending is idempotent, so confirming again is a safe retry.
          setEndNotice(
            "Ending could not be confirmed. Check your connection and select End Attempt again.",
          );
        })
        .finally(() => setEndSubmitting(false));
    },
  };
  return (
    <AttemptView
      actionPanel={actionPanel}
      attempt={attempt}
      composer={composer}
      ending={ending}
      debrief={<AttemptDebrief attemptId={attemptId} />}
    />
  );
}
