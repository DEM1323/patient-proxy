// Define types for patient simulation system

export interface SimulationScenario {
  id: string;
  title: string;
  description?: string;
  patient_profile_id?: string;
  patient_profile?: PatientProfileData;
  medical_history_prior?: string;
  medical_history_recent?: string;
  nursing_diagnosis?: string[] | any[];
  symptoms?: Record<string, string>;
  vital_signs?: Record<string, string>;
  lab_results?: Record<string, string>;
  expected_treatment_steps?: ExpectedTreatmentStep[];
  scenario_chart?: ScenarioChart;
  ai_patient_prompts?: AIPatientPrompt[];
  ai_expected_actions?: string[];
  detailed_patient_data?: {
    dob?: string;
    mrNumber?: string;
    [key: string]: any;
  };
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

export interface AIPatientPrompt {
  trigger: string;
  response: string;
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
