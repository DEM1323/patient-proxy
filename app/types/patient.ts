export interface ChecklistItem {
  id: number;
  title: string;
  details?: string;
  checked: boolean;
}

export interface PatientProfile {
  id: string;
  patientName: string;
  age?: number | null;
  gender?: string;
  allergies?: string;
  unit: string;
  majorSupport: string;
  phone: string;
  immunizations: string;
  case: string;
  diagnosis?: string;
  history?: string;
  operationType: string;
  height: string;
  consultation: string;
  consentObtained: boolean;
  weight: string;
  physician: string;
  advancedDirectives: string;
  diet?: string;
  fallPrecautions: string;
  restraints: string;
  isolationPrecautions: string;
  monitoringItems: ChecklistItem[];
  medicationItems?: ChecklistItem[];
  respiratoryItems: ChecklistItem[];
  diagnosticItems: ChecklistItem[];
  socialHistoryItems: ChecklistItem[];
  activityItems: ChecklistItem[];
  drainItems: ChecklistItem[];
  raceReligion: string;
  medicationFromHome: string;
  medicationFromHomeItems: ChecklistItem[];
  dischargePlanning: string;
  isGlobal?: boolean;
}

export const emptyPatientProfile: PatientProfile = {
  id: "",
  patientName: "",
  age: null,
  gender: "",
  allergies: "",
  unit: "",
  majorSupport: "",
  phone: "",
  immunizations: "",
  case: "",
  diagnosis: "",
  history: "",
  operationType: "",
  height: "",
  consultation: "",
  consentObtained: false,
  weight: "",
  physician: "",
  advancedDirectives: "",
  diet: "",
  fallPrecautions: "",
  restraints: "",
  isolationPrecautions: "",
  monitoringItems: [{ id: 1, title: "", details: "", checked: false }],
  medicationItems: [{ id: 1, title: "", details: "", checked: false }],
  respiratoryItems: [{ id: 1, title: "", details: "", checked: false }],
  diagnosticItems: [{ id: 1, title: "", details: "", checked: false }],
  socialHistoryItems: [{ id: 1, title: "", details: "", checked: false }],
  activityItems: [{ id: 1, title: "", details: "", checked: false }],
  drainItems: [{ id: 1, title: "", details: "", checked: false }],
  raceReligion: "",
  medicationFromHome: "",
  medicationFromHomeItems: [{ id: 1, title: "", details: "", checked: false }],
  dischargePlanning: "",
};

// Sample patient profile for testing
export const samplePatientProfile: PatientProfile = {
  id: "sample-1",
  patientName: "Doris Bowman",
  age: 39,
  gender: "Female",
  allergies: "No known allergies",
  unit: "PACU",
  majorSupport: "",
  phone: "",
  immunizations: "",
  case: "",
  diagnosis: "Dysmenorrhea and menorrhagia",
  history: "",
  operationType: "TAHBSO",
  height: "66 inches (1.67 meters)",
  consultation: "",
  consentObtained: true,
  weight: "132 pounds (60 Kg)",
  physician: "",
  advancedDirectives: "",
  diet: "Sips of H2O advance to clear liquids",
  fallPrecautions: "",
  restraints: "",
  isolationPrecautions: "",
  monitoringItems: [
    { id: 1, title: "I&O", details: "", checked: true },
    { id: 2, title: "Vital signs", details: "", checked: true },
    { id: 3, title: "Telemetry", details: "", checked: true },
    { id: 4, title: "SpO2", details: "", checked: true },
    { id: 5, title: "Neuro checks", details: "", checked: false },
    { id: 6, title: "Neurovascular", details: "", checked: false },
  ],

  medicationItems: [
    {
      id: 1,
      title: "IV access",
      details: "18 g PIV in R forearm",
      checked: true,
    },
    { id: 2, title: "IV fluid", details: "LR at 125 mL / hour", checked: true },
    { id: 3, title: "Oral medication", details: "", checked: false },
    {
      id: 4,
      title: "IV medication",
      details:
        "Zofran 4 mg IVP every 4 hours prn nausea\nMorphine 2 mg IVP prn pain, may repeat every 10 minutes up to maximum of 10 mg",
      checked: true,
    },
    { id: 5, title: "IM/subcutan medication", details: "", checked: false },
  ],

  respiratoryItems: [
    { id: 1, title: "Incentive spirometry", details: "", checked: false },
    { id: 2, title: "O2", details: "", checked: true },
    { id: 3, title: "cannula", details: "", checked: true },
    { id: 4, title: "oxygen mask", details: "", checked: false },
    { id: 5, title: "Nonrebreather mask", details: "", checked: false },
    { id: 6, title: "Bag mask ventilator", details: "", checked: false },
    { id: 7, title: "Nebulize", details: "", checked: false },
  ],

  diagnosticItems: [
    { id: 1, title: "Lab", details: "", checked: false },
    { id: 2, title: "X-ray", details: "", checked: false },
    { id: 3, title: "12 lead ECG", details: "", checked: false },
    { id: 4, title: "CT-scan", details: "", checked: false },
  ],

  socialHistoryItems: [],

  activityItems: [
    { id: 1, title: "Compression stockings", details: "", checked: true },
    { id: 2, title: "Independent", details: "", checked: false },
    { id: 3, title: "Assisted out of bed tonight", details: "", checked: true },
    { id: 4, title: "Total care", details: "", checked: false },
  ],

  drainItems: [
    { id: 1, title: "Indwelling Foley catheter", details: "", checked: true },
    { id: 2, title: "Nasogastric tube", details: "", checked: false },
    { id: 3, title: "LCS", details: "", checked: false },
    { id: 4, title: "LIS", details: "", checked: false },
    { id: 5, title: "Hemovac", details: "", checked: false },
    { id: 6, title: "Feeding Tube", details: "", checked: false },
    { id: 7, title: "Chest tube", details: "", checked: false },
    { id: 8, title: "Dressing change", details: "", checked: false },
  ],
  raceReligion: "",
  medicationFromHome: "None",
  medicationFromHomeItems: [
    {
      id: 1,
      title: "Lisinopril 10mg",
      details: "Daily for hypertension",
      checked: true,
    },
    {
      id: 2,
      title: "Metformin 500mg",
      details: "Twice daily for diabetes",
      checked: true,
    },
  ],
  dischargePlanning: "",
};
