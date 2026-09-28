import type { ClinicalActions } from "../attemptStart/scenarioContent";

type Stage = ClinicalActions["stages"][number];

// Replays Clinical Actions in timeline order to find the current stage.
export function currentStage(
  content: ClinicalActions,
  performed: string[],
): Stage {
  return content.stages[stageIndexAfter(content, performed)];
}

/**
 * The authored observation revealed by taking `actionKey` after `performed`,
 * followed by the announcement of any stage the action reaches. Deterministic:
 * the same history always yields the same text.
 */
export function observe(
  content: ClinicalActions,
  performed: string[],
  actionKey: string,
): string {
  const action = content.actions.find(({ key }) => key === actionKey);
  if (!action) {
    throw new Error("Unknown Clinical Action");
  }
  const before = stageIndexAfter(content, performed);
  const after = stageIndexAfter(content, [...performed, actionKey]);
  const alreadyPerformed = new Set([...performed, actionKey]);
  const rule = action.observations.find(
    ({ stage, ifPerformed }) =>
      (stage === undefined || stage === content.stages[before].key) &&
      (ifPerformed === undefined || alreadyPerformed.has(ifPerformed)),
  );
  if (!rule) {
    throw new Error(`No authored observation for ${actionKey}`);
  }
  const announcements = content.stages
    .slice(before + 1, after + 1)
    .flatMap(({ announcement }) => (announcement ? [announcement] : []));
  return [rule.text, ...announcements].join(" ");
}

function stageIndexAfter(content: ClinicalActions, performed: string[]) {
  let index = 0;
  let sinceStage = new Set<string>();
  for (const key of performed) {
    sinceStage.add(key);
    // A stage counts only actions taken after the previous stage was reached.
    while (
      index + 1 < content.stages.length &&
      content.stages[index + 1].requires.every((required) =>
        sinceStage.has(required),
      )
    ) {
      index += 1;
      sinceStage = new Set();
    }
  }
  return index;
}
