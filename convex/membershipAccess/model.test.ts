import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import schema from "../schema";
import { modules } from "../test.setup";
import { admitWorkosUser, getCurrentMembership } from "./model";

const roster = JSON.stringify({
  version: 1,
  entries: [
    {
      email: "learner@example.edu",
      institutionKey: "umb",
      roles: ["learner", "faculty"],
    },
  ],
});

describe("Membership admission", () => {
  it("binds an exact Pilot Roster entry to the stable WorkOS user ID", async () => {
    const t = convexTest(schema, modules);
    const asLearner = t.withIdentity({ subject: "user_learner" });

    const admission = await asLearner.mutation((ctx) =>
      admitWorkosUser(ctx, {
        workosUserId: "user_learner",
        email: "LEARNER@example.edu",
        emailVerified: true,
        rawRoster: roster,
      }),
    );
    const membership = await asLearner.query(getCurrentMembership);

    expect(admission).toMatchObject({
      status: "admitted",
      membership: {
        institution: { key: "umb", name: "UMB Pilot Institution" },
        roles: ["learner", "faculty"],
      },
    });
    expect(membership).toEqual(
      expect.objectContaining({ roles: ["learner", "faculty"] }),
    );
  });

  it("does not create a Membership for an authenticated outsider", async () => {
    const t = convexTest(schema, modules);
    const asOutsider = t.withIdentity({ subject: "user_outsider" });

    const admission = await asOutsider.mutation((ctx) =>
      admitWorkosUser(ctx, {
        workosUserId: "user_outsider",
        email: "outsider@example.edu",
        emailVerified: true,
        rawRoster: roster,
      }),
    );

    expect(admission).toEqual({ status: "denied", reason: "not_on_roster" });
    expect(await asOutsider.query(getCurrentMembership)).toBeNull();
  });

  it("keeps an existing Membership bound after the WorkOS email changes", async () => {
    const t = convexTest(schema, modules);
    const asLearner = t.withIdentity({ subject: "user_learner" });
    await asLearner.mutation((ctx) =>
      admitWorkosUser(ctx, {
        workosUserId: "user_learner",
        email: "learner@example.edu",
        emailVerified: true,
        rawRoster: roster,
      }),
    );

    const admission = await asLearner.mutation((ctx) =>
      admitWorkosUser(ctx, {
        workosUserId: "user_learner",
        email: "changed@example.edu",
        emailVerified: true,
        rawRoster: roster,
      }),
    );

    expect(admission.status).toBe("admitted");
  });

  it("does not transfer a consumed roster identity to another WorkOS user", async () => {
    const t = convexTest(schema, modules);
    await t.withIdentity({ subject: "user_first" }).mutation((ctx) =>
      admitWorkosUser(ctx, {
        workosUserId: "user_first",
        email: "learner@example.edu",
        emailVerified: true,
        rawRoster: roster,
      }),
    );

    const admission = await t
      .withIdentity({ subject: "user_second" })
      .mutation((ctx) =>
        admitWorkosUser(ctx, {
          workosUserId: "user_second",
          email: "learner@example.edu",
          emailVerified: true,
          rawRoster: roster,
        }),
      );

    expect(admission).toEqual({
      status: "denied",
      reason: "roster_entry_already_bound",
    });
  });
});
