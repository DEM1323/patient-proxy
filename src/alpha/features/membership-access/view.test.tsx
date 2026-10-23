import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AccessDeniedView } from "./view";

describe("Membership access guidance", () => {
  it("gives an unapproved person explicit next steps", () => {
    const denial = renderToStaticMarkup(
      <AccessDeniedView reason="not_on_roster" onSignOut={() => undefined} />,
    );

    expect(denial).toContain("No Pilot Membership was created");
    expect(denial).toContain("Institutional Admin");
  });
});
