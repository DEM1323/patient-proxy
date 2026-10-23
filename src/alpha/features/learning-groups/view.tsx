import { Link } from "@tanstack/react-router";
import type { FunctionReturnType } from "convex/server";
import type { FormEvent } from "react";
import type { api } from "@/convex/_generated/api";
import { primaryButton } from "../attempt-start/view";
import { roleLabels } from "../institution-admin/view";

type Groups = FunctionReturnType<typeof api.learningGroups.access.learningGroups>;
type Group = Groups["groups"][number];

const link =
  "font-semibold text-blue-text hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue";
const sectionClass =
  "mt-8 rounded-2xl border border-line bg-surface p-7 shadow-sm";
const smallButton =
  "rounded-md border border-line bg-surface px-3 py-1.5 text-sm font-semibold text-ink-2 hover:border-ceil-2 hover:bg-neutral disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue";

export type GroupControls = {
  newGroupName: string;
  onNewGroupNameChange: (name: string) => void;
  onCreateGroup: () => void;
  onEnroll: (learningGroupId: string, membershipId: string) => void;
  onRemove: (learningGroupId: string, membershipId: string) => void;
  onSetAvailability: (learningGroupId: string, scenarioId: string, available: boolean) => void;
  submitting: boolean;
  notice: { tone: "success" | "error"; text: string } | null;
};

export function LearningGroupsView({
  controls,
  data,
}: {
  controls: GroupControls;
  data: Groups;
}) {
  return (
    <main className="mx-auto max-w-5xl px-5 py-12 sm:py-16">
      <Link to="/" className={`text-sm ${link}`}>
        ← Home
      </Link>
      <h1 className="mt-4 text-4xl font-bold tracking-tight text-ink">
        Learning Groups
      </h1>
      <p className="mt-3 max-w-2xl leading-7 text-ink-2">
        {data.canManageGroups
          ? "Groups decide which Scenarios Learners can start and which Ended Attempts Faculty can review. Faculty review an Attempt while they share a group with its Learner and that group makes the Scenario available."
          : "Your Learning Groups. You can change which Scenarios each one makes available; an Institutional Admin manages who belongs to them."}
      </p>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-3">
        Removing a Member or a Scenario takes effect immediately for new
        Attempts and for Faculty review. It never ends an Attempt already in
        progress.
      </p>
      {controls.notice && (
        <p
          role={controls.notice.tone === "error" ? "alert" : "status"}
          className={`mt-4 font-medium ${controls.notice.tone === "error" ? "text-red" : "text-teal"}`}
        >
          {controls.notice.text}
        </p>
      )}

      {data.canManageGroups && (
        <section aria-labelledby="create-group-title" className={sectionClass}>
          <h2 id="create-group-title" className="text-lg font-semibold text-ink">
            Create a Learning Group
          </h2>
          <form
            className="mt-3 flex flex-wrap items-end gap-3"
            onSubmit={(event: FormEvent) => {
              event.preventDefault();
              controls.onCreateGroup();
            }}
          >
            <div>
              <label htmlFor="group-name" className="block text-sm font-semibold text-ink-2">
                Group name
              </label>
              <input
                id="group-name"
                value={controls.newGroupName}
                maxLength={80}
                onChange={(event) => controls.onNewGroupNameChange(event.target.value)}
                className="mt-2 block w-72 rounded-lg border border-line px-4 py-2 text-ink focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue"
              />
            </div>
            <button
              type="submit"
              className={primaryButton}
              disabled={controls.submitting || controls.newGroupName.trim() === ""}
            >
              Create group
            </button>
          </form>
        </section>
      )}

      {data.groups.length === 0 ? (
        <p className={`${sectionClass} text-ink-2`}>
          {data.canManageGroups
            ? "No Learning Groups yet."
            : "You don't belong to any Learning Groups yet."}
        </p>
      ) : (
        data.groups.map((group) => (
          <GroupCard key={group.id} controls={controls} data={data} group={group} />
        ))
      )}
    </main>
  );
}

function GroupCard({
  controls,
  data,
  group,
}: {
  controls: GroupControls;
  data: Groups;
  group: Group;
}) {
  const enrolled = new Set(group.members.map(({ id }) => id));
  const candidates = data.institutionMembers.filter(({ id }) => !enrolled.has(id));
  const selectId = `enroll-${group.id}`;
  return (
    <section aria-label={group.name} className={sectionClass}>
      <h2 className="text-lg font-semibold text-ink">{group.name}</h2>

      <h3 className="mt-5 font-semibold text-ink">Available Scenarios</h3>
      {data.scenarios.length === 0 ? (
        <p className="mt-2 text-ink-2">No Published Scenarios yet.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {data.scenarios.map((scenario) => {
            const available = group.availableScenarioIds.includes(scenario.id);
            return (
              <li key={scenario.id}>
                <label className="flex items-center gap-2 text-ink-2">
                  <input
                    type="checkbox"
                    checked={available}
                    disabled={controls.submitting || !group.canChangeAvailability}
                    onChange={() =>
                      controls.onSetAvailability(group.id, scenario.id, !available)
                    }
                  />
                  {scenario.title}
                </label>
              </li>
            );
          })}
        </ul>
      )}

      <h3 className="mt-6 font-semibold text-ink">Members</h3>
      {group.members.length === 0 ? (
        <p className="mt-2 text-ink-2">No Members yet.</p>
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {group.members.map((member) => (
            <li key={member.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
              <span className="text-ink-2">
                {member.email}{" "}
                <span className="text-sm text-ink-3">
                  · {member.roles.map((role) => roleLabels[role]).join(", ")}
                  {member.status === "inactive" && " · Deactivated"}
                </span>
              </span>
              {data.canManageGroups && (
                <button
                  type="button"
                  className={smallButton}
                  disabled={controls.submitting}
                  onClick={() => controls.onRemove(group.id, member.id)}
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {data.canManageGroups && candidates.length > 0 && (
        <form
          className="mt-4 flex flex-wrap items-end gap-3"
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            const select = event.currentTarget.elements.namedItem(selectId) as HTMLSelectElement;
            if (select.value) {
              controls.onEnroll(group.id, select.value);
            }
          }}
        >
          <div>
            <label htmlFor={selectId} className="block text-sm font-semibold text-ink-2">
              Add a Member
            </label>
            <select
              id={selectId}
              name={selectId}
              defaultValue=""
              className="mt-2 block w-72 rounded-lg border border-line px-3 py-2 text-ink"
            >
              <option value="" disabled>
                Choose a Member
              </option>
              {candidates.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.email}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className={smallButton} disabled={controls.submitting}>
            Add to group
          </button>
        </form>
      )}
    </section>
  );
}

export function GroupReaderRequiredView() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-16">
      <h1 className="text-3xl font-bold tracking-tight text-ink">
        Faculty or Institutional Admin role required
      </h1>
      <p className="mt-4 leading-7 text-ink-2">
        Your Pilot Membership does not include a role that manages Learning Groups.
      </p>
      <Link to="/" className={`mt-6 inline-block ${link}`}>
        ← Home
      </Link>
    </main>
  );
}
