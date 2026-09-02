import { isMembershipAccessConfigured } from "../env";
import { MembershipAccessPage } from "../features/membership-access";

export function HomePage() {
  if (isMembershipAccessConfigured) {
    return <MembershipAccessPage />;
  }

  return (
    <main className="mx-auto grid min-h-[calc(100vh-73px)] max-w-6xl items-center gap-12 px-5 py-16 lg:grid-cols-[1.25fr_0.75fr]">
      <section>
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-secondary">
          Clinical communication practice
        </p>
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-slate-950 sm:text-6xl">
          Practice the conversation before it matters.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
          Patient Proxy is becoming a focused pilot experience for Learners to
          interview a Simulated Patient, take Clinical Actions, and receive
          Formative Feedback.
        </p>
        <p className="mt-8 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-950">
          Configure Convex and WorkOS to enter the private pilot.
        </p>
      </section>
      <aside className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        <p className="text-sm font-semibold text-primary">Alpha path</p>
        <ol className="mt-5 space-y-4 text-sm text-slate-700">
          <li>1. Review a Learner Brief</li>
          <li>2. Interview the Simulated Patient</li>
          <li>3. Perform structured Clinical Actions</li>
          <li>4. Review the transcript and Attempt Debrief</li>
        </ol>
        <p className="mt-6 border-t border-slate-200 pt-5 text-xs leading-5 text-slate-500">
          Synthetic data only. Formative Feedback is educational guidance, not
          Clinical Truth or a formal assessment.
        </p>
      </aside>
    </main>
  );
}
