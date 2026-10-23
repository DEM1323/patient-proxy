import type { MembershipRole } from "@/convex/membershipAccess/roles";
import { button } from "../../ui/button";

type AccessDenialReason =
  "email_not_verified" | "not_on_roster" | "roster_entry_already_bound";

export type MembershipSummary = {
  id: string;
  institution: { id: string; key: string; name: string };
  roles: MembershipRole[];
  status: "active" | "inactive";
};

// The landing (Figma 01). Its sample bedside conversation is left out: the
// sample showed Elena's authored observations, which are hidden Clinical
// Truth until a Learner's own Clinical Action reveals them.
export function SignInView({ onSignIn }: { onSignIn: () => void }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between gap-4 px-5 py-7 sm:px-[72px]">
        <div className="flex flex-col">
          <span className="text-[22px] font-extrabold leading-tight text-blue-text">
            Patient Proxy
          </span>
          <span className="text-small text-ink-2">
            UMass Boston nursing pilot
          </span>
        </div>
        <button
          type="button"
          onClick={onSignIn}
          className={button("secondary")}
        >
          Sign in with Google
        </button>
      </header>
      <main className="flex flex-1 items-center px-5 pb-10 pt-6 sm:px-[72px]">
        <section className="flex max-w-[680px] flex-col gap-[26px]">
          <h1 className="text-[44px] font-extrabold leading-[1.02] tracking-[-0.035em] text-blue-text sm:text-[64px]">
            Practice the conversation before it matters.
          </h1>
          <p className="max-w-[34ch] text-[19px] leading-normal text-ink-2">
            Talk with a Simulated Patient at the bedside, take Clinical Actions,
            then reflect on feedback tied to what you actually said.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={onSignIn}
              className={`${button("primary")} h-12 px-[22px] text-base`}
            >
              Sign in with Google
            </button>
            <span className="max-w-[30ch] text-small text-ink-2">
              Use the exact Google account your instructor approved. Signing in
              alone doesn&apos;t grant access.
            </span>
          </div>
        </section>
      </main>
      <footer className="flex flex-wrap justify-between gap-2 border-t border-line px-5 py-[22px] text-small text-ink-2 sm:px-[72px]">
        <span>
          Synthetic patients only. Formative Feedback is educational guidance,
          not a grade or competency assessment.
        </span>
        <span>IT 478 independent study, UMass Boston</span>
      </footer>
    </div>
  );
}

// A known Member whose participation an Institutional Admin deactivated.
// Their records are kept; they are not asked to sign up again.
export function MembershipDeactivatedView({
  onSignOut,
}: {
  onSignOut: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-5 py-16">
      <section className="w-full rounded-2xl border border-line bg-surface p-8 shadow-sm sm:p-10">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-ink-2">
          Membership deactivated
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink">
          Your Pilot Membership is currently deactivated.
        </h1>
        <p className="mt-4 max-w-xl leading-7 text-ink-2">
          Your saved Attempts and reflections are kept. Contact your
          institution&apos;s Institutional Admin if you expected to have access.
        </p>
        <button
          type="button"
          onClick={onSignOut}
          className="mt-7 rounded-md border border-line bg-surface px-4 py-2 font-semibold text-ink-2 hover:bg-neutral focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
        >
          Sign out
        </button>
      </section>
    </main>
  );
}

export function AccessDeniedView({
  onSignOut,
  reason,
}: {
  onSignOut: () => void;
  reason: AccessDenialReason;
}) {
  const explanation = {
    email_not_verified:
      "WorkOS could not confirm a verified email for this identity.",
    not_on_roster: "This identity is not on the private Pilot Roster.",
    roster_entry_already_bound:
      "This approved Pilot Roster identity is already bound to another sign-in.",
  }[reason];

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-5 py-16">
      <section className="w-full rounded-2xl border border-amber-line bg-amber-tint p-8 shadow-sm sm:p-10">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-ink">
          Access not approved
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink">
          {explanation}
        </h1>
        <p className="mt-4 max-w-xl leading-7 text-ink-2">
          No Pilot Membership was created. Contact the pilot&apos;s
          Institutional Admin to confirm the exact Google email approved for
          your participation.
        </p>
        <button
          type="button"
          onClick={onSignOut}
          className="mt-7 rounded-md border border-amber-line bg-surface px-4 py-2 font-semibold text-amber-ink hover:bg-amber-tint focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-ink"
        >
          Sign out and try another identity
        </button>
      </section>
    </main>
  );
}

export function AccessLoadingView({
  message = "Checking your Pilot Membership",
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-5 py-16">
      <div className="text-center" role="status">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-line border-t-blue" />
        <p className="mt-5 font-semibold text-ink-2">{message}</p>
      </div>
    </main>
  );
}

export function AccessErrorView({ onRetry }: { onRetry: () => void }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-5 py-16">
      <section className="w-full rounded-2xl border border-red-line bg-red-tint p-8 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight text-ink">
          We could not check your Pilot Membership.
        </h1>
        <p className="mt-3 leading-7 text-ink-2">
          Your access has not been changed. Try the check again, or contact the
          pilot&apos;s Institutional Admin if the problem continues.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-6 rounded-md bg-blue px-4 py-2 font-semibold text-white hover:bg-harbor focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
        >
          Try again
        </button>
      </section>
    </main>
  );
}
