import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { MembershipRole } from "@/convex/membershipAccess/roles";
import { MembershipGate } from "../membership-access";
import { AccessLoadingView } from "../membership-access/view";
import {
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

const outcomes = {
  already_pending:
    "This identity is already pending with different roles. Revoke it first to change them.",
  already_member: "This identity is already a Member.",
  unavailable: "This identity can't be pre-approved here.",
  roster_not_migrated:
    "Pre-approval becomes available after the operator moves the Pilot Roster into Patient Proxy.",
  invalid_email: "Enter a valid email address.",
  invalid_roles: "Choose at least one role.",
};

function Members() {
  const data = useQuery(api.institutionAdmin.access.members, {});
  const preapprove = useMutation(api.institutionAdmin.access.preapprove);
  const revoke = useMutation(api.institutionAdmin.access.revoke);
  const [email, setEmail] = useState("");
  const [roles, setRoles] = useState<MembershipRole[]>([]);
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

  const form: PreapproveFormProps = {
    email,
    roles,
    submitting,
    notice,
    onEmailChange: setEmail,
    onToggleRole: (role) =>
      setRoles((current) =>
        current.includes(role)
          ? current.filter((existing) => existing !== role)
          : [...current, role],
      ),
    onSubmit: () =>
      void run(async () => {
        const result = await preapprove({ email, roles });
        if (result.status === "preapproved") {
          setNotice({
            tone: "success",
            text: `${email.trim().toLowerCase()} is pre-approved. They join the first time they sign in with that email.`,
          });
          setEmail("");
          setRoles([]);
        } else {
          setNotice({ tone: "error", text: outcomes[result.status] });
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
  };
  return <MembersView data={data} form={form} />;
}
