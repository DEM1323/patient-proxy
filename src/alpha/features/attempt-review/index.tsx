import { useQuery } from "convex/react";
import type { ReactNode } from "react";
import { api } from "@/convex/_generated/api";
import { MembershipGate } from "../membership-access";
import { AccessLoadingView } from "../membership-access/view";
import {
  ReviewDetailView,
  ReviewListView,
  ReviewNotAvailableView,
  ReviewerRoleRequiredView,
} from "./view";

export function ReviewListPage() {
  return (
    <ReviewerGate>
      <ReviewList />
    </ReviewerGate>
  );
}

export function ReviewDetailPage({ attemptId }: { attemptId: string }) {
  return (
    <ReviewerGate>
      <ReviewDetail attemptId={attemptId} />
    </ReviewerGate>
  );
}

// Hides review pages from other roles; Convex still authorizes every read.
function ReviewerGate({ children }: { children: ReactNode }) {
  return (
    <MembershipGate>
      {({ membership }) =>
        membership.roles.includes("faculty") ||
        membership.roles.includes("institutionalAdmin") ? (
          children
        ) : (
          <ReviewerRoleRequiredView />
        )
      }
    </MembershipGate>
  );
}

function ReviewList() {
  const attempts = useQuery(api.attemptReview.access.reviewableAttempts, {});
  if (attempts === undefined) {
    return <AccessLoadingView message="Loading Ended Attempts for review" />;
  }
  return <ReviewListView attempts={attempts} />;
}

function ReviewDetail({ attemptId }: { attemptId: string }) {
  const review = useQuery(api.attemptReview.access.reviewAttempt, { attemptId });
  if (review === undefined) {
    return <AccessLoadingView message="Loading the Ended Attempt" />;
  }
  if (review === null) {
    return <ReviewNotAvailableView />;
  }
  return <ReviewDetailView review={review} />;
}
