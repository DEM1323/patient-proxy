import { v, type Infer } from "convex/values";

export const learnerBriefValidator = v.object({
  patientName: v.string(),
  setting: v.string(),
  estimatedMinutes: v.object({ min: v.number(), max: v.number() }),
  handoff: v.array(v.string()),
  visibleSigns: v.array(v.string()),
});

// Deterministic authored Clinical Actions. An action's observation is the
// first rule whose conditions hold: `stage` is the stage when the action is
// taken, and `ifPerformed` requires that action to have occurred already in
// the Attempt (this occurrence included). A stage is reached once every action
// it `requires` has occurred since the previous stage was reached; its
// `announcement` follows the observation of the action that reaches it, and
// its `state` becomes the Simulated Patient's current condition.
export const clinicalActionsValidator = v.object({
  actions: v.array(
    v.object({
      key: v.string(),
      label: v.string(),
      observations: v.array(
        v.object({
          stage: v.optional(v.string()),
          ifPerformed: v.optional(v.string()),
          text: v.string(),
        }),
      ),
    }),
  ),
  stages: v.array(
    v.object({
      key: v.string(),
      requires: v.array(v.string()),
      state: v.array(v.string()),
      announcement: v.optional(v.string()),
    }),
  ),
});

export const clinicalTruthValidator = v.object({
  learningObjectives: v.array(v.string()),
  initialState: v.array(v.string()),
  progression: v.array(v.string()),
  // Absent from Scenario Versions published before Clinical Actions (#11).
  clinicalActions: v.optional(clinicalActionsValidator),
});

export type LearnerBrief = Infer<typeof learnerBriefValidator>;
export type ClinicalTruth = Infer<typeof clinicalTruthValidator>;
export type ClinicalActions = Infer<typeof clinicalActionsValidator>;

const arrivalState = [
  "Drowsy, pale, shivering, and moaning.",
  "BP 124/84, HR 92, RR 8, SpO2 93% on room air, temperature 98.4 F.",
  "Opens eyes to voice, follows simple commands, oriented to person but initially unsure where she is.",
  "Reports deep aching abdominal pain at 5/10 when assessed.",
];
const stabilizedState = [
  "More alert than on arrival; opens eyes to voice and follows simple commands.",
  "BP 124/84, HR 92, RR 8, SpO2 98% on oxygen, temperature 98.4 F; respirations remain slow.",
  "Reports deep aching abdominal pain at 5/10 when assessed.",
  "Now feels sick to her stomach and is worried she might vomit and choke.",
];

export const initialPacuAssessment = {
  key: "initial-pacu-assessment",
  title: "Initial PACU Assessment",
  learnerBrief: {
    patientName: "Elena Ruiz",
    setting: "Post-anesthesia care unit (PACU)",
    estimatedMinutes: { min: 8, max: 12 },
    handoff: [
      "Elena Ruiz, 42, has just arrived in the PACU after an uncomplicated abdominal procedure under general anesthesia.",
      "She was extubated in the operating room and received IV opioid analgesia shortly before transfer.",
      "You are the nurse receiving her from the operating room team.",
    ],
    visibleSigns: [
      "Breathing spontaneously",
      "Responds to her name",
      "IV fluids infusing",
    ],
  },
  clinicalTruth: {
    learningObjectives: [
      "Establish safe, therapeutic contact using hand hygiene, introduction, and two patient identifiers.",
      "Recognize and respond to postoperative respiratory risk using focused assessment, monitoring, positioning, and oxygen support.",
      "Assess pain and nausea, respond to immediate safety needs, and communicate concerns for further treatment.",
    ],
    initialState: arrivalState,
    progression: [
      "After airway positioning and oxygen/monitoring, SpO2 improves to 98% and she becomes more alert; respirations initially remain slow.",
      "She then reports nausea and aspiration concern.",
      "Safe positioning and an emesis basin conclude the authored progression.",
    ],
    // Scenario decision #5, with the user's 2026-09-25 rulings: improvement
    // needs both airway positioning and oxygen/monitoring, identifiers are
    // confirmed without values, and nausea is reported at stabilization.
    clinicalActions: {
      actions: [
        {
          key: "hand_hygiene",
          label: "Perform hand hygiene",
          observations: [{ text: "Hand hygiene recorded." }],
        },
        {
          key: "verify_identifiers",
          label: "Verify two patient identifiers",
          observations: [
            {
              text: "Elena states her full name and date of birth; both match her wristband and the PACU record.",
            },
          ],
        },
        {
          key: "vital_signs",
          label: "Obtain all vital signs",
          observations: [
            {
              stage: "arrival",
              ifPerformed: "oxygen_monitoring",
              text: "BP 124/84, HR 92, RR 8, SpO2 93% on oxygen, temperature 98.4 F.",
            },
            {
              stage: "arrival",
              text: "BP 124/84, HR 92, RR 8, SpO2 93% on room air, temperature 98.4 F.",
            },
            {
              text: "BP 124/84, HR 92, RR 8, SpO2 98% on oxygen, temperature 98.4 F.",
            },
          ],
        },
        {
          key: "assess_consciousness",
          label: "Assess level of consciousness",
          observations: [
            {
              stage: "arrival",
              text: "Opens eyes to voice and follows simple commands. Oriented to person but unsure where she is.",
            },
            {
              text: "More alert than on arrival. Opens eyes to voice and follows simple commands.",
            },
          ],
        },
        {
          key: "assess_pain",
          label: "Assess pain",
          observations: [
            { text: "Elena reports deep, aching abdominal pain at 5/10." },
          ],
        },
        {
          key: "position_airway",
          label: "Position for airway safety",
          observations: [{ text: "Elena is positioned for airway safety." }],
        },
        {
          key: "oxygen_monitoring",
          label: "Apply oxygen and monitoring",
          observations: [
            { text: "Oxygen applied and continuous monitoring started." },
          ],
        },
        {
          key: "emesis_basin",
          label: "Provide an emesis basin and position for nausea",
          observations: [
            {
              text: "An emesis basin is placed within reach and Elena is positioned for nausea.",
            },
          ],
        },
      ],
      stages: [
        { key: "arrival", requires: [], state: arrivalState },
        {
          key: "stabilized",
          requires: ["position_airway", "oxygen_monitoring"],
          state: stabilizedState,
          announcement:
            "SpO2 improves to 98% and Elena becomes more alert, although her respirations remain slow. She then says she feels sick to her stomach and is worried she might vomit and choke.",
        },
        {
          key: "concluded",
          requires: ["emesis_basin"],
          state: [
            ...stabilizedState,
            "Has an emesis basin at hand and is positioned safely for nausea.",
          ],
          announcement:
            "Elena is positioned safely with an emesis basin at hand. This concludes the authored progression of the Scenario.",
        },
      ],
    },
  },
} satisfies {
  key: string;
  title: string;
  learnerBrief: LearnerBrief;
  clinicalTruth: ClinicalTruth;
};
