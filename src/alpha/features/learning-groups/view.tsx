import { Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import type { FunctionReturnType } from "convex/server";
import type { api } from "@/convex/_generated/api";
import { button } from "../../ui/button";
import {
  Badge,
  Empty,
  Modal,
  Notice,
  Page,
  textLink,
} from "../../ui/primitives";
import { RoleSummary } from "../../ui/roles";
type Groups = FunctionReturnType<
  typeof api.learningGroups.access.learningGroups
>;
type Group = Groups["groups"][number];
const link = textLink;
export type GroupControls = {
  newGroupName: string;
  onNewGroupNameChange: (name: string) => void;
  onCreateGroup: () => void;
  onEnroll: (learningGroupId: string, membershipId: string) => void;
  onRemove: (learningGroupId: string, membershipId: string) => void;
  onSetAvailability: (
    learningGroupId: string,
    scenarioId: string,
    available: boolean,
  ) => void;
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
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const group = data.groups.find((g) => g.id === selected) ?? data.groups[0];
  return (
    <Page
      title="Learning Groups"
      description={
        data.canManageGroups
          ? "A group decides which Scenarios its Learners can start and which Ended Attempts its Faculty can review."
          : "Your groups. Change Scenario availability for Learners and the review access granted by each group."
      }
      action={
        data.canManageGroups && (
          <button
            type="button"
            className={button()}
            onClick={() => setCreating(true)}
          >
            New group
          </button>
        )
      }
    >
      {controls.notice && (
        <div className="mb-5">
          <Notice tone={controls.notice.tone}>{controls.notice.text}</Notice>
        </div>
      )}
      {group ? (
        <div className="grid min-w-0 gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <nav
            aria-label="Learning Groups"
            className="h-fit overflow-hidden rounded-lg border border-line bg-surface"
          >
            {data.groups.map((g) => (
              <button
                type="button"
                key={g.id}
                aria-pressed={g.id === group.id}
                onClick={() => setSelected(g.id)}
                className={
                  "block w-full border-b border-line-2 px-5 py-4 text-left last:border-0 " +
                  (g.id === group.id ? "bg-ceil" : "hover:bg-sunken")
                }
              >
                <strong className={g.id === group.id ? "text-blue-text" : ""}>
                  {g.name}
                </strong>
                <p className="mt-1 text-small text-ink-2">
                  {g.members.length} Members, {g.availableScenarioIds.length}{" "}
                  Scenarios available
                </p>
              </button>
            ))}
          </nav>
          <GroupCard
            key={group.id}
            controls={controls}
            data={data}
            group={group}
          />
        </div>
      ) : (
        <Empty
          title={
            data.canManageGroups
              ? "No Learning Groups yet."
              : "You don’t belong to any Learning Groups yet."
          }
        />
      )}
      <p className="mt-5 max-w-[95ch] text-small text-ink-3">
        Removing a Member or a Scenario takes effect immediately for new
        Attempts and for Faculty review. It never ends an Attempt already in
        progress. Another shared Learning Group may still grant review access.
      </p>
      {creating && (
        <Modal
          title="Create a Learning Group"
          onClose={() => setCreating(false)}
        >
          <form
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              controls.onCreateGroup();
            }}
          >
            <label htmlFor="group-name" className="font-semibold">
              Group name
            </label>
            <input
              autoFocus
              id="group-name"
              className="proxy-input mt-2"
              value={controls.newGroupName}
              maxLength={80}
              onChange={(e) => controls.onNewGroupNameChange(e.target.value)}
            />
            {controls.notice && (
              <div className="mt-3">
                <Notice tone={controls.notice.tone}>
                  {controls.notice.text}
                </Notice>
              </div>
            )}
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                className={button("quiet")}
                onClick={() => setCreating(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={button()}
                disabled={controls.submitting || !controls.newGroupName.trim()}
              >
                Create group
              </button>
            </div>
          </form>
        </Modal>
      )}
    </Page>
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
  const enrolled = new Set(group.members.map((m) => m.id));
  const candidates = data.institutionMembers.filter(
    (m) => !enrolled.has(m.id) && m.status === "active",
  );
  const selectId = "enroll-" + group.id;
  return (
    <section
      aria-label={group.name}
      className="min-w-0 space-y-6 rounded-xl border border-line bg-surface p-6"
    >
      <h2 className="text-heading font-bold">{group.name}</h2>
      {!data.canManageGroups && (
        <Notice>
          <strong>You can change Scenario availability.</strong>
          <p>
            Only an Institutional Admin can create groups or add and remove
            Members.
          </p>
        </Notice>
      )}
      <div>
        <h3 className="mb-3 font-bold">Available Scenarios</h3>
        {!data.scenarios.length ? (
          <p className="text-ink-2">No Published Scenarios yet.</p>
        ) : (
          <ul className="space-y-2">
            {data.scenarios.map((scenario) => {
              const available = group.availableScenarioIds.includes(
                scenario.id,
              );
              return (
                <li key={scenario.id}>
                  <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-line p-3.5">
                    <span className="font-semibold">{scenario.title}</span>
                    <span className="relative shrink-0">
                      <input
                        aria-label={scenario.title}
                        type="checkbox"
                        className="peer sr-only"
                        checked={available}
                        disabled={
                          controls.submitting || !group.canChangeAvailability
                        }
                        onChange={() =>
                          controls.onSetAvailability(
                            group.id,
                            scenario.id,
                            !available,
                          )
                        }
                      />
                      <span className="block h-[22px] w-[38px] rounded-full bg-neutral peer-checked:bg-blue peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-blue peer-disabled:opacity-50">
                        <span
                          className={
                            "absolute top-[3px] block h-4 w-4 rounded-full bg-on-blue " +
                            (available ? "left-[19px]" : "left-[3px]")
                          }
                        />
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <div>
        <h3 className="mb-3 font-bold">Members</h3>
        {!group.members.length ? (
          <p className="text-ink-2">No Members yet.</p>
        ) : (
          <ul className="divide-y divide-line-2 rounded-lg border border-line">
            {group.members.map((member) => (
              <li
                key={member.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
              >
                <span className="min-w-0 flex-1 break-all text-ui font-bold">
                  {member.email}
                </span>
                <span className="flex flex-wrap gap-1.5">
                  <RoleSummary roles={member.roles} />
                  {member.status === "inactive" && (
                    <Badge tone="amber">Deactivated</Badge>
                  )}
                </span>
                {data.canManageGroups && (
                  <button
                    type="button"
                    className={button("danger", "sm")}
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
      </div>
      {data.canManageGroups && candidates.length > 0 && (
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            const select = event.currentTarget.elements.namedItem(
              selectId,
            ) as HTMLSelectElement;
            if (select.value) controls.onEnroll(group.id, select.value);
          }}
        >
          <div className="min-w-0 flex-1">
            <label htmlFor={selectId} className="sr-only">
              Add a Member
            </label>
            <select
              id={selectId}
              name={selectId}
              defaultValue=""
              className="proxy-input"
            >
              <option value="" disabled>
                Choose a Member
              </option>
              {candidates.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.email}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className={button("secondary")}
            disabled={controls.submitting}
          >
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
        Your Pilot Membership does not include a role that manages Learning
        Groups.
      </p>
      <Link to="/" className={`mt-6 inline-block ${link}`}>
        ← Home
      </Link>
    </main>
  );
}
