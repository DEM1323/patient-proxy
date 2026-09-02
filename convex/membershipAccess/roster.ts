import { isMembershipRole, type MembershipRole } from "./roles";
import {
  isPilotInstitutionKey,
  type PilotInstitutionKey,
} from "./pilotInstitutions";

export type PilotRosterEntry = {
  email: string;
  institutionKey: PilotInstitutionKey;
  roles: MembershipRole[];
};

export type PilotRoster = {
  version: 1;
  entries: PilotRosterEntry[];
};

export function normalizeRosterEmail(email: string) {
  return email.trim().toLowerCase();
}

export function parsePilotRoster(rawRoster: string): PilotRoster {
  let value: unknown;

  try {
    value = JSON.parse(rawRoster);
  } catch {
    throw new Error("PILOT_ROSTER_JSON must contain valid JSON");
  }

  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.entries)) {
    throw new Error("PILOT_ROSTER_JSON must use roster version 1");
  }

  const seenEmails = new Set<string>();
  const entries = value.entries.map((entry, index) => {
    if (
      !isRecord(entry) ||
      typeof entry.email !== "string" ||
      typeof entry.institutionKey !== "string" ||
      !Array.isArray(entry.roles)
    ) {
      throw new Error(`Pilot Roster entry ${index + 1} is malformed`);
    }

    const email = normalizeRosterEmail(entry.email);
    if (!email.includes("@") || email.startsWith("@") || email.endsWith("@")) {
      throw new Error(`Pilot Roster entry ${index + 1} has an invalid email`);
    }
    if (seenEmails.has(email)) {
      throw new Error(`Pilot Roster contains duplicate email ${email}`);
    }
    seenEmails.add(email);

    const institutionKey = entry.institutionKey.trim().toLowerCase();
    if (!isPilotInstitutionKey(institutionKey)) {
      throw new Error(
        `Pilot Roster entry ${index + 1} has an unsupported Pilot Institution`,
      );
    }

    if (entry.roles.length === 0 || !entry.roles.every(isMembershipRole)) {
      throw new Error(`Pilot Roster entry ${index + 1} has invalid roles`);
    }
    const roles = [...new Set(entry.roles)] as MembershipRole[];
    if (roles.length !== entry.roles.length) {
      throw new Error(`Pilot Roster entry ${index + 1} has duplicate roles`);
    }

    return { email, institutionKey, roles };
  });

  return { version: 1, entries };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
