import { v, type Infer } from "convex/values";

export const learnerBriefValidator = v.object({
  patientName: v.string(),
  setting: v.string(),
  estimatedMinutes: v.object({ min: v.number(), max: v.number() }),
  handoff: v.array(v.string()),
  visibleSigns: v.array(v.string()),
});

export const clinicalTruthValidator = v.object({
  learningObjectives: v.array(v.string()),
  initialState: v.array(v.string()),
  progression: v.array(v.string()),
});

export type LearnerBrief = Infer<typeof learnerBriefValidator>;
export type ClinicalTruth = Infer<typeof clinicalTruthValidator>;

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
    initialState: [
      "Drowsy, pale, shivering, and moaning.",
      "BP 124/84, HR 92, RR 8, SpO2 93% on room air, temperature 98.4 F.",
      "Opens eyes to voice, follows simple commands, oriented to person but initially unsure where she is.",
      "Reports deep aching abdominal pain at 5/10 when assessed.",
    ],
    progression: [
      "After airway positioning and oxygen/monitoring, SpO2 improves to 98% and she becomes more alert; respirations initially remain slow.",
      "She then reports nausea and aspiration concern.",
      "Safe positioning and an emesis basin conclude the authored progression.",
    ],
  },
} satisfies {
  key: string;
  title: string;
  learnerBrief: LearnerBrief;
  clinicalTruth: ClinicalTruth;
};
