import { useAuth } from "@workos-inc/authkit-react";
import { useAction, useConvexAuth, useQuery } from "convex/react";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { api } from "@/convex/_generated/api";
import {
  AccessDeniedView,
  AccessErrorView,
  AccessLoadingView,
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

export function MembershipAccessPage() {
  return (
    <MembershipGate>
      {({ membership, signOut }) => (
        <MembershipHome
          membership={membership}
          onSignOut={signOut}
          journeyActions={{
            learner: (
              <Link
                to="/scenarios"
                className="inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Open scenario list
              </Link>
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
