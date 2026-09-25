import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { useState, type ReactNode } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { MembershipGate } from "../membership-access";
import { AccessLoadingView } from "../membership-access/view";
import {
  AttemptNotFoundView,
  AttemptView,
  LearnerBriefView,
  LearnerRoleRequiredView,
  ScenarioListView,
  ScenarioUnavailableView,
  type StartState,
} from "./view";

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
  if (attempt === undefined) {
    return <AccessLoadingView message="Restoring your Attempt" />;
  }
  if (attempt === null) {
    return <AttemptNotFoundView />;
  }
  return <AttemptView attempt={attempt} />;
}
