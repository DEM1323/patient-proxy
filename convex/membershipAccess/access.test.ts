import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";
import { modules } from "../test.setup";

const roster = JSON.stringify({
  version: 1,
  entries: [
    {
      email: "learner@example.edu",
      institutionKey: "umb",
      roles: ["learner"],
    },
  ],
});

describe("enterPilot", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.WORKOS_API_KEY;
    delete process.env.PILOT_ROSTER_JSON;
  });

  it("admits an authenticated person from their server-fetched WorkOS identity", async () => {
    process.env.WORKOS_API_KEY = "sk_test_example";
    process.env.PILOT_ROSTER_JSON = roster;
    mockWorkOSUser("user_learner", "learner@example.edu");
    const t = convexTest(schema, modules);
    const asLearner = t.withIdentity({ subject: "user_learner" });

    const admission = await asLearner.action(
      api.membershipAccess.access.enterPilot,
      {},
    );

    expect(admission).toMatchObject({
      status: "admitted",
      membership: { roles: ["learner"] },
    });
    expect(
      await asLearner.query(api.membershipAccess.access.currentMembership, {}),
    ).toMatchObject({ roles: ["learner"] });
  });

  it("denies an authenticated outsider without creating a Membership", async () => {
    process.env.WORKOS_API_KEY = "sk_test_example";
    process.env.PILOT_ROSTER_JSON = roster;
    mockWorkOSUser("user_outsider", "outsider@example.edu");
    const t = convexTest(schema, modules);
    const asOutsider = t.withIdentity({ subject: "user_outsider" });

    expect(
      await asOutsider.action(api.membershipAccess.access.enterPilot, {}),
    ).toEqual({ status: "denied", reason: "not_on_roster" });
    expect(
      await asOutsider.query(api.membershipAccess.access.currentMembership, {}),
    ).toBeNull();
  });
});

function mockWorkOSUser(id: string, email: string) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({
        object: "user",
        id,
        email,
        email_verified: true,
        profile_picture_url: null,
        name: null,
        first_name: null,
        last_name: null,
        last_sign_in_at: "2026-09-02T12:00:00.000Z",
        locale: null,
        created_at: "2026-09-02T12:00:00.000Z",
        updated_at: "2026-09-02T12:00:00.000Z",
        metadata: {},
      }),
    ),
  );
}
