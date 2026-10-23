import { useAuth } from "@workos-inc/authkit-react";
import { useAction, useConvexAuth, useQuery } from "convex/react";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { api } from "@/convex/_generated/api";
import {
  AccessDeniedView,
  AccessErrorView,
  AccessLoadingView,
  MembershipDeactivatedView,
  MembershipHome,
  SignInView,
  type MembershipSummary,
} from "./view";

type AdmissionState =
  | {
      userId: string;
      status: "denied";
      reason:
        | "email_not_verified"
        | "not_on_roster"
        | "roster_entry_already_bound";
    }
  | { userId: string; status: "error" }
  | null;

const reviewLink = (
  <Link
    to="/review"
    className="inline-flex rounded-md bg-blue px-4 py-2 text-sm font-semibold text-white hover:bg-harbor focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
  >
    Review Ended Attempts
  </Link>
);

export function MembershipAccessPage() {
  return (
    <MembershipGate>
      {({ membership, signOut }) => (
        <MembershipHome
          membership={membership}
          onSignOut={signOut}
          journeyActions={{
            learner: (
              <div className="flex flex-wrap gap-3">
                <Link
                  to="/scenarios"
                  className="inline-flex rounded-md bg-blue px-4 py-2 text-sm font-semibold text-white hover:bg-harbor focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
                >
                  Open scenario list
                </Link>
                <Link
                  to="/attempts"
                  className="inline-flex rounded-md border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink-2 hover:border-ceil-2 hover:bg-neutral focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
                >
                  Your Ended Attempts
                </Link>
              </div>
            ),
            faculty: (
              <div className="flex flex-wrap gap-3">
                {reviewLink}
                <Link
                  to="/groups"
                  className="inline-flex rounded-md border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink-2 hover:border-ceil-2 hover:bg-neutral focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
                >
                  Learning Groups
                </Link>
              </div>
            ),
            // Same destinations as the header (navigation.tsx).
            institutionalAdmin: (
              <div className="flex flex-wrap gap-3">
                <Link
                  to="/admin/members"
                  className="inline-flex rounded-md bg-blue px-4 py-2 text-sm font-semibold text-white hover:bg-harbor focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
                >
                  Manage Members
                </Link>
                <Link
                  to="/review"
                  className="inline-flex rounded-md border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink-2 hover:border-ceil-2 hover:bg-neutral focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
                >
                  Review Ended Attempts
                </Link>
                <Link
                  to="/groups"
                  className="inline-flex rounded-md border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink-2 hover:border-ceil-2 hover:bg-neutral focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
                >
                  Learning Groups
                </Link>
              </div>
            ),
            // Recognized role; authoring is not built, so no dead link.
            author: (
              <p className="text-sm font-semibold text-ink-2">
                Authoring isn&apos;t available in this alpha yet.
              </p>
            ),
          }}
        />
      )}
    </MembershipGate>
  );
}

// Every alpha route renders through this gate: identity comes from WorkOS, but
// Membership and roles come only from Convex.
export function MembershipGate({
  children,
}: {
  children: (member: {
    membership: MembershipSummary;
    signOut: () => void;
  }) => ReactNode;
}) {
  const { isLoading: workosLoading, signIn, signOut, user } = useAuth();
  const { isAuthenticated, isLoading: convexLoading } = useConvexAuth();
  const membership = useQuery(
    api.membershipAccess.access.currentMembership,
    isAuthenticated ? {} : "skip",
  );
  const enterPilot = useAction(api.membershipAccess.access.enterPilot);
  const attemptedFor = useRef<string | null>(null);
  const [admission, setAdmission] = useState<AdmissionState>(null);

  useEffect(() => {
    if (
      !user ||
      !isAuthenticated ||
      membership !== null ||
      attemptedFor.current === user.id
    ) {
      return;
    }

    attemptedFor.current = user.id;
    void enterPilot({})
      .then((result) => {
        if (result.status === "denied") {
          setAdmission({
            userId: user.id,
            status: "denied",
            reason: result.reason,
          });
        }
      })
      .catch(() => {
        setAdmission({ userId: user.id, status: "error" });
      });
  }, [admission, enterPilot, isAuthenticated, membership, user]);

  if (workosLoading) {
    return <AccessLoadingView message="Restoring your sign-in" />;
  }
  if (!user) {
    return (
      <SignInView
        onSignIn={() => void signIn({ state: { returnTo: "/" } })}
      />
    );
  }
  if (convexLoading || !isAuthenticated || membership === undefined) {
    return <AccessLoadingView />;
  }
  if (membership?.status === "inactive") {
    // Known but deactivated: never treated as unregistered or re-admitted.
    return (
      <MembershipDeactivatedView
        onSignOut={() => signOut({ returnTo: window.location.origin })}
      />
    );
  }
  if (membership) {
    return children({
      membership,
      signOut: () => signOut({ returnTo: window.location.origin }),
    });
  }
  if (admission?.userId === user.id && admission.status === "denied") {
    return (
      <AccessDeniedView
        reason={admission.reason}
        onSignOut={() => signOut({ returnTo: window.location.origin })}
      />
    );
  }
  if (admission?.userId === user.id && admission.status === "error") {
    return (
      <AccessErrorView
        onRetry={() => {
          attemptedFor.current = null;
          setAdmission(null);
        }}
      />
    );
  }
  return <AccessLoadingView />;
}
