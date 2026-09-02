export const pilotInstitutionNames = {
  umb: "UMB Pilot Institution",
} as const;

export type PilotInstitutionKey = keyof typeof pilotInstitutionNames;

export function isPilotInstitutionKey(
  value: string,
): value is PilotInstitutionKey {
  return value in pilotInstitutionNames;
}
