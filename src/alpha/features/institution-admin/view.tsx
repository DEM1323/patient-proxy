import { Link } from "@tanstack/react-router";
import type { FunctionReturnType } from "convex/server";
import type { FormEvent } from "react";
import type { api } from "@/convex/_generated/api";
import type { MembershipRole } from "@/convex/membershipAccess/roles";
import { primaryButton, secondaryButton } from "../attempt-start/view";

type Members = FunctionReturnType<typeof api.institutionAdmin.access.members>;

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

export type PreapproveFormProps = {
  email: string;
  roles: MembershipRole[];
  onEmailChange: (email: string) => void;
  onToggleRole: (role: MembershipRole) => void;
  onSubmit: () => void;
  onRevoke: (rosterEntryId: string) => void;
  submitting: boolean;
  notice: { tone: "success" | "error"; text: string } | null;
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

export function MembersView({
  data,
  form,
}: {
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
        Roles are additive: each grants only its own journeys.
      </p>

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
        {form.notice && (
          <p
            role={form.notice.tone === "error" ? "alert" : "status"}
            className={`mt-4 font-medium ${form.notice.tone === "error" ? "text-rose-700" : "text-emerald-700"}`}
          >
            {form.notice.text}
          </p>
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
            {data.pending.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium text-slate-900">{entry.email}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                    <RoleList roles={entry.roles} /> · approved {formatDate(entry.approvedAt)} ·
                    awaiting first sign-in
                  </p>
                </div>
                <button
                  type="button"
                  className={secondaryButton}
                  disabled={form.submitting}
                  onClick={() => form.onRevoke(entry.id)}
                >
                  Revoke approval
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="members-title" className={sectionClass}>
        <h2 id="members-title" className="text-lg font-semibold text-slate-950">
          Members
        </h2>
        <ul className="mt-4 divide-y divide-slate-200">
          {data.members.map((member) => (
            <li key={member.id} className="py-3">
              <p className="font-medium text-slate-900">{member.email}</p>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                <RoleList roles={member.roles} /> · admitted {formatDate(member.admittedAt)}
              </p>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-slate-500">
          Emails are the approved identities, not live account profiles. Role
          changes and deactivation arrive in a later update.
        </p>
      </section>
    </main>
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
