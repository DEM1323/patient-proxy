import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { generatedDebriefTemplates } from "./debriefTemplates";
import type {
  DebriefContent,
  DebriefPublication,
  ScenarioContent,
} from "./scenarioContent";

export type VersionFields = Pick<
  ScenarioContent,
  "title" | "learnerBrief" | "clinicalTruth" | "debrief"
> & { debriefPublication?: DebriefPublication };

/**
 * The one path to a new Scenario Version, shared by provisioning and Author
 * publication. Fields that match the current version reuse it; anything else
 * becomes the next version, and Attempts stay pinned to the version they
 * started with, debrief content included.
 */
export async function publishScenarioVersion(
  ctx: MutationCtx,
  scenario: Doc<"scenarios">,
  current: Doc<"scenarioVersions"> | null,
  fields: VersionFields,
) {
  if (current && canonicalJson(authored(current)) === canonicalJson(authored(fields))) {
    return { version: current.version, published: false };
  }
  const version = (current?.version ?? 0) + 1;
  const versionId = await ctx.db.insert("scenarioVersions", {
    institutionId: scenario.institutionId,
    scenarioId: scenario._id,
    version,
    title: fields.title,
    learnerBrief: fields.learnerBrief,
    clinicalTruth: fields.clinicalTruth,
    ...(fields.debrief ? { debrief: fields.debrief } : {}),
    ...(fields.debriefPublication
      ? { debriefPublication: fields.debriefPublication }
      : {}),
    createdAt: Date.now(),
  });
  await ctx.db.patch(scenario._id, { currentVersionId: versionId });
  return { version, published: true };
}

// The Author-controlled parts of a Scenario Version that decide whether a
// publication is new. Versions published before debrief content existed
// compare equal to content that still has none. Who published is not content.
function authored({ title, learnerBrief, clinicalTruth, debrief }: VersionFields) {
  return { title, learnerBrief, clinicalTruth, debrief: debrief ?? null };
}

export const debriefLimits = {
  criteria: 12,
  label: 120,
  description: 600,
  guidance: 4_000,
  prompt: 600,
};
const criterionKey = /^[a-z0-9_-]{1,64}$/;

/**
 * Feedback matches criteria by key and shows their labels, so a blank,
 * duplicated, or oversized entry would publish a version that can never be
 * rated cleanly. Returns whether the content is publishable.
 */
export function isPublishableDebrief(debrief: DebriefContent) {
  const fits = (value: string, max: number) =>
    value.trim().length > 0 && value.length <= max;
  const criteria = debrief.communicationCriteria ?? [];
  return (
    criteria.length <= debriefLimits.criteria &&
    new Set(criteria.map(({ key }) => key)).size === criteria.length &&
    criteria.every(
      ({ key, label, description }) =>
        criterionKey.test(key) &&
        fits(label, debriefLimits.label) &&
        fits(description, debriefLimits.description),
    ) &&
    (debrief.feedbackGuidance === undefined ||
      fits(debrief.feedbackGuidance, debriefLimits.guidance)) &&
    (debrief.reflectionPrompts === undefined ||
      (fits(debrief.reflectionPrompts.interpretation, debriefLimits.prompt) &&
        fits(debrief.reflectionPrompts.planning, debriefLimits.prompt)))
  );
}

// A generated template reaches Learners only through an Author's recorded
// adoption, never by being published verbatim some other way.
export function isGeneratedTemplate(debrief: DebriefContent) {
  return Object.values(generatedDebriefTemplates).some(
    ({ content }) => canonicalJson(content) === canonicalJson(debrief),
  );
}

// Stored documents need not preserve object key order.
function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`,
      )
      .join(",")}}`;
  }
  return JSON.stringify(value);
}
