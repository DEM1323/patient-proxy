import { Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Page, Table, Empty, textLink } from "../../ui/primitives";
import { button } from "../../ui/button";
import { ScenarioCards } from "../attempt-start/view";
import { AttemptHistoryTable } from "../learner-attempt-history/view";
import { ReviewTable } from "../attempt-review/view";
import { AuditLogView } from "../institution-admin/view";
import type { MembershipSummary } from "./view";

// Each role section reads only that role's existing authorized queries.
export function RoleHome({ membership }: { membership: MembershipSummary }) {
  const admin = membership.roles.includes("institutionalAdmin");
  const faculty = membership.roles.includes("faculty");
  const learner = membership.roles.includes("learner");
  return (
    <Page
      title={
        admin
          ? membership.institution.name
          : faculty
            ? "Review"
            : learner
              ? "Practice"
              : "Welcome"
      }
      description={
        admin
          ? "Manage participation, Learning Groups, and Scenario availability."
          : faculty
            ? "Ended Attempts within your current Learning Group and Scenario scope."
            : learner
              ? "Scenarios your Learning Groups make available to you."
              : undefined
      }
    >
      <div className="space-y-8">
        {admin && <InstitutionOverview />}
        {!admin && faculty && <FacultyOverview />}
        {learner && (
          <section aria-label="Learner journey" className="space-y-7">
            {(admin || faculty) && (
              <h2 className="text-heading font-bold">Your practice</h2>
            )}
            <PracticeOverview />
          </section>
        )}
        {!admin && !faculty && !learner && (
          <Empty title="Scenario authoring isn’t available yet">
            You hold the Author role. Ask your Institutional Admin to add
            Learner or Faculty if you also need to practice or review.
          </Empty>
        )}
      </div>
    </Page>
  );
}

function PracticeOverview() {
  const scenarios = useQuery(api.attemptStart.access.availableScenarios, {});
  const attempts = useQuery(
    api.learnerAttemptHistory.access.ownEndedAttempts,
    {},
  );
  return (
    <>
      <ScenarioCards scenarios={scenarios} />
      {attempts === undefined ? (
        <p role="status">Loading your recent Attempts…</p>
      ) : (
        attempts.length > 0 && (
          <AttemptHistoryTable
            attempts={attempts.slice(0, 5)}
            label="Your recent Attempts"
          />
        )
      )}
      <Link className={textLink} to="/attempts">
        Your Attempts
      </Link>
    </>
  );
}

function FacultyOverview() {
  const attempts = useQuery(api.attemptReview.access.reviewableAttempts, {});
  const groups = useQuery(api.learningGroups.access.learningGroups, {});
  return (
    <section
      aria-label="Faculty journey"
      className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,1fr)]"
    >
      <div>
        {attempts === undefined ? (
          <p role="status">Loading recently ended Attempts…</p>
        ) : (
          <ReviewTable attempts={attempts.slice(0, 5)} />
        )}
      </div>
      <div>
        {groups && (
          <Table label="Your Learning Groups">
            <thead>
              <tr>
                <th>Your Learning Groups</th>
                <th>
                  <span className="sr-only">Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {groups.groups.map((group) => (
                <tr key={group.id}>
                  <td>
                    <strong>{group.name}</strong>
                    <p className="text-small text-ink-2">
                      {
                        group.members.filter((m) => m.roles.includes("learner"))
                          .length
                      }{" "}
                      Learners, {group.availableScenarioIds.length} Scenarios
                      available
                    </p>
                  </td>
                  <td>
                    <Link to="/groups" className={textLink}>
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>
    </section>
  );
}

function InstitutionOverview() {
  const data = useQuery(api.institutionAdmin.access.members, {});
  const groups = useQuery(api.learningGroups.access.learningGroups, {});
  const attempts = useQuery(api.attemptReview.access.reviewableAttempts, {});
  const audit = useQuery(api.institutionAdmin.access.auditLog, {});
  if (!data || !groups || !attempts)
    return <p role="status">Loading your institution…</p>;
  const active = data.members.filter((m) => m.status === "active");
  const enrolled = new Set(
    groups.groups.flatMap((g) => g.members.map((m) => m.id)),
  );
  const ungrouped = active.filter(
    (m) => m.roles.includes("learner") && !enrolled.has(m.id),
  );
  const unavailable = groups.groups.filter(
    (g) => g.availableScenarioIds.length === 0,
  );
  const counts = [
    ["Members", data.members.length],
    ["Learners", active.filter((m) => m.roles.includes("learner")).length],
    ["Faculty", active.filter((m) => m.roles.includes("faculty")).length],
    ["Learning Groups", groups.groups.length],
    ["Ended Attempts", attempts.length],
  ] as const;
  return (
    <section aria-label="Institutional Admin journey" className="space-y-7">
      <Link to="/admin/members" className={button()}>
        Pre-approve an identity
      </Link>
      <dl className="grid grid-cols-2 gap-4 rounded-xl border border-line bg-surface p-6 sm:grid-cols-3 xl:grid-cols-5">
        {counts.map(([name, count]) => (
          <div key={name}>
            <dd className="text-title font-extrabold">{count}</dd>
            <dt className="mt-1 text-small text-ink-2">{name}</dt>
          </div>
        ))}
      </dl>
      <div className="grid gap-7 xl:grid-cols-2">
        <section>
          <h2 className="mb-4 text-heading font-bold">Needs attention</h2>
          <ul className="divide-y divide-line rounded-lg border border-line bg-surface px-5">
            {data.pending.length > 0 && (
              <li className="py-4">
                <Link to="/admin/members" className={textLink}>
                  {data.pending.length} approved identities waiting for first
                  sign-in
                </Link>
              </li>
            )}
            {ungrouped.length > 0 && (
              <li className="py-4">
                <Link to="/groups" className={textLink}>
                  {ungrouped.length} Learners without a Learning Group
                </Link>
              </li>
            )}
            {unavailable.map((g) => (
              <li className="py-4" key={g.id}>
                <Link to="/groups" className={textLink}>
                  {g.name} has no Scenario available
                </Link>
              </li>
            ))}
            {data.pending.length === 0 &&
              ungrouped.length === 0 &&
              unavailable.length === 0 && (
                <li className="py-4 text-ink-2">
                  No participation issues need your attention.
                </li>
              )}
          </ul>
        </section>
        <AuditLogView compact entries={audit?.slice(0, 5)} />
      </div>
    </section>
  );
}
