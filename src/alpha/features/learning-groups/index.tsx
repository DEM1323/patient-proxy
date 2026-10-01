import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { MembershipGate } from "../membership-access";
import { AccessLoadingView } from "../membership-access/view";
import { GroupReaderRequiredView, type GroupControls, LearningGroupsView } from "./view";

export function LearningGroupsPage() {
  return (
    <MembershipGate>
      {({ membership }) =>
        membership.roles.includes("institutionalAdmin") ||
        membership.roles.includes("faculty") ? (
          <LearningGroups />
        ) : (
          <GroupReaderRequiredView />
        )
      }
    </MembershipGate>
  );
}

function LearningGroups() {
  const data = useQuery(api.learningGroups.access.learningGroups, {});
  const createGroup = useMutation(api.learningGroups.access.createGroup);
  const setMembership = useMutation(api.learningGroups.access.setMembership);
  const setAvailability = useMutation(api.learningGroups.access.setAvailability);
  const [newGroupName, setNewGroupName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<GroupControls["notice"]>(null);

  if (data === undefined) {
    return <AccessLoadingView message="Loading Learning Groups" />;
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
  const report = (status: string, success: string) =>
    setNotice(
      status === "updated"
        ? { tone: "success", text: success }
        : status === "unchanged"
          ? { tone: "success", text: "Nothing needed to change." }
          : { tone: "error", text: "That group, Member, or Scenario is no longer available to you." },
    );

  const controls: GroupControls = {
    newGroupName,
    onNewGroupNameChange: setNewGroupName,
    submitting,
    notice,
    onCreateGroup: () =>
      void run(async () => {
        const result = await createGroup({ name: newGroupName });
        if (result.status === "created") {
          setNotice({ tone: "success", text: `Created ${newGroupName.trim()}.` });
          setNewGroupName("");
        } else {
          setNotice({
            tone: "error",
            text:
              result.status === "duplicate_name"
                ? "A Learning Group with that name already exists."
                : "Enter a group name of up to 80 characters.",
          });
        }
      }),
    onEnroll: (learningGroupId, membershipId) =>
      void run(async () => {
        const result = await setMembership({ learningGroupId, membershipId, enrolled: true });
        report(result.status, "Member added to the group.");
      }),
    onRemove: (learningGroupId, membershipId) =>
      void run(async () => {
        const result = await setMembership({ learningGroupId, membershipId, enrolled: false });
        report(result.status, "Member removed from the group.");
      }),
    onSetAvailability: (learningGroupId, scenarioId, available) =>
      void run(async () => {
        const result = await setAvailability({ learningGroupId, scenarioId, available });
        report(
          result.status,
          available ? "Scenario made available." : "Scenario availability removed.",
        );
      }),
  };
  return <LearningGroupsView controls={controls} data={data} />;
}
