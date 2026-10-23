import { isMembershipAccessConfigured } from "../env";
import { MembershipAccessPage } from "../features/membership-access";

export function HomePage() {
  if (isMembershipAccessConfigured) {
    return <MembershipAccessPage />;
  }

  return (
    <main className="mx-auto grid min-h-screen max-w-6xl items-center gap-12 px-5 py-16 lg:grid-cols-[1.25fr_0.75fr]">
      <section>
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-blue-text">
          Clinical communication practice
        </p>
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-ink sm:text-6xl">
          Practice the conversation before it matters.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-ink-2">
          Patient Proxy is becoming a focused pilot experience for Learners to
          interview a Simulated Patient, take Clinical Actions, and receive
          Formative Feedback.
        </p>
        <p className="mt-8 rounded-lg border border-amber-line bg-amber-tint px-4 py-3 text-sm font-medium text-amber-ink">
          Configure Convex and WorkOS to enter the private pilot.
        </p>
      </section>
      <aside className="rounded-2xl border border-line bg-surface p-7 shadow-sm">
        <p className="text-sm font-semibold text-blue-text">Alpha path</p>
        <ol className="mt-5 space-y-4 text-sm text-ink-2">
          <li>1. Review a Learner Brief</li>
          <li>2. Interview the Simulated Patient</li>
          <li>3. Perform structured Clinical Actions</li>
          <li>4. Review the transcript and Attempt Debrief</li>
        </ol>
        <p className="mt-6 border-t border-line pt-5 text-xs leading-5 text-ink-3">
          Synthetic data only. Formative Feedback is educational guidance, not
          Clinical Truth or a formal assessment.
        </p>
      </aside>
    </main>
  );
}
