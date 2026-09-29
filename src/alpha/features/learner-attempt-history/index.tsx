import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { LearnerGate } from "../attempt-start";
import { AccessLoadingView } from "../membership-access/view";
import { AttemptHistoryView } from "./view";

export function AttemptHistoryPage() {
  return (
    <LearnerGate>
      <AttemptHistory />
    </LearnerGate>
  );
}

function AttemptHistory() {
  const attempts = useQuery(api.learnerAttemptHistory.access.ownEndedAttempts, {});
  if (attempts === undefined) {
    return <AccessLoadingView message="Loading your Ended Attempts" />;
  }
  return <AttemptHistoryView attempts={attempts} />;
}
