import type { DebriefContent } from "./scenarioContent";

/**
 * GENERATED TEMPLATE, EDIT BEFORE USE.
 *
 * AI-drafted starting points for a Scenario's debrief content, written at the
 * owner's request (2026-10-27) so Authors can edit them instead of starting
 * from a blank page. They are not Author-approved Communication Criteria,
 * feedback guidance, or Reflection Prompts. Provisioning refuses to publish a
 * template verbatim: an Author must edit or explicitly adopt it first.
 */
export type GeneratedDebriefTemplate = {
  origin: "generated_template";
  notice: string;
  content: DebriefContent;
};

const notice =
  "Generated template, edit before use. AI-drafted from Scenario decision #5; not approved by the Scenario's Authors.";

// Drafted from the approved learning objectives and evidence priorities in
// Scenario decision #5, limited to observable communication.
export const pacuDebriefTemplate: GeneratedDebriefTemplate = {
  origin: "generated_template",
  notice,
  content: {
    feedbackGuidance:
      "Write for a pre-licensure nursing student practicing communication with a drowsy postoperative patient. Be specific and encouraging. Focus on what the student said and how Elena responded, and paraphrase the student's own words when citing them. Mention Clinical Actions only as context for whether the student explained them to Elena; never judge their clinical correctness. Keep each item short.",
    communicationCriteria: [
      {
        key: "introduction_and_identity",
        label: "Introduces self and confirms identity",
        description:
          "Introduces themself and their role, and asks Elena to state her identifiers in words she can follow while drowsy.",
      },
      {
        key: "orientation_and_reassurance",
        label: "Orients and reassures",
        description:
          "Tells Elena where she is and that her surgery is over, and responds to her distress with calm, brief reassurance.",
      },
      {
        key: "explains_care",
        label: "Explains care before giving it",
        description:
          "Tells Elena in plain language what they are about to do and why, such as checking her vital signs, repositioning her, or applying oxygen.",
      },
      {
        key: "elicits_symptoms",
        label: "Asks about pain and nausea",
        description:
          "Uses clear questions to learn how Elena's pain and nausea feel to her, and acknowledges what she reports.",
      },
      {
        key: "responds_to_worry",
        label: "Responds to her worry about vomiting",
        description:
          "Acknowledges Elena's fear of vomiting and choking and tells her what is being done to keep her safe.",
      },
      {
        key: "voices_concern",
        label: "Voices concern about her breathing",
        description:
          "Says aloud, to Elena or as a stated plan, that her slow breathing and oxygen level are a concern and that the care team will be informed.",
      },
    ],
    reflectionPrompts: {
      interpretation:
        "Looking at the record, how do you think Elena was feeling when you first spoke with her, and which of her words or responses told you that?",
      planning:
        "Choose one moment where you could have explained, reassured, or voiced a concern more clearly. What would you say instead in your next Attempt?",
    },
  },
};

export const generatedDebriefTemplates: GeneratedDebriefTemplate[] = [
  pacuDebriefTemplate,
];
