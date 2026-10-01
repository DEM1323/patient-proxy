import { Link } from "@tanstack/react-router";
import type { FunctionReturnType } from "convex/server";
import type { FormEvent } from "react";
import type { api } from "@/convex/_generated/api";
import type { MembershipRole } from "@/convex/membershipAccess/roles";
import { primaryButton, secondaryButton } from "../attempt-start/view";

type Members = FunctionReturnType<typeof api.institutionAdmin.access.members>;
type AuditLog = FunctionReturnType<typeof api.institutionAdmin.access.auditLog>;

export const roleLabels: Record<MembershipRole, string> = {
  learner: "Learner",
  faculty: "Faculty",
  author: "Author",
  institutionalAdmin: "Institutional Admin",
};
const allRoles = Object.keys(roleLabels) as MembershipRole[];

const link =
  "font-semibold text-primary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
const sectionClass =
  "mt-8 rounded-2xl border border-slate-200 bg-white p-7 shadow-sm";
const smallButton =
  "rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:border-slate-400 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

export type Editing = {
  kind: "member" | "pending";
  id: string;
  roles: MembershipRole[];
} | null;

export type PreapproveFormProps = {
  email: string;
  roles: MembershipRole[];
  onEmailChange: (email: string) => void;
  onToggleRole: (role: MembershipRole) => void;
  onSubmit: () => void;
  onRevoke: (rosterEntryId: string) => void;
  submitting: boolean;
  notice: { tone: "success" | "error"; text: string } | null;
  // Slice 2: changing roles and participation.
  editing: Editing;
  onStartEdit: (editing: NonNullable<Editing>) => void;
  onToggleEditRole: (role: MembershipRole) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  confirmingDeactivate: string | null;
  onRequestDeactivate: (membershipId: string | null) => void;
  onConfirmDeactivate: (membershipId: string) => void;
  onReactivate: (membershipId: string) => void;
};

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString();
}

function RoleList({ roles }: { roles: MembershipRole[] }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {roles.map((role) => (
        <span
          key={role}
          className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700"
        >
          {roleLabels[role]}
        </span>
      ))}
    </span>
  );
}

function RoleEditor({ form, label }: { form: PreapproveFormProps; label: string }) {
  const editing = form.editing!;
  return (
    <fieldset className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <legend className="px-1 text-sm font-semibold text-slate-800">{label}</legend>
      <div className="flex flex-wrap gap-4">
        {allRoles.map((role) => (
          <label key={role} className="flex items-center gap-2 text-slate-700">
            <input
              type="checkbox"
              checked={editing.roles.includes(role)}
              onChange={() => form.onToggleEditRole(role)}
            />
            {roleLabels[role]}
          </label>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className={smallButton}
          disabled={form.submitting || editing.roles.length === 0}
          onClick={form.onSaveEdit}
        >
          Save roles
        </button>
        <button type="button" className={smallButton} onClick={form.onCancelEdit}>
          Cancel
        </button>
      </div>
    </fieldset>
  );
}

export function MembersView({
  auditLog,
  data,
  form,
}: {
  auditLog: AuditLog | undefined;
  data: Members;
  form: PreapproveFormProps;
}) {
  const migrated = data.rosterSource === "database";
  return (
    <main className="mx-auto max-w-5xl px-5 py-12 sm:py-16">
      <Link to="/" className={`text-sm ${link}`}>
        ← Home
      </Link>
      <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-950">
        Members
      </h1>
      <p className="mt-3 max-w-2xl leading-7 text-slate-600">
        Members of your Pilot Institution and identities approved to join it.
        Roles are additive: each grants only its own journeys. Changes apply
        immediately and are recorded below.
      </p>
      {form.notice && (
        <p
          role={form.notice.tone === "error" ? "alert" : "status"}
          className={`mt-4 font-medium ${form.notice.tone === "error" ? "text-rose-700" : "text-emerald-700"}`}
        >
          {form.notice.text}
        </p>
      )}

      <section aria-labelledby="preapprove-title" className={sectionClass}>
        <h2 id="preapprove-title" className="text-lg font-semibold text-slate-950">
          Pre-approve an identity
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Enter the exact email the person signs in with. Patient Proxy does not
          send an invitation; tell them to sign in with that email. They become a
          Member the first time they sign in.
        </p>
        {!migrated ? (
          <p role="status" className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Pre-approval becomes available after the operator moves the Pilot
            Roster into Patient Proxy.
          </p>
        ) : (
          <form
            className="mt-4"
            onSubmit={(event: FormEvent) => {
              event.preventDefault();
              form.onSubmit();
            }}
          >
            <label htmlFor="preapprove-email" className="block text-sm font-semibold text-slate-800">
              Approved identity (email)
            </label>
            <input
              id="preapprove-email"
              type="email"
              autoComplete="off"
              value={form.email}
              onChange={(event) => form.onEmailChange(event.target.value)}
              className="mt-2 block w-full max-w-md rounded-lg border border-slate-300 px-4 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <fieldset className="mt-4">
              <legend className="text-sm font-semibold text-slate-800">Roles</legend>
              <div className="mt-2 flex flex-wrap gap-4">
                {allRoles.map((role) => (
                  <label key={role} className="flex items-center gap-2 text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.roles.includes(role)}
                      onChange={() => form.onToggleRole(role)}
                    />
                    {roleLabels[role]}
                  </label>
                ))}
              </div>
            </fieldset>
            <button
              type="submit"
              className={`mt-5 ${primaryButton}`}
              disabled={
                form.submitting || form.email.trim() === "" || form.roles.length === 0
              }
            >
              {form.submitting ? "Pre-approving…" : "Pre-approve identity"}
            </button>
          </form>
        )}
      </section>

      <section aria-labelledby="pending-title" className={sectionClass}>
        <h2 id="pending-title" className="text-lg font-semibold text-slate-950">
          Pending approvals
        </h2>
        {data.pending.length === 0 ? (
          <p className="mt-3 text-slate-600">No identities are waiting to sign in.</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-200">
            {data.pending.map((entry) => {
              const editingThis = form.editing?.kind === "pending" && form.editing.id === entry.id;
              return (
                <li key={entry.id} className="py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">{entry.email}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                        <RoleList roles={entry.roles} /> · approved {formatDate(entry.approvedAt)} ·
                        awaiting first sign-in
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={smallButton}
                        disabled={form.submitting}
                        onClick={() =>
                          form.onStartEdit({ kind: "pending", id: entry.id, roles: entry.roles })
                        }
                      >
                        Edit roles
                      </button>
                      <button
                        type="button"
                        className={secondaryButton}
                        disabled={form.submitting}
                        onClick={() => form.onRevoke(entry.id)}
                      >
                        Revoke approval
                      </button>
                    </div>
                  </div>
                  {editingThis && <RoleEditor form={form} label={`Roles for ${entry.email}`} />}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="members-title" className={sectionClass}>
        <h2 id="members-title" className="text-lg font-semibold text-slate-950">
          Members
        </h2>
        <ul className="mt-4 divide-y divide-slate-200">
          {data.members.map((member) => {
            const editingThis = form.editing?.kind === "member" && form.editing.id === member.id;
            const confirming = form.confirmingDeactivate === member.id;
            return (
              <li key={member.id} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">
                      {member.email}
                      {member.isYou && (
                        <span className="ml-2 text-xs font-semibold text-slate-500">(you)</span>
                      )}
                      {member.status === "inactive" && (
                        <span className="ml-2 rounded bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700">
                          Deactivated
                        </span>
                      )}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                      <RoleList roles={member.roles} /> · admitted {formatDate(member.admittedAt)}
                    </p>
                  </div>
                  {member.isYou ? (
                    <p className="text-xs text-slate-500">
                      Another Institutional Admin manages your own roles and status.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={smallButton}
                        disabled={form.submitting}
                        onClick={() =>
                          form.onStartEdit({ kind: "member", id: member.id, roles: member.roles })
                        }
                      >
                        Edit roles
                      </button>
                      {member.status === "active" ? (
                        <button
                          type="button"
                          className={smallButton}
                          disabled={form.submitting}
                          onClick={() => form.onRequestDeactivate(member.id)}
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          type="button"
                          className={smallButton}
                          disabled={form.submitting}
                          onClick={() => form.onReactivate(member.id)}
                        >
                          Reactivate
                        </button>
                      )}
                    </div>
                  )}
                </div>
                {editingThis && (
                  <RoleEditor form={form} label={`Roles for ${member.email}`} />
                )}
                {confirming && (
                  <div
                    role="alertdialog"
                    aria-label={`Deactivate ${member.email}?`}
                    className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-4"
                  >
                    <p className="text-sm leading-6 text-slate-800">
                      {member.email} loses access immediately, and any Active
                      Attempt ends. Their saved Attempts, reflections, and
                      feedback are kept, and you can reactivate them later; a
                      reactivated Member starts a new Attempt.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={smallButton}
                        disabled={form.submitting}
                        onClick={() => form.onConfirmDeactivate(member.id)}
                      >
                        Deactivate Member
                      </button>
                      <button
                        type="button"
                        className={smallButton}
                        onClick={() => form.onRequestDeactivate(null)}
                      >
                        Keep active
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-xs text-slate-500">
          Emails are the approved identities, not live account profiles.
          Removing the Learner role also ends that Member&apos;s Active Attempt.
        </p>
      </section>

      <AuditLogView entries={auditLog} />
    </main>
  );
}

const actionLabels: Record<AuditLog[number]["action"], string> = {
  roster_migrated: "Pilot Roster moved into Patient Proxy",
  identity_preapproved: "Identity pre-approved",
  preapproval_revoked: "Approval revoked",
  preapproval_roles_changed: "Pending roles changed",
  identity_bound: "First sign-in",
  institutional_admin_bootstrapped: "First Institutional Admin designated",
  member_roles_changed: "Roles changed",
  member_deactivated: "Member deactivated",
  member_reactivated: "Member reactivated",
  institutional_admin_recovered: "Institutional Admin recovered by operator",
  learning_group_created: "Learning Group created",
  group_member_added: "Added to Learning Group",
  group_member_removed: "Removed from Learning Group",
  scenario_made_available: "Scenario made available",
  scenario_availability_removed: "Scenario availability removed",
};

function describeState(state: AuditLog[number]["before"]) {
  if (!state) {
    return null;
  }
  const parts: string[] = [];
  if (state.roles) parts.push(state.roles.map((role) => roleLabels[role]).join(", "));
  if (state.membershipStatus) parts.push(state.membershipStatus);
  if (state.status) parts.push(state.status);
  return parts.join(" · ") || null;
}

function AuditLogView({ entries }: { entries: AuditLog | undefined }) {
  return (
    <section aria-labelledby="audit-title" className={sectionClass}>
      <h2 id="audit-title" className="text-lg font-semibold text-slate-950">
        Recent changes
      </h2>
      {entries === undefined ? (
        <p className="mt-3 text-slate-600">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="mt-3 text-slate-600">No changes recorded yet.</p>
      ) : (
        <ol className="mt-4 space-y-2 text-sm">
          {entries.map((entry) => {
            const before = describeState(entry.before);
            const after = describeState(entry.after);
            const actor =
              entry.actor === "member"
                ? entry.actorEmail ?? "An Institutional Admin"
                : entry.actor === "operator"
                  ? "Operator"
                  : "Sign-in";
            return (
              <li key={entry.id} className="text-slate-700">
                <time
                  dateTime={new Date(entry.occurredAt).toISOString()}
                  className="mr-2 text-slate-500"
                >
                  {new Date(entry.occurredAt).toLocaleString()}
                </time>
                <span className="font-semibold text-slate-900">{actionLabels[entry.action]}</span>
                {entry.targetEmail && <> · {entry.targetEmail}</>}
                {entry.scenarioTitle && <> · {entry.scenarioTitle}</>}
                {entry.groupName && <> · {entry.groupName}</>}
                {(before || after) && (
                  <>
                    {" "}
                    · {before ?? "—"} → {after ?? "—"}
                  </>
                )}
                {entry.counts && (
                  <>
                    {" "}
                    · {entry.counts.boundMemberships} bound, {entry.counts.pendingApprovals}{" "}
                    pending
                  </>
                )}{" "}
                <span className="text-slate-500">by {actor}</span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

export function InstitutionalAdminRequiredView() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-16">
      <h1 className="text-3xl font-bold tracking-tight text-slate-950">
        Institutional Admin role required
      </h1>
      <p className="mt-4 leading-7 text-slate-600">
        Your Pilot Membership does not include the Institutional Admin role.
      </p>
      <Link to="/" className={`mt-6 inline-block ${link}`}>
        ← Home
      </Link>
    </main>
  );
}
