// @vitest-environment jsdom

import { StrictMode } from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MembershipAccessPage } from ".";

const testState = vi.hoisted(() => ({
  membership: null as null | {
    id: string;
    institution: { id: string; key: string; name: string };
    roles: ["learner"];
  },
  enterPilot: vi.fn(),
}));

vi.mock("@workos-inc/authkit-react", () => ({
  useAuth: () => ({
    isLoading: false,
    user: { id: "user_learner" },
    signIn: vi.fn(),
    signOut: vi.fn(),
  }),
}));

vi.mock("convex/react", () => ({
  useAction: () => testState.enterPilot,
  useConvexAuth: () => ({ isAuthenticated: true, isLoading: false }),
  useQuery: () => testState.membership,
}));

describe("Membership admission gate", () => {
  afterEach(() => {
    cleanup();
    testState.membership = null;
    testState.enterPilot.mockReset();
  });

  it("enters once under StrictMode and reacts by showing the Learner home", async () => {
    testState.enterPilot.mockResolvedValue({
      status: "admitted",
      membership: {
        id: "membership-id",
        institution: {
          id: "institution-id",
          key: "umb",
          name: "UMB Pilot Institution",
        },
        roles: ["learner"],
      },
    });
    const page = (
      <StrictMode>
        <MembershipAccessPage />
      </StrictMode>
    );
    const { rerender } = render(page);

    await waitFor(() => expect(testState.enterPilot).toHaveBeenCalledTimes(1));

    testState.membership = {
      id: "membership-id",
      institution: {
        id: "institution-id",
        key: "umb",
        name: "UMB Pilot Institution",
      },
      roles: ["learner"],
    };
    rerender(
      <StrictMode>
        <MembershipAccessPage />
      </StrictMode>,
    );

    expect(await screen.findByText("Learner journey")).toBeTruthy();
  });
});
