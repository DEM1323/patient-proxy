import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { generatedDebriefTemplates } from "../attemptStart/debriefTemplates";
import {
  isGeneratedTemplate,
  isPublishableDebrief,
  publishScenarioVersion,
} from "../attemptStart/publishing";
import type { DebriefContent } from "../attemptStart/scenarioContent";
import { requireRole } from "../membershipAccess/authorization";
import type { MembershipView } from "../membershipAccess/model";

type ReadContext = Pick<QueryCtx, "auth" | "db">;

export type DebriefSource = "none" | "provisioned" | "author" | "adopted_template";

/**
 * Every Scenario in the Author's Pilot Institution with its current
 * version's debrief status. Authoring reads no Clinical Truth.
 */
export async function listAuthoringScenarios(ctx: ReadContext) {
  const author = await requireRole(ctx, "author");
  const scenarios = await ctx.db
    .query("scenarios")
    .withIndex("by_institution_key", (query) =>
      query.eq("institutionId", author.institution.id),
    )
    .collect();
  const result = [];
  for (const scenario of scenarios) {
    const current = await currentVersion(ctx, scenario);
    if (current) {
      result.push({
        id: scenario._id,
        title: current.title,
        version: current.version,
        debrief: debriefSource(current),
      });
    }
  }
  return result;
}

export async function getScenarioDebrief(ctx: ReadContext, rawScenarioId: string) {
  const author = await requireRole(ctx, "author");
  const found = await findScenario(ctx, author, rawScenarioId);
  if (!found) {
    return null;
  }
  const { scenario, current } = found;
  const publication = current.debriefPublication;
  const publisher = publication ? await ctx.db.get(publication.membershipId) : null;
  const template = generatedDebriefTemplates[scenario.key];
  return {
    id: scenario._id,
    title: current.title,
    patientName: current.learnerBrief.patientName,
    setting: current.learnerBrief.setting,
    version: current.version,
    debrief: current.debrief ?? null,
    source: debriefSource(current),
    publication: publication
      ? {
          publishedBy: publisher?.rosterEmail ?? null,
          publishedAt: publication.publishedAt,
        }
      : null,
    template: template
      ? { notice: template.notice, content: template.content }
      : null,
  };
}

/**
 * Publishes the Author's debrief content as the Scenario's next version
 * through the shared publication path, recording who published it and when.
 * A generated template published unchanged needs `adoptTemplate`, and is
 * then recorded as an adoption rather than the Author's own wording.
 */
export async function publishDebrief(
  ctx: MutationCtx,
  input: { scenarioId: string; debrief: DebriefContent; adoptTemplate: boolean },
) {
  const author = await requireRole(ctx, "author");
  const found = await findScenario(ctx, author, input.scenarioId);
  if (!found) {
    return { status: "not_found" as const };
  }
  const debrief = normalize(input.debrief);
  if (debrief === "invalid" || (debrief && !isPublishableDebrief(debrief))) {
    return { status: "invalid" as const };
  }
  const adopted = debrief !== null && isGeneratedTemplate(debrief);
  if (adopted && !input.adoptTemplate) {
    return { status: "template_not_adopted" as const };
  }
  const { scenario, current } = found;
  // Clinical content comes from the current version unchanged; the same
  // debrief content again publishes nothing.
  const { version, published } = await publishScenarioVersion(ctx, scenario, current, {
    title: current.title,
    learnerBrief: current.learnerBrief,
    clinicalTruth: current.clinicalTruth,
    debrief: debrief ?? undefined,
    debriefPublication: {
      membershipId: author.id,
      publishedAt: Date.now(),
      source: adopted ? "adopted_template" : "author",
    },
  });
  if (!published) {
    return { status: "unchanged" as const, version };
  }
  return { status: "published" as const, version };
}

// Trims every entry and drops empty optional parts. Both Reflection Prompts
// or neither: a single prompt is invalid. Null means no debrief content.
function normalize(input: DebriefContent): DebriefContent | null | "invalid" {
  const guidance = input.feedbackGuidance?.trim();
  const criteria = (input.communicationCriteria ?? []).map(
    ({ key, label, description }) => ({
      key: key.trim(),
      label: label.trim(),
      description: description.trim(),
    }),
  );
  const interpretation = input.reflectionPrompts?.interpretation.trim() ?? "";
  const planning = input.reflectionPrompts?.planning.trim() ?? "";
  if (Boolean(interpretation) !== Boolean(planning)) {
    return "invalid";
  }
  const debrief: DebriefContent = {
    ...(guidance ? { feedbackGuidance: guidance } : {}),
    ...(criteria.length ? { communicationCriteria: criteria } : {}),
    ...(interpretation ? { reflectionPrompts: { interpretation, planning } } : {}),
  };
  return Object.keys(debrief).length ? debrief : null;
}

function debriefSource(version: Doc<"scenarioVersions">): DebriefSource {
  if (version.debriefPublication) {
    return version.debriefPublication.source;
  }
  return version.debrief ? "provisioned" : "none";
}

async function findScenario(
  ctx: ReadContext,
  author: MembershipView,
  rawScenarioId: string,
) {
  const scenarioId = ctx.db.normalizeId("scenarios", rawScenarioId);
  const scenario = scenarioId ? await ctx.db.get(scenarioId) : null;
  if (!scenario || scenario.institutionId !== author.institution.id) {
    return null;
  }
  const current = await currentVersion(ctx, scenario);
  return current ? { scenario, current } : null;
}

async function currentVersion(ctx: ReadContext, scenario: Doc<"scenarios">) {
  return scenario.currentVersionId
    ? await ctx.db.get(scenario.currentVersionId)
    : null;
}

