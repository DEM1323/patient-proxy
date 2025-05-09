import React from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { ScrollArea } from "@/app/components/ui/scroll-area";

interface SidePanelProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  children?: React.ReactNode;
}

// Add new props interface for the patient information panel
interface PatientInformationPanelProps extends SidePanelProps {
  patientData?: {
    dob?: string;
    mrNumber?: string;
  };
  patientProfile?: {
    gender?: string;
    age?: number | string;
    weight?: string;
    height?: string;
    allergies?: string;
  };
  medicalHistory?: {
    prior?: string;
    recent?: string;
  };
}

export const SidePanel: React.FC<SidePanelProps> = ({
  title,
  isOpen,
  onClose,
  onNext,
  onPrevious,
  children,
}) => {
  return (
    <div
      className={`absolute top-0 right-0 bottom-0 w-[400px] bg-[#1a6a9c] text-white  z-10 h-full transition-all duration-300 ease-in-out transform ${
        isOpen ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className="flex items-center justify-between p-3 border-b border-white-700">
        <h2 className="text-xl font-bold">{title}</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-white hover:bg-white hover:text-[#1a6a9c] rounded-full h-7 w-7 group"
        >
          <X className="h-4 w-4 text-white group-hover:text-[#015a8b]" />
        </Button>
      </div>

      {/* Main content area with padding at the bottom for navigation */}
      <ScrollArea className="h-[calc(100%-58px)]">
        <div className="p-4 pb-16">{children}</div>
      </ScrollArea>

      {/* Absolutely positioned navigation buttons */}
      <div className="bg-[#1a6a9c] border-t border-white-700 pt-4 absolute bottom-4 left-0 right-0 flex justify-between px-6">
        <Button
          variant="ghost"
          className="bg-transparent border border-white text-white hover:bg-white hover:text-[#1a6a9c] p-0 w-8 h-8 rounded-full group"
          onClick={onPrevious}
          disabled={!onPrevious}
          aria-label="Previous panel"
        >
          <ChevronLeft className="h-4 w-4 text-white group-hover:text-[#015a8b]" />
        </Button>
        <Button
          variant="ghost"
          className="bg-transparent border border-white text-white hover:bg-white hover:text-[#1a6a9c] p-0 w-8 h-8 rounded-full group"
          onClick={onNext}
          disabled={!onNext}
          aria-label="Next panel"
        >
          <ChevronRight className="h-4 w-4 text-white group-hover:text-[#015a8b]" />
        </Button>
      </div>
    </div>
  );
};

// Specialized panels for each type of content
export const ScenarioOverviewPanel: React.FC<SidePanelProps> = (props) => {
  return (
    <SidePanel {...props}>
      <div className="space-y-3 text-sm">
        <p>
          This case presents a postoperative patient in the post anesthesia care
          unit (PACU). The patient has just arrived in the PACU. The student
          will be expected to address safety concerns and perform basic
          assessment. The patient will be complaining of nausea and pain. The
          student will be expected to address these complaints and manage them
          appropriately.
        </p>
      </div>
    </SidePanel>
  );
};

export const PatientReportPanel: React.FC<SidePanelProps> = (props) => {
  return (
    <SidePanel {...props}>
      <div className="space-y-3 text-sm">
        <p>
          Doris Bowman is a 39-year-old female patient that has underwent a
          total abdominal hysterectomy with bilateral salpingoopherectomy under
          general anesthesia. Patient tolerated the with a 4x4 gauze dressing
          and no drainage. She has received a total of 2 liter LR during
          surgery. The second liter of LR is still infusing at 125 mL/hr. The
          estimated blood loss is 400 mL. She was extubated in the operating
          room and is breathing spontaneously at 10 breaths per minute. She has
          a Foley catheter placed with 200 mL urine output. She has received 5
          mg Morphine IV just before leaving the operating room.
        </p>
        <h4 className="text-base mt-4 font-semibold">
          Clinical signs immediately visible:
        </h4>
        <ul className="list-disc pl-5 space-y-0.5">
          <li>Pale</li>
          <li>Response to name</li>
          <li>Moves extremities on command</li>
          <li>Moaning</li>
        </ul>
      </div>
    </SidePanel>
  );
};

export const PatientInformationPanel: React.FC<
  PatientInformationPanelProps
> = ({
  patientData = {},
  patientProfile = {},
  medicalHistory = {},
  ...props
}) => {
  // Default data to use when no dynamic data is provided
  const defaultData = {
    gender: "Female",
    age: "39",
    weight: "132 pounds (60 kg)",
    height: "66 inches (1.67 meters)",
    dob: "2/10/XX",
    mrNumber: "PCS21000",
    allergies: "None",
    priorMedicalHistory:
      "No significant history. She takes no medication other than iron that her physician has recently ordered for anemia related to her menorrhagia.",
    recentMedicalHistory:
      'Patient has been experiencing painful and heavy periods, Recent medical history: pelvic "pressure", bloating, and fatigue. She also mentions urinary frequency and some shortness of breath with exertion. All of these symptoms began gradually and have been getting worse over the last several months. She was seen by her gynecologist at which time a diagnosis of fibroid uterus with resultant dysmenorrhea and menorrhagia was made. Following a CBC and Hgb of 8 g/dL she was also diagnosed with anemia and placed on iron tablets.',
  };

  return (
    <SidePanel {...props}>
      <div className="space-y-3 text-sm">
        <h4 className="text-base font-semibold">Patient Data:</h4>

        <div className="space-y-1">
          <p>
            <strong>Age:</strong> {patientProfile.age || defaultData.age} years
          </p>
          <p>
            <strong>Gender:</strong>{" "}
            {patientProfile.gender || defaultData.gender}
          </p>
          <p>
            <strong>Weight:</strong>{" "}
            {patientProfile.weight || defaultData.weight}
          </p>
          <p>
            <strong>Height:</strong>{" "}
            {patientProfile.height || defaultData.height}
          </p>
          <p>
            <strong>DOB:</strong> {patientData.dob || defaultData.dob}
          </p>
          <p>
            <strong>MR#:</strong> {patientData.mrNumber || defaultData.mrNumber}
          </p>
          <p>
            <strong>Allergies:</strong>{" "}
            {patientProfile.allergies || defaultData.allergies}
          </p>
        </div>

        <h4 className="text-base mt-3 font-semibold">Prior medical history:</h4>
        <p>{medicalHistory.prior || defaultData.priorMedicalHistory}</p>

        <h4 className="text-base mt-3 font-semibold">
          Recent medical history:
        </h4>
        <p>{medicalHistory.recent || defaultData.recentMedicalHistory}</p>
      </div>
    </SidePanel>
  );
};

export const SimulationActionsPanel: React.FC<
  SidePanelProps & {
    availableActions?: Array<{
      id: string;
      name: string;
      icon: React.ReactNode;
      options?: Array<{
        id: string;
        name: string;
      }>;
    }>;
    onActionSelect?: (actionId: string, optionId?: string) => void;
  }
> = ({ availableActions = [], onActionSelect = () => {}, ...props }) => {
  return (
    <SidePanel {...props}>
      <div className="space-y-3 text-sm">
        <p className="mb-3">
          Select from the available actions to perform during this simulation:
        </p>

        <div className="grid grid-cols-1 gap-2">
          {availableActions.map((action) => (
            <div key={action.id} className="space-y-0.5">
              <button
                onClick={() => !action.options && onActionSelect(action.id)}
                className="w-full flex items-center justify-between p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-md text-white text-sm font-medium"
              >
                <div className="flex items-center">
                  <span className="mr-1.5">{action.icon}</span>
                  {action.name}
                </div>
                {action.options && <span>►</span>}
              </button>

              {action.options && (
                <div className="space-y-0.5 pl-3">
                  {action.options.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => onActionSelect(action.id, option.id)}
                      className="w-full py-1.5 px-2 bg-white bg-opacity-10 hover:bg-opacity-20 rounded-md text-xs flex items-center text-white"
                    >
                      {option.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </SidePanel>
  );
};
