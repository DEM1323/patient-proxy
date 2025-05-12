import { PatientProfile } from "./patient";

export interface SimulationLearningObjective {
  id: string;
  objective: string;
}

export interface NursingDiagnosis {
  id: string;
  diagnosis: string;
  characteristics: string[];
}

export interface ScenarioChartPoint {
  id: string;
  time_range: string;
  monitor_settings: {
    RR?: number;
    HR?: number;
    BP?: string;
    SpO2?: string;
    Temp?: string;
    awRR?: number;
    other?: Record<string, any>;
  };
  patient_actions: {
    auscultation_sounds?: string[];
    vocal_sounds?: string[];
    other_actions?: string[];
  };
  student_expected_actions: string[];
  cue_provider?: string;
  cue_prompt?: string;
}

export interface AIPatientPrompt {
  id: string;
  trigger: string;
  response: string;
}

export interface AIFeedbackRule {
  id: string;
  condition: string;
  feedback: string;
}

export interface AIObservationLog {
  id: string;
  action: string;
  timestamp: string;
  result?: string;
}

export interface DetailedPatientData {
  dob?: string;
  mrNumber?: string;
}

export interface SimulationScenario {
  id: string;
  title: string;
  description?: string;
  patient_profile_id?: string;
  medical_history_prior?: string;
  medical_history_recent?: string;
  nursing_diagnosis?: string[] | any[];
  symptoms?: Record<string, string>;
  vital_signs?: Record<string, string>;
  lab_results?: Record<string, string>;
  expected_treatment_steps?: ExpectedTreatmentStep[];
  scenario_chart?: ScenarioChart;
  ai_patient_prompts?: AIPatientPrompt[];
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  is_global?: boolean;
}

export interface ScenarioChart {
  vital_signs?: Record<string, string>;
  symptoms?: Record<string, string>;
  lab_results?: Record<string, string>;
}

export interface ExpectedTreatmentStep {
  action: string;
  detail?: string;
  required: boolean;
  completed?: boolean;
  rationale?: string;
}

export interface SimulationAction {
  type: string;
  detail: string;
  timestamp: number;
}

export interface PatientProfileData {
  id: string;
  patientName: string;
  age?: string | number;
  gender?: string;
  diagnosis?: string;
  allergies?: string;
  weight?: string;
  height?: string;
  medicationItems?: PatientProfileItem[];
  respiratoryItems?: PatientProfileItem[];
  diagnosticItems?: PatientProfileItem[];
  socialHistoryItems?: PatientProfileItem[];
  activityItems?: PatientProfileItem[];
  drainItems?: PatientProfileItem[];
  medicationFromHomeItems?: PatientProfileItem[];
  monitoringItems?: PatientProfileItem[];
  majorSupport?: string;
  diet?: string;
  fallPrecautions?: string;
  isolationPrecautions?: string;
  dischargePlanning?: string;
  vitalSigns?: VitalSigns;
  socialHistory?: string;
  medicalHistory?: string;
  isGlobal?: boolean;
  profile_data?: any;
}

export interface PatientProfileItem {
  title: string;
  details?: string;
  checked: boolean;
}

export interface VitalSigns {
  bloodPressure?: string;
  heartRate?: string;
  respiratoryRate?: string;
  temperature?: string;
  oxygenSaturation?: string;
}

export interface SimulationChatMessage {
  id: string;
  sender: "user" | "patient" | "system";
  content: string;
  timestamp: number;
  observations?: string[];
  feedback?: string[];
}

export interface SimulationSession {
  id: string;
  patientId: string;
  scenarioId?: string;
  startTime: number;
  messages: SimulationChatMessage[];
  actions: SimulationAction[];
  progress: number;
  completed: boolean;
}

export const emptySimulationScenario: SimulationScenario = {
  id: "",
  title: "",
  estimated_time_minutes: 15,
  guided_reflection_time_minutes: 15,
  target_group: "Nurses",
  brief_summary: "",
  learning_objectives: [],
  student_report: "",
  patient_profile_id: "",
  medical_history_prior: "",
  medical_history_recent: "",
  correct_treatment_steps: [],
  nursing_diagnosis: [],
  scenario_chart: [],
  debriefing_notes: "",
  ai_patient_prompts: [],
  ai_expected_actions: [],
  ai_feedback_rules: [],
  ai_debrief_template: "",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  created_by: "",
  is_global: false,
};

// Example simulation scenario based on the provided screenshots
export const sampleSimulationScenario: SimulationScenario = {
  id: "sample-1",
  title: "Post-operative Patient Care",
  estimated_time_minutes: 15,
  guided_reflection_time_minutes: 15,
  target_group: "Nurses",
  brief_summary:
    "This case presents a postoperative patient in the post anesthesia care unit (PACU). The patient has just arrived in the PACU. The student will be expected to address safety concerns and perform basic assessment. The patient will be complaining of nausea and pain. The student will be expected to address these complaints and manage them appropriately.",
  learning_objectives: [
    { id: "1", objective: "Identifies the primary nursing diagnosis" },
    { id: "2", objective: "Implements patient safety measures" },
    {
      id: "3",
      objective:
        "Evaluates patient assessment information including vital signs",
    },
    { id: "4", objective: "Implements therapeutic communication" },
    {
      id: "5",
      objective:
        "Implements direct communication with multidisciplinary team members",
    },
    { id: "6", objective: "Demonstrates effective teamwork" },
    {
      id: "7",
      objective: "Prioritizes and implements Physician Orders appropriately",
    },
    {
      id: "8",
      objective:
        "Recalls indications, contraindications, and potential adverse effects of prescribed medications",
    },
    {
      id: "9",
      objective: 'Implements the "5 rights" of medication administration',
    },
    { id: "10", objective: "Recalls nausea as a complication to anesthesia" },
    {
      id: "11",
      objective:
        "Implements treatment of nausea including medication administration",
    },
    {
      id: "12",
      objective: "Recalls indication and contraindication for oxygen therapy",
    },
    {
      id: "13",
      objective:
        "Determines readiness criteria for discharge from Post Anesthesia Care Unit (PACU)",
    },
    {
      id: "14",
      objective: "Initiates relevant cardiac and respiratory monitoring",
    },
  ],
  student_report:
    "Time: 09:00 a.m.\nDoris Bowman is a 39-year-old female patient that has underwent a total abdominal hysterectomy with bilateral salpingoopherectomy under general anesthesia. Patient tolerated the procedure without complications. She has an abdominal incision covered with a 4x4 gauze dressing and no drainage. She has received a total of 2 liter LR during surgery. The second liter of LR is still infusing at 125 mL/hr. The estimated blood loss is 400 mL. She was extubated in the operating room and is breathing spontaneously at 10 breaths per minute. She has a Foley catheter placed with 200 mL urine output. She has received 5 mg Morphine IV just before leaving the operating room.\n\nClinical signs immediately visible:\n• Pale\n• Response to name\n• Moves extremities on command\n• Moaning",
  patient_profile_id: "sample-1", // References Doris Bowman from the sample patient profile
  medical_history_prior:
    "No significant history. She takes no medication other than iron that her physician has recently ordered for anemia related to her menorrhagia.",
  medical_history_recent:
    'Patient has been experiencing painful and heavy periods, pelvic "pressure", bloating, and fatigue. She also mentions urinary frequency and some shortness of breath with exertion. All of these symptoms began gradually and have been getting worse over the last several months. She was seen by her gynecologist at which time a diagnosis of fibroid uterus with resultant dysmenorrhea and menorrhagia was made. Following a CBC and Hgb of 8 g/dL she was also diagnosed with anemia and placed on iron tablets.',
  correct_treatment_steps: [
    "Wash hands",
    "Introduce self",
    "Identify the patient (name, ID band, DOB, MR#)",
    "Obtain BP, pulse, respiratory rate, temperature, SpO2",
    "Attach ECG leads",
    "Assure side rails are up and locked in position",
    "Assess dressing",
    "Assess level of consciousness",
    "Conduct a pain assessment utilizing a pain scale",
    "Place warm blankets over patient",
    "Give oxygen",
    "Manage nausea and vomiting",
  ],
  nursing_diagnosis: [
    {
      id: "1",
      diagnosis: "Nausea related to anesthesia agent",
      characteristics: ["Report of nausea", "Gagging"],
    },
    {
      id: "2",
      diagnosis: "Acute Pain related to physical injury (surgery)",
      characteristics: [
        "Verbal report",
        "Guarding",
        "Autonomic responses (change in vital signs)",
        "Expressive behavior (moaning)",
      ],
    },
    {
      id: "3",
      diagnosis:
        "Risk for Aspiration related to reduced level of consciousness (anesthesia)",
      characteristics: [],
    },
  ],
  scenario_chart: [
    {
      id: "1",
      time_range: "Initial state",
      monitor_settings: {
        awRR: 8,
        HR: 92,
        BP: "124/84",
        SpO2: "93%",
        Temp: "98.4 F",
      },
      patient_actions: {
        auscultation_sounds: [
          "Hypoactive bowel sounds",
          "Clear breath sounds bilaterally",
        ],
        vocal_sounds: [
          "Moans in response to students interactions",
          "I can't stop shivering.",
        ],
      },
      student_expected_actions: [
        "Wash hands",
        "Introduce self",
        "Identify patient",
        "Obtain vital signs",
        "Attach ECG",
        "Attach SpO2 monitor",
        "Assess LOC",
        "Assess abdominal dressing",
        "Assess IV site, fluid, and rate",
        "Ensure side rails up and locked",
        "Apply warm blanket",
      ],
      cue_provider: "Anesthesiologist",
      cue_prompt:
        "If student does not recognize the need to attach ECG and SpO2 monitors then he/she will be encouraged to do so.",
    },
    {
      id: "2",
      time_range: "5 to 10 minutes",
      monitor_settings: {
        SpO2: "> to 98%",
      },
      patient_actions: {
        vocal_sounds: [
          'Patient more alert asking, "Where am I, is surgery over? My stomach hurts."',
          "I think the level is 4-5.",
          "I am feeling terrible pain in my stomach.",
        ],
      },
      student_expected_actions: [
        "Identify low SpO2 and immediately attaches O2 tubing to oxygen flow meter",
        "Assess pain level 1-10",
        "Review Physicians Order",
      ],
      cue_provider: "Anesthesiologist",
      cue_prompt:
        "If student does not recognize the need to attach oxygen tubing to oxygen flow meter then he/she will be encouraged to do so.",
    },
    {
      id: "3",
      time_range: "10 to 20 minutes",
      monitor_settings: {
        Temp: "98.6 F",
      },
      patient_actions: {
        vocal_sounds: [
          'Patient "I feel really sick to my stomach, I think I am going to throw up."',
        ],
      },
      student_expected_actions: [
        "Turn patient to side and provide emesis basin",
        "Review Physician Orders and administer antiemetic",
        "Assess nausea and effects of medication",
      ],
      cue_provider: "patient",
      cue_prompt: '"Please give me something for my upset stomach."',
    },
  ],
  debriefing_notes:
    "Accuracy in patient identification should be demonstrated with high attention and should be verified by at least two independent patient identifiers. It is also important to raise and secure side rails of the bed to guard against falls.\n\nNursing management for the patient in the Post Anesthesia Care Unit (PACU) is to provide care until the patient has recovered from the effects of anesthesia, is oriented, has stable vital signs, and shows no evidence of complications.\n\nNausea and vomiting are common problems in the PACU. The nurse should intervene at the patient's first report of nausea to control the problem rather than wait for it to progress to vomiting.\n\nThe following measures can be used to determine the patient's readiness for discharge from the PACU:\n• Patient awake\n• Stable vital signs\n• No excess bleeding or drainage\n• No respiratory depression\n• Oxygen saturation greater than 92%",
  ai_patient_prompts: [
    {
      id: "1",
      trigger: "introduction",
      response:
        "Patient moans softly and responds weakly to her name. She appears pale and disoriented.",
    },
    {
      id: "2",
      trigger: "pain assessment",
      response:
        "I'm having terrible pain in my stomach, maybe a 4 or 5 out of 10. It feels like a deep burning sensation.",
    },
    {
      id: "3",
      trigger: "nausea",
      response:
        "I feel really sick to my stomach. I think I might throw up. Please help me.",
    },
    {
      id: "4",
      trigger: "orientation",
      response: "Where am I? Is the surgery over? How did it go?",
    },
    {
      id: "5",
      trigger: "cold",
      response: "I can't stop shivering. I feel so cold.",
    },
  ],
  ai_expected_actions: [
    "Patient identification using two identifiers",
    "Hand hygiene before patient contact",
    "Complete vital signs assessment",
    "Apply cardiac monitoring",
    "Ensure oxygen administration",
    "Pain assessment using numeric scale",
    "Administration of ordered pain medication",
    "Side rails raised for safety",
    "Application of warm blankets",
    "Position patient to prevent aspiration",
    "Administration of antiemetic for nausea",
  ],
  ai_feedback_rules: [
    {
      id: "1",
      condition: "!patient_identification",
      feedback:
        "Patient identification using two independent identifiers is critical for patient safety and should be performed at the beginning of care.",
    },
    {
      id: "2",
      condition: "!vital_signs_complete",
      feedback:
        "Complete assessment of vital signs is essential for establishing baseline measurements and detecting early signs of complications.",
    },
    {
      id: "3",
      condition: "pain_reported && !pain_medication_administered",
      feedback:
        "The patient reported significant pain but appropriate pain medication was not administered in a timely manner.",
    },
    {
      id: "4",
      condition: "nausea_reported && !antiemetic_administered",
      feedback:
        "Proactive management of post-operative nausea is essential to prevent vomiting and potential aspiration.",
    },
  ],
  ai_debrief_template:
    "# Simulation Debrief Summary\n\n## Patient Overview\nDoris Bowman, 39-year-old female, post total abdominal hysterectomy with bilateral salpingoopherectomy.\n\n## Actions Performed Well\n{{positive_actions}}\n\n## Areas for Improvement\n{{improvement_areas}}\n\n## Learning Objectives Assessment\n{{learning_objectives_assessment}}\n\n## Recommendations\n{{recommendations}}",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  created_by: "system",
  is_global: true,
};
