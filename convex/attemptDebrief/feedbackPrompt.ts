import type { DebriefContent } from "../attemptStart/scenarioContent";
import type { PatientPrompt } from "../attemptInteraction/patientPrompt";
import type { FeedbackSections, GeneratedPrompts } from "./validators";

export type FeedbackContext = {
  patientName: string;
  setting: string;
  // Instructor-authored guidelines for the feedback AI.
  feedbackGuidance: string | null;
  communicationCriteria: NonNullable<DebriefContent["communicationCriteria"]>;
  // True when the AI writes the Reflection Prompts from the guidance.
  generateReflectionPrompts: boolean;
  // Recorded interaction only, in timeline order. Hidden Clinical Truth is
  // never part of the feedback context.
  timeline: (
    | { sequence: number; kind: "learner_message" | "patient_message"; text: string }
    | { sequence: number; kind: "clinical_action"; label: string; observation: string }
  )[];
};

const maxItemLength = 600;
// Checked against every generated sentence. "score" is allowed because a
// recorded pain score is legitimate evidence.
const performanceClaim = /\b(pass(ed|es)?|fail(ed|s|ing)?|grades?|graded|competen\w*)\b/i;

export function buildFeedbackPrompt(context: FeedbackContext): PatientPrompt {
  const criteria = context.communicationCriteria.length
    ? context.communicationCriteria
        .map(
          ({ key, label, description }) =>
            `- ${key}: ${label}. ${description}`,
        )
        .join("\n")
    : "(none authored; return \"criteria\": [])";
  const guidance = context.feedbackGuidance
    ? `
Instructor guidance for this feedback. Follow it unless it conflicts with the evidence rules below, which always take precedence:
${context.feedbackGuidance}
`
    : "";
  const promptField = context.generateReflectionPrompts
    ? `,
  "reflectionPrompts": {"interpretation": string, "planning": string}
      // two questions, following the instructor guidance, that the student answers BEFORE seeing this feedback:
      // one about interpreting what happened in this Attempt, one about planning another Attempt.
      // They must not reveal or hint at your feedback.`
    : "";

  const systemInstruction = `You write Formative Feedback on a nursing student's communication practice with ${context.patientName}, a fictional Simulated Patient (${context.setting}). This is synthetic educational feedback, not clinical guidance.
${guidance}
Evidence rules:
- Use only the numbered timeline events you are given. Cite event numbers for every claim. Never describe anything that is not in the timeline.
- Give feedback on communication only. Clinical Actions may be mentioned only as recorded facts; never judge whether an action was correct, well-timed, or missing.
- When an expected communication behavior does not appear in the timeline, say it was "not observed in this Attempt". Never say it was performed incorrectly.
- Never give a score, grade, pass or fail result, or any claim about competence.

Communication Criteria, authored by the student's instructors:
${criteria}

Return only JSON with exactly this shape:
{
  "summary": [{"text": string, "evidence": [event numbers]}],        // 1 to 4 items, each citing at least one event
  "strengths": [{"text": string, "evidence": [event numbers]}],      // 0 to 3 items, each citing at least one event
  "priorities": [{"text": string, "evidence": [event numbers], "observed": boolean}],
      // 1 to 3 items; "observed": false for behavior not observed in this Attempt (evidence may then be empty)
  "criteria": [{"key": string, "rating": "demonstrated" | "partially_demonstrated" | "not_yet_demonstrated",
                "rationale": string, "evidence": [event numbers]}],
      // one entry per criterion above, in the same order; "not_yet_demonstrated" means not observed
  "suggestions": [string, string]                                    // exactly two specific suggestions for another Attempt${promptField}
}`;

  const timeline = context.timeline
    .map((event) => {
      if (event.kind === "clinical_action") {
        return `${event.sequence}. Clinical Action recorded: ${event.label}. Observation shown: ${event.observation}`;
      }
      const speaker =
        event.kind === "learner_message" ? "Student" : context.patientName;
      return `${event.sequence}. ${speaker}: ${event.text}`;
    })
    .join("\n");

  return {
    systemInstruction,
    contents: [
      {
        role: "user",
        parts: [{ text: `Attempt timeline:\n${timeline || "(no interaction recorded)"}` }],
      },
    ],
  };
}

/**
 * Returns validated sections (and generated Reflection Prompts when
 * requested), or null when the output is malformed, cites evidence that was
 * not recorded, misses a required part, or makes a performance claim. A null
 * result becomes a recoverable failure.
 */
export function parseFeedback(
  raw: string,
  context: FeedbackContext,
): {
  sections: FeedbackSections;
  reflectionPrompts: GeneratedPrompts | null;
} | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(data)) {
    return null;
  }
  const recorded = new Set(context.timeline.map(({ sequence }) => sequence));
  const texts: string[] = [];
  const text = (value: unknown) => {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    if (!trimmed || trimmed.length > maxItemLength) return null;
    texts.push(trimmed);
    return trimmed;
  };
  const evidence = (value: unknown, required: boolean) => {
    if (!Array.isArray(value)) return null;
    if (!value.every((n) => typeof n === "number" && recorded.has(n))) {
      return null;
    }
    const unique = [...new Set(value as number[])].sort((a, b) => a - b);
    return required && unique.length === 0 ? null : unique;
  };
  const citedItems = (value: unknown, min: number, max: number) => {
    if (!Array.isArray(value) || value.length < min || value.length > max) {
      return null;
    }
    const items: { text: string; evidence: number[] }[] = [];
    for (const item of value) {
      if (!isRecord(item)) return null;
      const itemText = text(item.text);
      const itemEvidence = evidence(item.evidence, true);
      if (!itemText || !itemEvidence) return null;
      items.push({ text: itemText, evidence: itemEvidence });
    }
    return items;
  };

  const summary = citedItems(data.summary, 1, 4);
  const strengths = citedItems(data.strengths, 0, 3);
  if (!summary || !strengths) return null;

  if (
    !Array.isArray(data.priorities) ||
    data.priorities.length < 1 ||
    data.priorities.length > 3
  ) {
    return null;
  }
  const priorities: FeedbackSections["priorities"] = [];
  for (const item of data.priorities) {
    if (!isRecord(item) || typeof item.observed !== "boolean") return null;
    const itemText = text(item.text);
    const itemEvidence = evidence(item.evidence, item.observed);
    if (!itemText || !itemEvidence) return null;
    priorities.push({ text: itemText, evidence: itemEvidence, observed: item.observed });
  }

  let criteria: FeedbackSections["criteria"] = null;
  if (context.communicationCriteria.length > 0) {
    if (
      !Array.isArray(data.criteria) ||
      data.criteria.length !== context.communicationCriteria.length
    ) {
      return null;
    }
    criteria = [];
    for (const [index, authored] of context.communicationCriteria.entries()) {
      const item: unknown = data.criteria[index];
      if (!isRecord(item) || item.key !== authored.key) return null;
      const rating = item.rating;
      if (
        rating !== "demonstrated" &&
        rating !== "partially_demonstrated" &&
        rating !== "not_yet_demonstrated"
      ) {
        return null;
      }
      const rationale = text(item.rationale);
      const itemEvidence = evidence(
        item.evidence,
        rating !== "not_yet_demonstrated",
      );
      if (!rationale || !itemEvidence) return null;
      criteria.push({
        key: authored.key,
        label: authored.label,
        rating,
        rationale,
        evidence: itemEvidence,
      });
    }
  }

  if (!Array.isArray(data.suggestions) || data.suggestions.length !== 2) {
    return null;
  }
  const suggestions = data.suggestions.map(text);
  if (suggestions.some((suggestion) => suggestion === null)) return null;

  let reflectionPrompts: GeneratedPrompts | null = null;
  if (context.generateReflectionPrompts) {
    const prompts = data.reflectionPrompts;
    if (!isRecord(prompts)) return null;
    const interpretation = text(prompts.interpretation);
    const planning = text(prompts.planning);
    if (!interpretation || !planning) return null;
    reflectionPrompts = { interpretation, planning };
  }

  if (texts.some((sentence) => performanceClaim.test(sentence))) {
    return null;
  }
  return {
    sections: {
      summary,
      strengths,
      priorities,
      criteria,
      suggestions: suggestions as string[],
    },
    reflectionPrompts,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
