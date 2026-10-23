import { Fragment, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import type { FunctionReturnType } from "convex/server";
import type { api } from "@/convex/_generated/api";
import type { MembershipRole } from "@/convex/membershipAccess/roles";
import { button } from "../../ui/button";
import {
  Badge,
  Modal,
  Notice,
  Page,
  Table,
  textLink,
} from "../../ui/primitives";
import { roleLabels } from "../membership-access/roles";
import { RoleSummary, RoleOptions } from "../../ui/roles";
export { roleLabels };
type Members = FunctionReturnType<typeof api.institutionAdmin.access.members>;
type AuditLog = FunctionReturnType<typeof api.institutionAdmin.access.auditLog>;
const link = textLink;
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
  return new Date(timestamp).toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}
function RoleList({ roles }: { roles: MembershipRole[] }) {
  return <RoleSummary roles={roles} />;
}
function RoleEditor({
  form,
  label,
}: {
  form: PreapproveFormProps;
  label: string;
}) {
  return (
    <fieldset className="rounded-lg border border-line bg-sunken p-4">
      <legend className="px-1 font-bold">{label}</legend>
      <p className="mb-4 text-small text-ink-2">
        All selected roles apply together.
      </p>
      <RoleOptions
        roles={form.editing!.roles}
        onToggle={form.onToggleEditRole}
      />
      <p className="mt-3 text-small text-ink-3">
        Removing Learner ends this Member’s Active Attempt, if any.
      </p>
      <div className="mt-4 flex gap-3">
        <button
          type="button"
          className={button("primary", "sm")}
          disabled={form.submitting || !form.editing!.roles.length}
          onClick={form.onSaveEdit}
        >
          Save roles
        </button>
        <button
          type="button"
          className={button("quiet", "sm")}
          onClick={form.onCancelEdit}
        >
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
  const confirming = data.members.find(
    (m) => m.id === form.confirmingDeactivate,
  );
  return (
    <Page
      title="Members"
      description="Manage who can sign in and what they can access. All held roles apply together. Changes take effect immediately and are recorded below."
    >
      <div className="space-y-7">
        {form.notice && (
          <Notice tone={form.notice.tone}>{form.notice.text}</Notice>
        )}
        <section
          aria-labelledby="preapprove-title"
          className="rounded-xl border border-line bg-surface p-6"
        >
          <h2 id="preapprove-title" className="mb-4 font-bold">
            Pre-approve an identity
          </h2>
          {!migrated ? (
            <Notice tone="warning">
              Pre-approval becomes available after the operator moves the Pilot
              Roster into Patient Proxy.
            </Notice>
          ) : (
            <form
              onSubmit={(event: FormEvent) => {
                event.preventDefault();
                form.onSubmit();
              }}
            >
              <div className="flex flex-col items-start gap-5">
                <div className="w-full max-w-[360px]">
                  <label
                    htmlFor="approval-email"
                    className="text-label font-semibold"
                  >
                    Approved identity (email)
                  </label>
                  <input
                    id="approval-email"
                    className="proxy-input mt-2"
                    type="email"
                    placeholder="name@umb.edu"
                    value={form.email}
                    onChange={(e) => form.onEmailChange(e.target.value)}
                    required
                  />
                </div>
                <fieldset className="min-w-0 w-full">
                  <legend className="mb-3 text-label font-semibold">
                    Roles at first sign-in · all selected roles apply
                  </legend>
                  <RoleOptions
                    roles={form.roles}
                    onToggle={form.onToggleRole}
                  />
                </fieldset>
                <button
                  type="submit"
                  className={button()}
                  disabled={
                    form.submitting || !form.email.trim() || !form.roles.length
                  }
                >
                  {form.submitting ? "Pre-approving…" : "Pre-approve identity"}
                </button>
              </div>
            </form>
          )}
          <p className="mt-5 text-small text-ink-3">
            Patient Proxy does not send an invitation. Tell the person to sign
            in with this exact email; they become a Member at first sign-in.
          </p>
        </section>
        <section aria-labelledby="pending-title">
          <h2 id="pending-title" className="mb-3 text-subheading font-bold">
            Pending approvals
          </h2>
          {!data.pending.length ? (
            <p className="text-ink-2">No identities are waiting to sign in.</p>
          ) : (
            <Table label="Pending approvals">
              <thead>
                <tr>
                  <th>Waiting for first sign-in</th>
                  <th>Roles at sign-in</th>
                  <th>Approved</th>
                  <th>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              {data.pending.map((entry) => (
                <tbody key={entry.id} aria-label={entry.email}>
                  <tr>
                    <td className="max-w-[320px] font-bold">
                      {entry.email}
                      <p className="text-small font-normal text-ink-3">
                        awaiting first sign-in
                      </p>
                    </td>
                    <td>
                      <RoleList roles={entry.roles} />
                    </td>
                    <td className="whitespace-nowrap">
                      {formatDate(entry.approvedAt)}
                    </td>
                    <td>
                      <div className="flex justify-end gap-2">
                        <button
                          className={button("secondary", "sm")}
                          type="button"
                          disabled={form.submitting}
                          onClick={() =>
                            form.onStartEdit({
                              kind: "pending",
                              id: entry.id,
                              roles: entry.roles,
                            })
                          }
                        >
                          Edit roles
                        </button>
                        <button
                          className={button("danger", "sm")}
                          type="button"
                          disabled={form.submitting}
                          onClick={() => form.onRevoke(entry.id)}
                        >
                          Revoke approval
                        </button>
                      </div>
                    </td>
                  </tr>
                  {form.editing?.kind === "pending" &&
                    form.editing.id === entry.id && (
                      <tr>
                        <td colSpan={4}>
                          <RoleEditor
                            form={form}
                            label={"Roles for " + entry.email}
                          />
                        </td>
                      </tr>
                    )}
                </tbody>
              ))}
            </Table>
          )}
        </section>
        <section aria-labelledby="members-title">
          <h2 id="members-title" className="sr-only">
            Members
          </h2>
          <Table label="Members">
            <thead>
              <tr>
                <th>Member</th>
                <th>Roles</th>
                <th>Status</th>
                <th>Admitted</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            {data.members.map((member) => (
              <tbody key={member.id} aria-label={member.email}>
                <tr className={member.status === "inactive" ? "bg-sunken" : ""}>
                  <td className="max-w-[320px] font-bold">
                    {member.email}
                    {member.isYou && (
                      <span className="mt-1 block text-small font-normal text-ink-3">
                        (you)
                      </span>
                    )}
                  </td>
                  <td className="max-w-[270px]">
                    <RoleList roles={member.roles} />
                  </td>
                  <td>
                    <Badge
                      tone={member.status === "inactive" ? "amber" : "teal"}
                    >
                      {member.status === "inactive" ? "Deactivated" : "Active"}
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap">
                    {formatDate(member.admittedAt)}
                  </td>
                  <td>
                    {member.isYou ? (
                      <p className="max-w-[190px] text-right text-small text-ink-3">
                        Another Institutional Admin manages your own roles and
                        status.
                      </p>
                    ) : (
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className={button("secondary", "sm")}
                          disabled={form.submitting}
                          onClick={() =>
                            form.onStartEdit({
                              kind: "member",
                              id: member.id,
                              roles: member.roles,
                            })
                          }
                        >
                          Edit roles
                        </button>
                        {member.status === "active" ? (
                          <button
                            type="button"
                            className={button("danger", "sm")}
                            disabled={form.submitting}
                            onClick={() => form.onRequestDeactivate(member.id)}
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            type="button"
                            className={button("secondary", "sm")}
                            disabled={form.submitting}
                            onClick={() => form.onReactivate(member.id)}
                          >
                            Reactivate
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
                {form.editing?.kind === "member" &&
                  form.editing.id === member.id && (
                    <tr>
                      <td colSpan={5}>
                        <RoleEditor
                          form={form}
                          label={"Roles for " + member.email}
                        />
                      </td>
                    </tr>
                  )}
              </tbody>
            ))}
          </Table>
        </section>
        <AuditLogView entries={auditLog} />
      </div>
      {confirming && (
        <Modal
          title={"Deactivate " + confirming.email + "?"}
          onClose={() => {
            if (!form.submitting) form.onRequestDeactivate(null);
          }}
        >
          <p>
            This Member loses access immediately, and any Active Attempt ends.
            Their saved Attempts, reflections, and feedback are kept under the
            normal retention policy. You can reactivate them later; a
            reactivated Member starts a new Attempt.
          </p>
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <button
              autoFocus
              type="button"
              className={button("secondary")}
              disabled={form.submitting}
              onClick={() => form.onRequestDeactivate(null)}
            >
              Keep active
            </button>
            <button
              type="button"
              className={button("dangerSolid")}
              disabled={form.submitting}
              onClick={() => form.onConfirmDeactivate(confirming.id)}
            >
              Deactivate Member
            </button>
          </div>
        </Modal>
      )}
    </Page>
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
  if (state.roles)
    parts.push(state.roles.map((role) => roleLabels[role]).join(", "));
  if (state.membershipStatus) parts.push(state.membershipStatus);
  if (state.status) parts.push(state.status);
  return parts.join(" · ") || null;
}

export function AuditLogView({
  entries,
  compact = false,
}: {
  entries: AuditLog | undefined;
  compact?: boolean;
}) {
  return (
    <section aria-labelledby="audit-title">
      <h2 id="audit-title" className="mb-4 text-subheading font-bold">
        Recent changes
      </h2>
      {entries === undefined ? (
        <p role="status">Loading…</p>
      ) : !entries.length ? (
        <p className="text-ink-2">No changes recorded yet.</p>
      ) : compact ? (
        <ol className="divide-y divide-line rounded-lg border border-line bg-surface px-4">
          {entries.map((entry) => (
            <li key={entry.id} className="flex items-start gap-3 py-3">
              <time
                className="shrink-0 pt-0.5 text-meta text-ink-3"
                dateTime={new Date(entry.occurredAt).toISOString()}
              >
                {formatDate(entry.occurredAt)}
              </time>
              <div className="min-w-0">
                <p className="text-compact font-bold">
                  {actionLabels[entry.action]}
                </p>
                <p className="mt-1 break-all text-small text-ink-2">
                  {entry.targetEmail ?? entry.groupName ?? entry.scenarioTitle}
                </p>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <Table label="Recent changes">
          <thead>
            <tr>
              <th>Time</th>
              <th>Change</th>
              <th>Details</th>
              <th>By</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, index) => {
              const before = describeState(entry.before),
                after = describeState(entry.after);
              const day = new Date(entry.occurredAt).toLocaleDateString();
              return (
                <Fragment key={entry.id}>
                  {(index === 0 ||
                    new Date(
                      entries[index - 1].occurredAt,
                    ).toLocaleDateString() !== day) && (
                    <tr>
                      <th colSpan={4}>{day}</th>
                    </tr>
                  )}
                  <tr>
                    <td className="whitespace-nowrap text-small text-ink-3">
                      <time dateTime={new Date(entry.occurredAt).toISOString()}>
                        {new Date(entry.occurredAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </time>
                    </td>
                    <td className="font-bold">{actionLabels[entry.action]}</td>
                    <td className="text-small">
                      {[entry.targetEmail, entry.scenarioTitle, entry.groupName]
                        .filter(Boolean)
                        .join(", ")}
                      {(before || after) && (
                        <p>
                          {before ?? "—"} → {after ?? "—"}
                        </p>
                      )}
                      {entry.counts && (
                        <p>
                          {entry.counts.boundMemberships} bound,{" "}
                          {entry.counts.pendingApprovals} pending
                        </p>
                      )}
                    </td>
                    <td className="text-small text-ink-3">
                      {entry.actor === "member"
                        ? (entry.actorEmail ?? "An Institutional Admin")
                        : entry.actor === "operator"
                          ? "Operator"
                          : "Sign-in"}
                    </td>
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </Table>
      )}
    </section>
  );
}
export function InstitutionalAdminRequiredView() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-16">
      <h1 className="text-3xl font-bold tracking-tight text-ink">
        Institutional Admin role required
      </h1>
      <p className="mt-4 leading-7 text-ink-2">
        Your Pilot Membership does not include the Institutional Admin role.
      </p>
      <Link to="/" className={`mt-6 inline-block ${link}`}>
        ← Home
      </Link>
    </main>
  );
}
