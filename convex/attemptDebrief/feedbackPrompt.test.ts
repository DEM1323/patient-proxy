import { describe, expect, it } from "vitest";
import {
  buildFeedbackPrompt,
  parseFeedback,
  type FeedbackContext,
} from "./feedbackPrompt";

const context: FeedbackContext = {
  patientName: "Elena Ruiz",
  setting: "Post-anesthesia care unit (PACU)",
  feedbackGuidance: null,
  communicationCriteria: [],
  generateReflectionPrompts: false,
  timeline: [
    { sequence: 2, kind: "learner_message", text: "Hi Elena, I'm your nurse." },
    { sequence: 3, kind: "patient_message", text: "Mm... where am I?" },
    {
      sequence: 4,
      kind: "clinical_action",
      label: "Obtain all vital signs",
      observation: "BP 124/84, HR 92, RR 8, SpO2 93% on room air, temperature 98.4 F.",
    },
  ],
};

function output(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    summary: [{ text: "You introduced yourself and recorded vital signs.", evidence: [2, 4] }],
    strengths: [{ text: "You introduced yourself by role.", evidence: [2] }],
    priorities: [
      {
        text: "Escalation of concern about her breathing was not observed in this Attempt.",
        evidence: [],
        observed: false,
      },
    ],
    criteria: [],
    suggestions: [
      "Answer Elena's question about where she is.",
      "Say aloud what concerns you about her breathing.",
    ],
    ...overrides,
  });
}

describe("Formative Feedback validation", () => {
  it("accepts five evidence-linked sections and marks criteria as not authored", () => {
    expect(parseFeedback(output(), context)).toEqual({
      sections: {
        summary: [
          { text: "You introduced yourself and recorded vital signs.", evidence: [2, 4] },
        ],
        strengths: [{ text: "You introduced yourself by role.", evidence: [2] }],
        priorities: [
          {
            text: "Escalation of concern about her breathing was not observed in this Attempt.",
            evidence: [],
            observed: false,
          },
        ],
        criteria: null,
        suggestions: [
          "Answer Elena's question about where she is.",
          "Say aloud what concerns you about her breathing.",
        ],
      },
      reflectionPrompts: null,
    });
  });

  it("follows instructor guidance and requires generated Reflection Prompts when asked", () => {
    const guided = {
      ...context,
      feedbackGuidance: "Focus on how the student explains care to a frightened patient.",
      generateReflectionPrompts: true,
    };
    const prompt = buildFeedbackPrompt(guided);
    expect(prompt.systemInstruction).toContain(
      "Instructor guidance for this feedback. Follow it unless it conflicts with the evidence rules below",
    );
    expect(prompt.systemInstruction).toContain(guided.feedbackGuidance);
    expect(prompt.systemInstruction).toContain('"reflectionPrompts"');

    const reflectionPrompts = {
      interpretation: "What did Elena's questions tell you about her state?",
      planning: "How will you explain your actions next time?",
    };
    expect(parseFeedback(output({ reflectionPrompts }), guided)?.reflectionPrompts).toEqual(
      reflectionPrompts,
    );
    for (const invalid of [
      undefined,
      { interpretation: "Only one prompt?" },
      { interpretation: "Did you pass?", planning: "What next?" },
    ]) {
      expect(parseFeedback(output({ reflectionPrompts: invalid }), guided)).toBeNull();
    }
    // Without guidance, the prompt asks for no prompts and ignores any returned.
    expect(buildFeedbackPrompt(context).systemInstruction).not.toContain("reflectionPrompts");
    expect(buildFeedbackPrompt(context).systemInstruction).not.toContain("Instructor guidance");
    expect(parseFeedback(output({ reflectionPrompts }), context)?.reflectionPrompts).toBeNull();
  });

  it("rejects malformed output, unrecorded evidence, and missing sections", () => {
    for (const raw of [
      "not json",
      "",
      output({ summary: [] }),
      output({ summary: [{ text: "Something happened.", evidence: [99] }] }),
      output({ strengths: [{ text: "Uncited strength.", evidence: [] }] }),
      output({ priorities: [{ text: "Observed but uncited.", evidence: [], observed: true }] }),
      output({ suggestions: ["Only one suggestion."] }),
      output({ suggestions: ["One.", ""] }),
    ]) {
      expect(parseFeedback(raw, context)).toBeNull();
    }
  });

  it("rejects pass, fail, grade, and competency claims but allows a recorded pain score", () => {
    for (const claim of [
      "You passed this Attempt.",
      "This shows competency in communication.",
      "Your grade reflects strong rapport.",
    ]) {
      expect(
        parseFeedback(output({ summary: [{ text: claim, evidence: [2] }] }), context),
      ).toBeNull();
    }
    expect(
      parseFeedback(
        output({ summary: [{ text: "You asked for her pain score.", evidence: [2] }] }),
        context,
      ),
    ).not.toBeNull();
  });

  it("requires one rating per authored Communication Criterion", () => {
    const withCriteria = {
      ...context,
      communicationCriteria: [
        { key: "contact", label: "Therapeutic contact", description: "Introduces self." },
        { key: "escalation", label: "Escalation", description: "States concern." },
      ],
    };
    const criteria = [
      { key: "contact", rating: "demonstrated", rationale: "You introduced yourself.", evidence: [2] },
      {
        key: "escalation",
        rating: "not_yet_demonstrated",
        rationale: "Not observed in this Attempt.",
        evidence: [],
      },
    ];
    expect(parseFeedback(output({ criteria }), withCriteria)?.sections.criteria).toEqual([
      { ...criteria[0], label: "Therapeutic contact" },
      { ...criteria[1], label: "Escalation" },
    ]);
    for (const invalid of [
      criteria.slice(0, 1),
      [criteria[1], criteria[0]],
      [{ ...criteria[0], rating: "excellent" }, criteria[1]],
      [{ ...criteria[0], evidence: [] }, criteria[1]],
    ]) {
      expect(parseFeedback(output({ criteria: invalid }), withCriteria)).toBeNull();
    }
  });

  it("grounds the prompt in the recorded timeline and communication-only rules", () => {
    const prompt = buildFeedbackPrompt(context);
    expect(prompt.systemInstruction).toContain("not observed in this Attempt");
    expect(prompt.systemInstruction).toContain("Give feedback on communication only");
    expect(prompt.systemInstruction).toContain("(none authored");
    expect(prompt.contents[0].parts[0].text).toContain(
      "4. Clinical Action recorded: Obtain all vital signs.",
    );
    expect(prompt.contents[0].parts[0].text).toContain("2. Student: Hi Elena, I'm your nurse.");
  });
});
