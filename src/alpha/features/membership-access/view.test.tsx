import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AccessDeniedView, MembershipHome } from "./view";

const institution = {
  id: "institution-id",
  key: "umb",
  name: "UMB Pilot Institution",
};

describe("role-aware Member home", () => {
  it("shows every assigned journey without role inheritance", () => {
    const dualRoleHome = renderToStaticMarkup(
      <MembershipHome
        membership={{ id: "membership-id", institution, roles: ["learner", "faculty"] }}
        onSignOut={() => undefined}
      />,
    );
    const institutionalAdminHome = renderToStaticMarkup(
      <MembershipHome
        membership={{
          id: "institutional-admin-membership-id",
          institution,
          roles: ["institutionalAdmin"],
        }}
        onSignOut={() => undefined}
      />,
    );

    expect(dualRoleHome).toContain("Learner journey");
    expect(dualRoleHome).toContain("Faculty journey");
    expect(institutionalAdminHome).toContain("Institutional Admin journey");
    expect(institutionalAdminHome).not.toContain("Learner journey");
    expect(institutionalAdminHome).not.toContain("Faculty journey");
  });

  it("gives an unapproved person explicit next steps", () => {
    const denial = renderToStaticMarkup(
      <AccessDeniedView
        reason="not_on_roster"
        onSignOut={() => undefined}
      />,
    );

    expect(denial).toContain("No Pilot Membership was created");
    expect(denial).toContain("Institutional Admin");
  });
});
