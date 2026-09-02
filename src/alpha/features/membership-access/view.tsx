import type { MembershipRole } from "@/convex/membershipAccess/roles";

type AccessDenialReason =
  | "email_not_verified"
  | "not_on_roster"
  | "roster_entry_already_bound";

export type MembershipSummary = {
  id: string;
  institution: { id: string; key: string; name: string };
  roles: MembershipRole[];
};

const journeyDetails: Record<
  MembershipRole,
  { eyebrow: string; title: string; description: string; accent: string }
> = {
  learner: {
    eyebrow: "Learner journey",
    title: "Practice with Elena Ruiz",
    description:
      "Review the Learner Brief, complete a communication Attempt, and revisit your Attempt Debrief.",
    accent: "border-sky-200 bg-sky-50",
  },
  faculty: {
    eyebrow: "Faculty journey",
    title: "Review completed Attempts",
    description:
      "Find Ended Attempts in your authorized Learning Groups and review their evidence.",
    accent: "border-violet-200 bg-violet-50",
  },
  author: {
    eyebrow: "Author journey",
    title: "Shape learning content",
    description:
      "Authoring remains intentionally outside this alpha journey, but your role is recognized.",
    accent: "border-amber-200 bg-amber-50",
  },
  institutionalAdmin: {
    eyebrow: "Institutional Admin journey",
    title: "Oversee the pilot",
    description:
      "Review institution-wide participation without inheriting Learner or Faculty permissions.",
    accent: "border-emerald-200 bg-emerald-50",
  },
};

export function MembershipHome({
  membership,
  onSignOut,
}: {
  membership: MembershipSummary;
  onSignOut: () => void;
}) {
  return (
    <main className="mx-auto max-w-6xl px-5 py-12 sm:py-16">
      <div className="flex flex-col gap-6 border-b border-slate-200 pb-9 sm:flex-row sm:items-end sm:justify-between">
        <section>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-secondary">
            {membership.institution.name}
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
            Choose where you want to begin.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
            Your Pilot Membership makes each assigned role available separately.
            One role never grants another role&apos;s permissions.
          </p>
        </section>
        <button
          type="button"
          onClick={onSignOut}
          className="w-fit rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Sign out
        </button>
      </div>

      <div className="mt-9 grid gap-5 md:grid-cols-2">
        {membership.roles.map((role) => {
          const journey = journeyDetails[role];
          return (
            <section
              key={role}
              className={`rounded-2xl border p-6 shadow-sm ${journey.accent}`}
            >
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-600">
                {journey.eyebrow}
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                {journey.title}
              </h2>
              <p className="mt-3 leading-7 text-slate-700">{journey.description}</p>
              <p className="mt-6 text-sm font-semibold text-primary">Journey available</p>
            </section>
          );
        })}
      </div>
    </main>
  );
}

export function SignInView({ onSignIn }: { onSignIn: () => void }) {
  return (
    <main className="mx-auto grid min-h-[calc(100vh-73px)] max-w-6xl items-center gap-12 px-5 py-16 lg:grid-cols-[1.2fr_0.8fr]">
      <section>
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-secondary">
          UMB pilot alpha
        </p>
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-slate-950 sm:text-6xl">
          Practice the conversation before it matters.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
          Sign in with the exact Google identity approved for the private pilot.
          Authentication alone does not grant access.
        </p>
        <button
          type="button"
          onClick={onSignIn}
          className="mt-8 inline-flex rounded-md bg-primary px-5 py-3 font-semibold text-white shadow-sm hover:bg-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Sign in with Google
        </button>
      </section>
      <aside className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        <p className="text-sm font-semibold text-primary">Private pilot</p>
        <p className="mt-4 leading-7 text-slate-600">
          Patient Proxy supports supervised clinical communication practice with
          Simulated Patients using synthetic data only.
        </p>
        <p className="mt-6 border-t border-slate-200 pt-5 text-xs leading-5 text-slate-500">
          Formative Feedback is educational guidance, not Clinical Truth or a
          formal assessment.
        </p>
      </aside>
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
    email_not_verified: "WorkOS could not confirm a verified email for this identity.",
    not_on_roster: "This identity is not on the private Pilot Roster.",
    roster_entry_already_bound:
      "This approved Pilot Roster identity is already bound to another sign-in.",
  }[reason];

  return (
    <main className="mx-auto flex min-h-[calc(100vh-73px)] max-w-3xl items-center px-5 py-16">
      <section className="w-full rounded-2xl border border-amber-200 bg-amber-50 p-8 shadow-sm sm:p-10">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-800">
          Access not approved
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
          {explanation}
        </h1>
        <p className="mt-4 max-w-xl leading-7 text-slate-700">
          No Pilot Membership was created. Contact the pilot&apos;s Institutional
          Admin to confirm the exact Google email approved for your participation.
        </p>
        <button
          type="button"
          onClick={onSignOut}
          className="mt-7 rounded-md border border-amber-300 bg-white px-4 py-2 font-semibold text-amber-950 hover:bg-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-800"
        >
          Sign out and try another identity
        </button>
      </section>
    </main>
  );
}

export function AccessLoadingView({ message = "Checking your Pilot Membership" }) {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-73px)] max-w-3xl items-center justify-center px-5 py-16">
      <div className="text-center" role="status">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-primary" />
        <p className="mt-5 font-semibold text-slate-700">{message}</p>
      </div>
    </main>
  );
}

export function AccessErrorView({ onRetry }: { onRetry: () => void }) {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-73px)] max-w-3xl items-center px-5 py-16">
      <section className="w-full rounded-2xl border border-rose-200 bg-rose-50 p-8 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight text-slate-950">
          We could not check your Pilot Membership.
        </h1>
        <p className="mt-3 leading-7 text-slate-700">
          Your access has not been changed. Try the check again, or contact the
          pilot&apos;s Institutional Admin if the problem continues.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-6 rounded-md bg-primary px-4 py-2 font-semibold text-white hover:bg-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Try again
        </button>
      </section>
    </main>
  );
}
