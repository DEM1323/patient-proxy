import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { MembershipRole } from "@/convex/membershipAccess/roles";
import { MembershipGate } from "../membership-access";
import { AccessLoadingView } from "../membership-access/view";
import {
  type Editing,
  InstitutionalAdminRequiredView,
  MembersView,
  type PreapproveFormProps,
} from "./view";

export function MembersPage() {
  return (
    <MembershipGate>
      {({ membership }) =>
        membership.roles.includes("institutionalAdmin") ? (
          <Members />
        ) : (
          <InstitutionalAdminRequiredView />
        )
      }
    </MembershipGate>
  );
}

const preapproveOutcomes = {
  already_pending:
    "This identity is already pending with different roles. Use Edit roles to change them.",
  already_member: "This identity is already a Member.",
  unavailable: "This identity can't be pre-approved here.",
  roster_not_migrated:
    "Pre-approval becomes available after the operator moves the Pilot Roster into Patient Proxy.",
  invalid_email: "Enter a valid email address.",
  invalid_roles: "Choose at least one role.",
};

// Shared wording for role and participation changes.
const changeOutcomes = {
  self_change: "You can't change your own roles or status. Ask another Institutional Admin.",
  last_admin:
    "This would leave the institution without an active Institutional Admin.",
  invalid_roles: "Choose at least one role.",
  not_found: "That Member or approval no longer exists.",
  already_member: "This identity already signed in; edit the Member's roles instead.",
};

const toggle = (roles: MembershipRole[], role: MembershipRole) =>
  roles.includes(role) ? roles.filter((existing) => existing !== role) : [...roles, role];

function Members() {
  const data = useQuery(api.institutionAdmin.access.members, {});
  const auditLog = useQuery(api.institutionAdmin.access.auditLog, {});
  const preapprove = useMutation(api.institutionAdmin.access.preapprove);
  const revoke = useMutation(api.institutionAdmin.access.revoke);
  const setRoles = useMutation(api.institutionAdmin.access.setRoles);
  const setPendingRoles = useMutation(api.institutionAdmin.access.setPendingApprovalRoles);
  const deactivate = useMutation(api.institutionAdmin.access.deactivate);
  const reactivate = useMutation(api.institutionAdmin.access.reactivate);
  const [email, setEmail] = useState("");
  const [roles, setNewRoles] = useState<MembershipRole[]>([]);
  const [editing, setEditing] = useState<Editing>(null);
  const [confirmingDeactivate, setConfirmingDeactivate] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<PreapproveFormProps["notice"]>(null);

  if (data === undefined) {
    return <AccessLoadingView message="Loading Members" />;
  }

  const run = async (command: () => Promise<void>) => {
    setSubmitting(true);
    setNotice(null);
    try {
      await command();
    } catch {
      setNotice({
        tone: "error",
        text: "That change could not be saved. Check your connection and try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };
  const report = (
    status: string,
    success: string,
  ) => {
    if (status === "updated") {
      setNotice({ tone: "success", text: success });
    } else if (status === "unchanged") {
      setNotice({ tone: "success", text: "Nothing needed to change." });
    } else {
      setNotice({
        tone: "error",
        text: changeOutcomes[status as keyof typeof changeOutcomes] ?? "That change was not made.",
      });
    }
  };

  const form: PreapproveFormProps = {
    email,
    roles,
    submitting,
    notice,
    onEmailChange: setEmail,
    onToggleRole: (role) => setNewRoles((current) => toggle(current, role)),
    onSubmit: () =>
      void run(async () => {
        const result = await preapprove({ email, roles });
        if (result.status === "preapproved") {
          setNotice({
            tone: "success",
            text: `${email.trim().toLowerCase()} is pre-approved. They join the first time they sign in with that email.`,
          });
          setEmail("");
          setNewRoles([]);
        } else {
          setNotice({ tone: "error", text: preapproveOutcomes[result.status] });
        }
      }),
    onRevoke: (rosterEntryId) =>
      void run(async () => {
        const result = await revoke({ rosterEntryId });
        setNotice(
          result.status === "revoked"
            ? { tone: "success", text: "Approval revoked." }
            : result.status === "already_member"
              ? { tone: "error", text: "This identity already signed in and is a Member." }
              : { tone: "error", text: "That approval no longer exists." },
        );
      }),
    editing,
    onStartEdit: (next) => {
      setConfirmingDeactivate(null);
      setEditing(next);
    },
    onToggleEditRole: (role) =>
      setEditing((current) => current && { ...current, roles: toggle(current.roles, role) }),
    onCancelEdit: () => setEditing(null),
    onSaveEdit: () =>
      void run(async () => {
        if (!editing) return;
        const result =
          editing.kind === "member"
            ? await setRoles({ membershipId: editing.id, roles: editing.roles })
            : await setPendingRoles({ rosterEntryId: editing.id, roles: editing.roles });
        report(result.status, "Roles updated.");
        if (result.status === "updated" || result.status === "unchanged") {
          setEditing(null);
        }
      }),
    confirmingDeactivate,
    onRequestDeactivate: (membershipId) => {
      setEditing(null);
      setConfirmingDeactivate(membershipId);
    },
    onConfirmDeactivate: (membershipId) =>
      void run(async () => {
        const result = await deactivate({ membershipId });
        report(result.status, "Member deactivated.");
        setConfirmingDeactivate(null);
      }),
    onReactivate: (membershipId) =>
      void run(async () => {
        const result = await reactivate({ membershipId });
        report(result.status, "Member reactivated.");
      }),
  };
  return <MembersView auditLog={auditLog} data={data} form={form} />;
}
