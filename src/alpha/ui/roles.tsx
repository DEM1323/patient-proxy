import type { MembershipRole } from "@/convex/membershipAccess/roles";
import {
  inRoleOrder,
  roleLabels,
  roleDescriptions,
  roleOrder,
} from "../features/membership-access/roles";

export function RoleSummary({ roles }: { roles: MembershipRole[] }) {
  return (
    <span className="text-small text-ink">
      {inRoleOrder(roles)
        .map((role) => roleLabels[role])
        .join(", ")}
    </span>
  );
}

export function RoleOptions({
  roles,
  onToggle,
}: {
  roles: MembershipRole[];
  onToggle: (role: MembershipRole) => void;
}) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {roleOrder.map((role) => (
        <label key={role} className="flex cursor-pointer items-start gap-2">
          <input
            type="checkbox"
            className="mt-1 h-[18px] w-[18px] shrink-0 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
            checked={roles.includes(role)}
            onChange={() => onToggle(role)}
            aria-label={roleLabels[role]}
          />
          <span>
            <span className="block text-compact font-semibold">
              {roleLabels[role]}
            </span>
            <span className="mt-1 block text-small text-ink-2">
              {roleDescriptions[role]}
            </span>
          </span>
        </label>
      ))}
    </div>
  );
}
