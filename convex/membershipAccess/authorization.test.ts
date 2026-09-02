import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import schema from "../schema";
import { modules } from "../test.setup";
import { admitWorkosUser } from "./model";
import {
  requireRole,
  requireSamePilotInstitution,
} from "./authorization";

const dualRoleRoster = JSON.stringify({
  version: 1,
  entries: [
    {
      email: "member@example.edu",
      institutionKey: "umb",
      roles: ["learner", "faculty"],
    },
  ],
});

describe("Membership authorization", () => {
  it("allows each assigned role independently", async () => {
    const t = convexTest(schema, modules);
    const asMember = t.withIdentity({ subject: "user_member" });
    await asMember.mutation((ctx) =>
      admitWorkosUser(ctx, {
        workosUserId: "user_member",
        email: "member@example.edu",
        emailVerified: true,
        rawRoster: dualRoleRoster,
      }),
    );

    const learner = await asMember.query((ctx) => requireRole(ctx, "learner"));
    const faculty = await asMember.query((ctx) => requireRole(ctx, "faculty"));

    expect(learner.institution.key).toBe("umb");
    expect(faculty.institution.key).toBe("umb");
    await expect(
      asMember.query((ctx) => requireRole(ctx, "institutionalAdmin")),
    ).rejects.toThrow("Institutional Admin role required");
  });

  it("does not inherit permissions from a different role", async () => {
    const t = convexTest(schema, modules);
    const roleRoster = JSON.stringify({
      version: 1,
      entries: [
        {
          email: "learner@example.edu",
          institutionKey: "umb",
          roles: ["learner"],
        },
        {
          email: "faculty@example.edu",
          institutionKey: "umb",
          roles: ["faculty"],
        },
      ],
    });
    const asLearner = t.withIdentity({ subject: "user_learner" });
    const asFaculty = t.withIdentity({ subject: "user_faculty" });
    await asLearner.mutation((ctx) =>
      admitWorkosUser(ctx, {
        workosUserId: "user_learner",
        email: "learner@example.edu",
        emailVerified: true,
        rawRoster: roleRoster,
      }),
    );
    await asFaculty.mutation((ctx) =>
      admitWorkosUser(ctx, {
        workosUserId: "user_faculty",
        email: "faculty@example.edu",
        emailVerified: true,
        rawRoster: roleRoster,
      }),
    );

    await expect(asLearner.query((ctx) => requireRole(ctx, "faculty"))).rejects
      .toThrow("Faculty role required");
    await expect(asFaculty.query((ctx) => requireRole(ctx, "learner"))).rejects
      .toThrow("Learner role required");
  });

  it("rejects a resource from another Pilot Institution", async () => {
    const t = convexTest(schema, modules);
    const asMember = t.withIdentity({ subject: "user_member" });
    await asMember.mutation((ctx) =>
      admitWorkosUser(ctx, {
        workosUserId: "user_member",
        email: "member@example.edu",
        emailVerified: true,
        rawRoster: dualRoleRoster,
      }),
    );
    const otherInstitutionId = await t.run((ctx) =>
      ctx.db.insert("pilotInstitutions", {
        key: "other-institution",
        name: "Other Pilot Institution",
      }),
    );

    await expect(
      asMember.query((ctx) =>
        requireSamePilotInstitution(ctx, otherInstitutionId),
      ),
    ).rejects.toThrow("Pilot Institution scope required");
  });
});
