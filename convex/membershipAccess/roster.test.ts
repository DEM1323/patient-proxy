import { describe, expect, it } from "vitest";
import { parsePilotRoster } from "./roster";

describe("Pilot Roster", () => {
  it("matches only a normalized exact email and preserves additive roles", () => {
    const roster = parsePilotRoster(
      JSON.stringify({
        version: 1,
        entries: [
          {
            email: "  Learner@Example.edu ",
            institutionKey: "umb",
            roles: ["learner", "faculty"],
          },
        ],
      }),
    );

    expect(roster.entries).toEqual([
      {
        email: "learner@example.edu",
        institutionKey: "umb",
        roles: ["learner", "faculty"],
      },
    ]);
    expect(roster.entries.find((entry) => entry.email === "other@example.edu"))
      .toBeUndefined();
  });

  it.each([
    {
      name: "duplicate normalized emails",
      entries: [
        { email: "same@example.edu", institutionKey: "umb", roles: ["learner"] },
        { email: "SAME@example.edu", institutionKey: "umb", roles: ["faculty"] },
      ],
    },
    {
      name: "an unsupported role",
      entries: [
        { email: "member@example.edu", institutionKey: "umb", roles: ["owner"] },
      ],
    },
    {
      name: "an unsupported Pilot Institution",
      entries: [
        {
          email: "member@example.edu",
          institutionKey: "another-institution",
          roles: ["learner"],
        },
      ],
    },
  ])("rejects $name", ({ entries }) => {
    expect(() => parsePilotRoster(JSON.stringify({ version: 1, entries }))).toThrow();
  });
});
