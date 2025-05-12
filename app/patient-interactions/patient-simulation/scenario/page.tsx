"use client";

import { useEffect, useState, useRef, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  SimulationScenario,
  PatientProfileData,
  PatientProfileItem,
} from "@/app/types/patient-simulation";
import { PatientProfile } from "@/app/types/patient";
import Image from "next/image";
import {
  ArrowLeft,
  Send,
  Clock,
  StethoscopeIcon,
  Pill,
  Activity,
  ClipboardList,
  ThumbsUp,
  Info,
  Check,
  FileText,
  FileQuestion,
  User,
  Terminal,
} from "lucide-react";
import { ScrollArea } from "@/app/components/ui/scroll-area";
import { Button } from "@/app/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/components/ui/tabs";
import { ChatInput } from "@/app/components/molecules/ChatInput";
import { ChatContainer } from "@/app/components/molecules/ChatContainer";
import {
  ChatMessage,
  type MessageRole,
} from "@/app/components/molecules/ChatMessage";
import { ExitConfirmationDialog } from "@/app/components/molecules/ExitConfirmationDialog";
import { ContentLayout } from "@/app/components/layouts/ContentLayout";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { PatientProfileModal } from "@/app/components/molecules/PatientProfileModal";
import {
  ScenarioOverviewPanel,
  PatientReportPanel,
  PatientInformationPanel,
  SimulationActionsPanel,
} from "@/app/components/molecules/SidePanel";
import {
  PatientConfigModal,
  PatientConfigOptions,
} from "@/app/components/molecules/PatientConfigModal";
import { TabsInputArea } from "@/app/components/molecules/TabsInputArea";

// Message types
interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  senderName?: string;
}

// Simulation phases
type SimulationPhase = "briefing" | "simulation" | "debriefing";

// Actions that a student can take
interface SimulationAction {
  id: string;
  name: string;
  icon: React.ReactNode;
  options?: Array<{
    id: string;
    name: string;
  }>;
}

// Update the header component with proper types
interface HeaderContentProps {
  scenario: SimulationScenario | null;
  simulationPhase: SimulationPhase;
  handleExit: () => void;
  startSimulation: () => void;
  endSimulation: () => void;
  showPatientInfo?: boolean;
  setShowPatientInfo?: (show: boolean) => void;
  onMenuOptionClick?: (option: string) => void;
  simulationDuration?: string;
}

const HeaderContent: React.FC<HeaderContentProps> = ({
  scenario,
  simulationPhase,
  handleExit,
  startSimulation,
  endSimulation,
  showPatientInfo = false,
  setShowPatientInfo = () => {},
  onMenuOptionClick = () => {},
  simulationDuration = "00:00",
}) => {
  const patientProfile = scenario?.patient_profile;

  const menuOptions = [
    {
      id: "scenario-overview",
      label1: "Scenario",
      label2: "Overview",
      icon: <FileQuestion className="h-4 w-4" />,
    },
    {
      id: "patient-report",
      label1: "Patient",
      label2: "Report",
      icon: <FileText className="h-4 w-4" />,
    },
    {
      id: "patient-information",
      label1: "Patient",
      label2: "Information",
      icon: <User className="h-4 w-4" />,
    },
    {
      id: "simulation-actions",
      label1: "Simulation",
      label2: "Actions",
      icon: <Terminal className="h-4 w-4" />,
    },
  ];

  return (
    <div className="flex justify-between items-center w-full">
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 mr-3 hover:bg-[#015a8b] rounded-full group"
          onClick={handleExit}
        >
          <ArrowLeft className="h-5 w-5 text-[#015a8b] group-hover:text-white" />
        </Button>

        <div className="flex items-center">
          {/* Scenario title and phase */}
          <div className="min-w-[180px]">
            <h1 className="text-xl font-semibold text-[#015a8b]">
              {scenario?.title || "Simulation Scenario"}
            </h1>
            <div className="flex items-center text-sm text-gray-500">
              <Clock className="h-4 w-4 mr-1" />
              <span>
                {simulationPhase === "briefing" ? (
                  "Briefing"
                ) : simulationPhase === "simulation" ? (
                  <span className="flex items-center">
                    Time:{" "}
                    <span className="font-medium ml-1 text-[#015a8b]">
                      {simulationDuration}
                    </span>
                  </span>
                ) : (
                  "Debriefing"
                )}
              </span>
            </div>
          </div>

          {/* Divider */}
          {patientProfile && (
            <div className="h-10 border-r border-gray-300 mx-4" />
          )}

          {/* Patient info section */}
          {patientProfile && (
            <div className="flex items-center">
              <div>
                <div className="text-sm font-bold flex items-center">
                  Patient:{" "}
                  <span className="font-normal ml-1">
                    {patientProfile.patientName}
                  </span>
                  {patientProfile.isGlobal && (
                    <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                      Default Profile
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-600">
                  Age: {patientProfile.age} | Gender: {patientProfile.gender}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 ml-2 hover:bg-[#015a8b] rounded-full group"
                onClick={() => setShowPatientInfo(true)}
                title="View patient information"
              >
                <Info className="h-4 w-4 text-[#015a8b] group-hover:text-white" />
              </Button>
            </div>
          )}

          {/* Divider before menu options */}
          <div className="h-10 border-r border-gray-300 mx-3" />

          {/* Menu options with text stacked on two lines */}
          <div className="flex">
            {menuOptions.map((option) => (
              <Button
                key={option.id}
                variant="ghost"
                className="flex flex-col items-center justify-center w-16 h-14 px-1 py-1 mx-1 text-gray-600 hover:text-[#015a8b] hover:bg-gray-100"
                onClick={() => onMenuOptionClick(option.id)}
                title={`${option.label1} ${option.label2}`}
              >
                {option.icon}
                <div className="flex flex-col items-center mt-1">
                  <span className="text-[10px] leading-tight font-medium">
                    {option.label1}
                  </span>
                  <span className="text-[10px] leading-tight font-medium">
                    {option.label2}
                  </span>
                </div>
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div>
        {simulationPhase === "briefing" && (
          <Button
            onClick={startSimulation}
            className="w-full bg-[#015a8b] hover:bg-blue-800 text-white"
          >
            Start Simulation
          </Button>
        )}
        {simulationPhase === "simulation" && (
          <Button
            onClick={endSimulation}
            className="bg-amber-600 hover:bg-amber-700"
          >
            End Simulation
          </Button>
        )}
        {simulationPhase === "debriefing" && (
          <Button
            onClick={handleExit}
            className="bg-green-600 hover:bg-green-700"
          >
            Complete & Exit
          </Button>
        )}
      </div>
    </div>
  );
};

// Add this helper function to convert between types
function convertToPatientProfileData(
  profile: PatientProfile
): PatientProfileData {
  // Convert ChecklistItem[] to PatientProfileItem[]
  const convertItems = (items: any[] = []): PatientProfileItem[] => {
    return items.map((item) => ({
      title: item.title || "",
      details: item.details || "",
      checked: item.checked || false,
    }));
  };

  return {
    id: profile.id,
    patientName: profile.patientName,
    age: profile.age ? String(profile.age) : undefined, // Convert age to string or undefined
    gender: profile.gender,
    diagnosis: profile.diagnosis,
    allergies: profile.allergies,
    weight: profile.weight,
    height: profile.height,
    medicationItems: convertItems(profile.medicationItems),
    respiratoryItems: convertItems(profile.respiratoryItems),
    diagnosticItems: convertItems(profile.diagnosticItems),
    socialHistoryItems: convertItems(profile.socialHistoryItems),
    activityItems: convertItems(profile.activityItems),
    drainItems: convertItems(profile.drainItems),
    medicationFromHomeItems: convertItems(profile.medicationFromHomeItems),
    monitoringItems: convertItems(profile.monitoringItems),
    majorSupport: profile.majorSupport,
    diet: profile.diet,
    fallPrecautions: profile.fallPrecautions,
    isolationPrecautions: profile.isolationPrecautions,
    dischargePlanning: profile.dischargePlanning,
    isGlobal: profile.isGlobal,
    // Add socialHistory from history field
    socialHistory: profile.history,
    // Add medicalHistory from history field too
    medicalHistory: profile.history,
  };
}

export default function SimulationScenarioPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const scenarioId = searchParams.get("scenarioId");

  // State
  const [scenario, setScenario] = useState<SimulationScenario | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentInput, setCurrentInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [simulationPhase, setSimulationPhase] =
    useState<SimulationPhase>("briefing");
  const [actionLog, setActionLog] = useState<
    Array<{ action: string; timestamp: Date; result?: string }>
  >([]);
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  const [patientObservations, setPatientObservations] = useState<string[]>([]);
  const [showPatientInfo, setShowPatientInfo] = useState(false);
  const [activeMenuOption, setActiveMenuOption] = useState<string | null>(null);
  const [simulationStartTime, setSimulationStartTime] = useState<Date | null>(
    null
  );
  const [simulationDuration, setSimulationDuration] = useState<string>("00:00");
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [patientConfig, setPatientConfig] = useState<PatientConfigOptions>({
    emotion: "Calm",
    healthLiteracy: "3",
  });

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const patientProfileDataRef = useRef<PatientProfileData | null>(null);

  // Constants - Actions that students can take in the simulation
  const availableActions: SimulationAction[] = [
    {
      id: "vitals",
      name: "Check Vitals",
      icon: <Activity className="h-4 w-4" />,
      options: [
        { id: "bp", name: "Blood Pressure" },
        { id: "temp", name: "Temperature" },
        { id: "hr", name: "Heart Rate" },
        { id: "rr", name: "Respiratory Rate" },
        { id: "spo2", name: "SpO2" },
      ],
    },
    {
      id: "assess",
      name: "Physical Assessment",
      icon: <StethoscopeIcon className="h-4 w-4" />,
      options: [
        { id: "auscultation", name: "Auscultation" },
        { id: "palpation", name: "Palpation" },
        { id: "inspection", name: "Inspection" },
        { id: "neurological", name: "Neurological" },
      ],
    },
    {
      id: "medication",
      name: "Administer Medication",
      icon: <Pill className="h-4 w-4" />,
    },
    {
      id: "documentation",
      name: "Documentation",
      icon: <ClipboardList className="h-4 w-4" />,
    },
  ];

  // Add a debug log whenever scenario changes to check if patient profile is properly loaded
  useEffect(() => {
    if (scenario && scenario.patient_profile) {
      console.log("Successfully loaded patient profile:", {
        name: scenario.patient_profile.patientName,
        age: scenario.patient_profile.age,
        gender: scenario.patient_profile.gender,
        diagnosis: scenario.patient_profile.diagnosis || "Not specified",
      });
    } else if (scenario) {
      console.warn("Scenario loaded without patient profile:", {
        scenarioTitle: scenario.title,
        hasPatientProfileId: !!scenario.patient_profile_id,
        patientProfileId: scenario.patient_profile_id,
      });
    }
  }, [scenario]);

  // Fetch scenario data
  useEffect(() => {
    const fetchScenario = async () => {
      if (!scenarioId) {
        setError("No scenario ID provided");
        setLoading(false);
        return;
      }

      try {
        console.log(`Fetching scenario with ID: ${scenarioId}`);

        // First, fetch the basic scenario data without patient profile
        const scenarioResponse = await fetch(
          `/api/simulation-scenarios?id=${scenarioId}`
        );

        if (!scenarioResponse.ok) {
          throw new Error(
            `Failed to fetch scenario: ${scenarioResponse.status}`
          );
        }

        const scenarioData = await scenarioResponse.json();
        const scenario = scenarioData.scenario;

        if (!scenario) {
          throw new Error("Scenario not found");
        }

        console.log("Scenario data fetched:", {
          title: scenario.title,
          hasPatientProfileId: !!scenario.patient_profile_id,
          patientProfileId: scenario.patient_profile_id,
        });

        // If there's a patient_profile_id, fetch the patient profile
        let patientProfile = null;
        // Check if the scenario already includes a complete patient profile
        // If it does, use it without making additional API calls
        if (scenario.patient_profile) {
          console.log("Patient profile already included in scenario data:", {
            name: scenario.patient_profile.patientName,
            id: scenario.patient_profile.id,
          });
          patientProfile = scenario.patient_profile;
        }
        // Otherwise, if we have a patient_profile_id, fetch the profile separately
        else if (scenario.patient_profile_id) {
          console.log(
            `Fetching patient profile with ID: ${scenario.patient_profile_id}`
          );

          try {
            // Try the new API endpoint first
            const profileResponse = await fetch(
              `/api/patient-profiles-by-id?id=${scenario.patient_profile_id}`
            );

            if (profileResponse.ok) {
              const profileData = await profileResponse.json();

              // Handle the returned data based on the API structure
              if (profileData.profile && profileData.profile.profile_data) {
                // New API returns structured data
                patientProfile = {
                  ...profileData.profile.profile_data,
                  id: profileData.profile.id,
                  isGlobal: profileData.profile.is_global,
                };
              } else if (profileData.profile) {
                // Direct profile data
                patientProfile = profileData.profile;
              }

              console.log("Patient profile fetched successfully:", {
                name: patientProfile?.patientName,
                id: patientProfile?.id,
              });
            } else {
              // Fall back to the original endpoint if the new one fails
              console.warn("New API endpoint failed, trying original endpoint");
              const fallbackResponse = await fetch(
                `/api/patient-profiles?id=${scenario.patient_profile_id}`
              );

              if (fallbackResponse.ok) {
                const fallbackData = await fallbackResponse.json();
                patientProfile = fallbackData.profile;

                console.log("Patient profile fetched via fallback:", {
                  name: patientProfile?.patientName,
                  id: patientProfile?.id,
                });
              } else {
                console.error(
                  "Failed to fetch patient profile from both endpoints"
                );
              }
            }
          } catch (profileError) {
            console.error("Error fetching patient profile:", profileError);
          }
        }

        // Combine scenario and patient profile data
        const completeScenario = {
          ...scenario,
          patient_profile: patientProfile,
        };

        console.log("Final scenario data:", {
          title: completeScenario.title,
          hasPatientProfile: !!completeScenario.patient_profile,
          patientName: completeScenario.patient_profile?.patientName,
        });

        // Set the scenario in state
        setScenario(completeScenario);

        // Initialize with system message and briefing
        const initialMessages: Message[] = [
          {
            id: "system-1",
            role: "system",
            content:
              "Welcome to the patient simulation. You are now in the briefing phase. Review the patient report before beginning the simulation.",
            timestamp: new Date(),
          },
          {
            id: "briefing-1",
            role: "assistant",
            content:
              completeScenario.student_report || "No patient report available.",
            timestamp: new Date(),
          },
        ];

        // If we have a patient profile, log the details but don't add the system message
        if (completeScenario.patient_profile) {
          const patientInfo = completeScenario.patient_profile;

          // Log detailed patient info to ensure it exists
          console.log("Patient profile details for chat:", {
            name: patientInfo.patientName,
            age: patientInfo.age,
            gender: patientInfo.gender,
            diagnosis: patientInfo.diagnosis || "Not specified",
          });
        }

        setMessages(initialMessages);
      } catch (err) {
        console.error("Error in fetchScenario:", err);
        setError("Error loading simulation scenario. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchScenario();
  }, [scenarioId]);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Start simulation with timer
  const startSimulation = () => {
    setShowConfigModal(true);
  };

  // When config is saved, actually start the simulation
  const handleConfigSave = (options: PatientConfigOptions) => {
    setPatientConfig(options);
    setShowConfigModal(false);

    // Set the simulation phase
    setSimulationPhase("simulation");

    // Start the timer
    startTimer();

    // Add initial system and patient messages
    const systemMessage: Message = {
      id: Date.now().toString(),
      role: "system",
      content:
        "Simulation started. You are now in a clinical encounter with the patient.",
      timestamp: new Date(),
    };

    const patientMessage: Message = {
      id: (Date.now() + 100).toString(),
      role: "assistant",
      content: "Hello, I'm here for my appointment today.",
      timestamp: new Date(),
      senderName: scenario?.patient_profile?.patientName || "Patient",
    };

    setMessages([systemMessage, patientMessage]);
  };

  // End simulation and clear timer
  const endSimulation = () => {
    // Clear the timer
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    setSimulationPhase("debriefing");

    // Generate AI feedback based on action log and observations
    setIsProcessing(true);

    // Prepare feedback context
    const feedbackContext = {
      scenarioId: scenarioId,
      actionLog: actionLog,
      observations: patientObservations,
      expectedActions: scenario?.ai_expected_actions || [],
      messageHistory: messages,
    };

    // Get AI-generated feedback
    const generateFeedback = async () => {
      try {
        // In the future, this will be an API call to Gemini for feedback
        // For now, generate simulated feedback

        // Create sections based on what the student did
        const actionsPerformed = actionLog
          .map(
            (action) => `- ${action.action}: ${action.result || "Completed"}`
          )
          .join("\n");

        // Count unique categories of actions
        const actionCategories = {
          vitals: actionLog.filter((a) => a.action.includes("Vitals")).length,
          assessment: actionLog.filter((a) => a.action.includes("Assessment"))
            .length,
          medication: actionLog.filter((a) => a.action.includes("Medication"))
            .length,
          documentation: actionLog.filter((a) =>
            a.action.includes("Documentation")
          ).length,
        };

        // Generate observations list
        const observationsList =
          patientObservations.length > 0
            ? patientObservations.map((o) => `- ${o}`).join("\n")
            : "No patient observations recorded";

        // Generate strengths and areas for improvement
        const strengths = [];
        const improvements = [];

        if (actionCategories.vitals > 0) {
          strengths.push("You appropriately checked vital signs");
        } else {
          improvements.push(
            "Consider checking vital signs to establish baseline patient status"
          );
        }

        if (actionCategories.assessment > 2) {
          strengths.push("You performed a thorough physical assessment");
        } else if (actionCategories.assessment > 0) {
          improvements.push(
            "Consider performing a more thorough physical assessment"
          );
        } else {
          improvements.push(
            "Physical assessment is critical for this patient's condition"
          );
        }

        if (patientObservations.length > 3) {
          strengths.push(
            "You gathered comprehensive information through therapeutic communication"
          );
        } else {
          improvements.push(
            "Try asking more open-ended questions to gather patient information"
          );
        }

        // Build the feedback report
        const feedback = `# Simulation Debrief

## Actions Performed
${actionsPerformed}

## Patient Observations
${observationsList}

## Strengths
${strengths.map((s) => `* ${s}`).join("\n")}

## Areas for Improvement
${improvements.map((i) => `* ${i}`).join("\n")}

## Recommendations
* Continue to practice therapeutic communication
* Review patient assessment protocols
* Focus on documenting all interactions thoroughly`;

        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "system",
            content:
              "The simulation has ended. Here is your debriefing feedback.",
            timestamp: new Date(),
          },
          {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: feedback,
            timestamp: new Date(),
          },
        ]);
      } catch (error) {
        console.error("Error generating feedback:", error);

        // Fallback feedback if generation fails
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "system",
            content:
              "The simulation has ended. Here is your debriefing feedback.",
            timestamp: new Date(),
          },
          {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: `# Simulation Debrief\n\nSimulation completed. Review your actions and consider how you might improve in future scenarios.`,
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsProcessing(false);
      }
    };

    generateFeedback();
  };

  // Record an observation from the AI
  const recordObservation = (observations: string[]) => {
    if (observations && observations.length > 0) {
      setPatientObservations((prev) => [...prev, ...observations]);
    }
  };

  // Handle sending messages
  const handleSendMessage = async () => {
    if (!currentInput.trim() || isProcessing) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: currentInput,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setCurrentInput("");
    setIsProcessing(true);

    try {
      let authToken = null;
      try {
        authToken =
          sessionStorage.getItem("token") || localStorage.getItem("token");
      } catch (error) {
        console.error("Error accessing storage:", error);
      }

      // Ensure we have the patient profile data
      let patientProfileData: PatientProfileData =
        patientProfileDataRef.current || {
          id: "",
          patientName: "",
          age: "",
          gender: "",
          medicationItems: [],
        };

      if (
        Object.keys(patientProfileData).length === 0 ||
        !patientProfileData.patientName
      ) {
        const convertedProfile = convertToPatientProfileData(
          scenario?.patient_profile as PatientProfile
        );
        if (convertedProfile) {
          patientProfileData = convertedProfile;
          patientProfileDataRef.current = convertedProfile;
        }
      }

      console.log("[handleSendMessage] Patient:", patientProfileData);
      console.log("[handleSendMessage] Message history:", messages);

      // Format message history for API
      const formattedMessageHistory = messages
        .filter((msg) => msg.role !== "system")
        .map((msg) => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp || new Date().toISOString(),
        }));

      // Format action history for API
      const formattedActionHistory = actionLog.map((action) => ({
        action: action.action,
        result: action.result,
        timestamp: action.timestamp || new Date().toISOString(),
      }));

      // Make API call to get patient response
      const response = await fetch("/api/patient-simulation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          message: currentInput,
          patientId: patientProfileData.id || scenario?.patient_profile?.id,
          scenarioId: scenario?.id,
          messageHistory: formattedMessageHistory,
          actionHistory: formattedActionHistory,
          patientConfig: patientConfig, // Include patient configuration
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get AI response: ${response.status}`);
      }

      const data = await response.json();

      // Record any observations from the AI
      if (data.observations && data.observations.length > 0) {
        recordObservation(data.observations);
      }

      // Add the AI response
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response || getSimulatedResponse(currentInput), // Fall back to simulated response if API fails
        timestamp: new Date(),
        senderName:
          data.senderName || patientProfileData.patientName || "Patient", // Use the patient name instead of "AI Assistant"
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error sending message:", error);

      // If there's an error, still provide a simulated response
      const fallbackMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: getSimulatedResponse(currentInput),
        timestamp: new Date(),
        senderName: scenario?.patient_profile?.patientName || "Patient", // Use patient name for fallback too
      };

      setMessages((prev) => [...prev, fallbackMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle performing a simulation action
  const handleAction = (actionId: string, optionId?: string) => {
    const action = availableActions.find((a) => a.id === actionId);
    if (!action) return;

    let actionName = action.name;
    if (optionId) {
      const option = action.options?.find((o) => o.id === optionId);
      if (option) {
        actionName = `${action.name}: ${option.name}`;
      }
    }

    // Add action to log
    const newAction = {
      action: actionName,
      timestamp: new Date(),
      result: getActionResult(actionId, optionId),
    };

    setActionLog((prev) => [...prev, newAction]);

    // Add action to messages
    const actionMessage: Message = {
      id: Date.now().toString(),
      role: "action",
      content: `Performed: ${actionName}\nResult: ${newAction.result}`,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, actionMessage]);

    // Get a patient response to the action
    if (simulationPhase === "simulation") {
      setIsProcessing(true);

      // Make sure we have the most complete patient profile data
      const patientProfile = scenario?.patient_profile || {
        id: "",
        patientName: "",
      };

      // Convert PatientProfile to PatientProfileData for the API
      const patientProfileData = convertToPatientProfileData(
        patientProfile as PatientProfile
      );

      // Log the action and patient data for debugging
      console.log("Sending action for patient response:", {
        action: actionName,
        patientName: patientProfileData.patientName,
        hasMedications:
          patientProfileData.medicationItems?.some(
            (item: any) => item.checked
          ) || false,
        hasDrains:
          patientProfileData.drainItems?.some((item: any) => item.checked) ||
          false,
      });

      // Format previous action history
      const formattedActionHistory = actionLog.map((act) => ({
        type: act.action,
        detail: act.result || "",
        timestamp: act.timestamp.getTime(),
      }));

      // Call the patient simulation endpoint for an action response without authentication
      fetch("/api/patient-simulation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: actionName,
          patientId: patientProfileData.id,
          scenarioId: scenarioId,
          isAction: true,
          actionHistory: formattedActionHistory,
          patientConfig: patientConfig, // Add the patient configuration
        }),
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Failed to get AI response: ${response.status}`);
          }
          return response.json();
        })
        .then((data) => {
          // Add the patient's response to the action
          const patientResponseMessage: Message = {
            id: (Date.now() + 2).toString(),
            role: "assistant",
            content: data.response || `*reacts to ${actionName}*`,
            timestamp: new Date(),
            senderName:
              data.senderName || patientProfileData.patientName || "Patient",
          };

          setMessages((prev) => [...prev, patientResponseMessage]);

          // Record any observations from the AI
          if (data.observations && data.observations.length > 0) {
            recordObservation(data.observations);
          }

          // Record any feedback from the AI
          if (data.feedback && data.feedback.length > 0) {
            // Add feedback as a system message
            const feedbackMessage: Message = {
              id: (Date.now() + 3).toString(),
              role: "system",
              content: `Feedback: ${data.feedback.join(" | ")}`,
              timestamp: new Date(),
            };

            setMessages((prev) => [...prev, feedbackMessage]);
          }
        })
        .catch((error) => {
          console.error("Error getting action response:", error);

          // Fallback patient response if API fails
          const fallbackMessage: Message = {
            id: (Date.now() + 2).toString(),
            role: "assistant",
            content: `*reacts to ${actionName}*`,
            timestamp: new Date(),
            senderName: patientProfileData.patientName || "Patient",
          };

          setMessages((prev) => [...prev, fallbackMessage]);
        })
        .finally(() => {
          setIsProcessing(false);
        });
    }
  };

  // Simulate response based on input
  // In the future, this will be replaced with Gemini API call
  const getSimulatedResponse = (input: string): string => {
    const lowerInput = input.toLowerCase();
    const patientName = scenario?.patient_profile?.patientName || "Patient";
    const isDoris = patientName.toLowerCase().includes("doris");

    // Responses specific to Doris Bowman
    if (isDoris) {
      if (lowerInput.includes("pain") || lowerInput.includes("hurt")) {
        return "Yes, I'm experiencing some pain in my abdominal area where the incision is. It's probably about a 6 out of 10 right now.";
      } else if (
        lowerInput.includes("how are you") ||
        lowerInput.includes("feeling")
      ) {
        return "I'm feeling pretty groggy and sore. The anesthesia is still wearing off, I think. My abdomen is hurting where they made the incision.";
      } else if (
        lowerInput.includes("medication") ||
        lowerInput.includes("medicine")
      ) {
        return "I've been taking iron supplements for my anemia related to the heavy bleeding. The doctor mentioned I was given some morphine right before leaving the operating room.";
      } else if (
        lowerInput.includes("surgery") ||
        lowerInput.includes("operation") ||
        lowerInput.includes("procedure")
      ) {
        return "I had a total abdominal hysterectomy with bilateral salpingo-oophorectomy. The doctor said it went well, but I'm still pretty sore.";
      } else if (
        lowerInput.includes("name") ||
        lowerInput.includes("who are you")
      ) {
        return "My name is Doris Bowman. I'm here recovering from my surgery.";
      }
    }

    // Generic fallback responses if not Doris or no specific match
    if (lowerInput.includes("pain") || lowerInput.includes("hurt")) {
      return "Yes, I'm experiencing pain. It's uncomfortable, especially when I move.";
    } else if (
      lowerInput.includes("how are you") ||
      lowerInput.includes("feeling")
    ) {
      return "I'm not feeling my best right now. I'm a bit uncomfortable and tired.";
    } else if (
      lowerInput.includes("medication") ||
      lowerInput.includes("medicine")
    ) {
      return "I'm not on many medications. The doctor did mention something about pain medication though.";
    } else if (
      lowerInput.includes("history") ||
      lowerInput.includes("condition")
    ) {
      return `The doctor explained my diagnosis to me, but I'm still trying to understand what it all means.`;
    } else if (
      lowerInput.includes("name") ||
      lowerInput.includes("who are you")
    ) {
      return `My name is ${patientName}. I'm the patient.`;
    } else {
      return "I'm not sure I understand. Could you please clarify that or maybe check how I'm doing?";
    }
  };

  // Simulate action result
  // In the future, this will be based on the scenario data
  const getActionResult = (actionId: string, optionId?: string): string => {
    switch (actionId) {
      case "vitals":
        if (optionId === "bp") return "BP: 142/88 mmHg";
        if (optionId === "temp") return "Temperature: 38.2°C (100.8°F)";
        if (optionId === "hr") return "Heart Rate: 98 bpm";
        if (optionId === "rr") return "Respiratory Rate: 20 breaths/min";
        if (optionId === "spo2") return "SpO2: 95%";
        return "Vitals checked";

      case "assess":
        if (optionId === "auscultation")
          return "Lungs clear bilaterally; Heart sounds normal, no murmurs";
        if (optionId === "palpation")
          return "Abdomen tender in right lower quadrant; No rebound tenderness";
        if (optionId === "inspection")
          return "Skin warm and dry; No visible rashes or lesions";
        if (optionId === "neurological")
          return "Alert and oriented x3; Pupils equal and reactive";
        return "Assessment performed";

      case "medication":
        return "Medication administered as ordered";

      case "documentation":
        return "Documentation completed";

      default:
        return "Action completed";
    }
  };

  // Handle back button or exit
  const handleExit = () => {
    if (simulationPhase === "simulation") {
      // Show confirmation dialog if in middle of simulation
      setShowExitConfirmation(true);
    } else {
      // Direct exit if in briefing or debriefing phases
      router.push("/patient-interactions/select-patient?mode=simulation");
    }
  };

  // Add handler for menu option clicks
  const handleMenuOptionClick = (option: string) => {
    // If the same option is clicked again, close the panel
    if (activeMenuOption === option && sidePanelOpen) {
      setActiveMenuOption(null);
      setSidePanelOpen(false);
      return;
    }

    // Open the panel with the selected option
    setActiveMenuOption(option);
    setSidePanelOpen(true);
  };

  // Handle closing the side panel
  const handleCloseSidePanel = () => {
    setActiveMenuOption(null);
    setSidePanelOpen(false);
  };

  // Define the panel navigation order
  const panelOrder = [
    "scenario-overview",
    "patient-report",
    "patient-information",
    "simulation-actions",
  ];

  // Navigate to the next panel
  const handleNextPanel = () => {
    if (!activeMenuOption) return;

    const currentIndex = panelOrder.indexOf(activeMenuOption);
    if (currentIndex < panelOrder.length - 1) {
      setActiveMenuOption(panelOrder[currentIndex + 1]);
    }
  };

  // Navigate to the previous panel
  const handlePreviousPanel = () => {
    if (!activeMenuOption) return;

    const currentIndex = panelOrder.indexOf(activeMenuOption);
    if (currentIndex > 0) {
      setActiveMenuOption(panelOrder[currentIndex - 1]);
    }
  };

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  // Start the simulation timer
  const startTimer = () => {
    const startTime = new Date();
    setSimulationStartTime(startTime);

    // Start timer to update duration
    timerIntervalRef.current = setInterval(() => {
      const currentTime = new Date();
      const elapsedMs = currentTime.getTime() - startTime.getTime();
      const elapsedSec = Math.floor(elapsedMs / 1000);
      const minutes = Math.floor(elapsedSec / 60);
      const seconds = elapsedSec % 60;
      setSimulationDuration(
        `${minutes.toString().padStart(2, "0")}:${seconds
          .toString()
          .padStart(2, "0")}`
      );
    }, 1000);
  };

  if (loading) {
    return (
      <ContentLayout
        title="Simulation Scenario"
        showSearch={false}
        backgroundColor="bg-[#F8F9FA]"
      >
        <div className="flex items-center justify-center h-full p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#015a8b] mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading scenario...</p>
          </div>
        </div>
      </ContentLayout>
    );
  }

  if (error || !scenario) {
    return (
      <ContentLayout
        title="Simulation Scenario"
        showSearch={false}
        backgroundColor="bg-[#F8F9FA]"
      >
        <div className="flex flex-col items-center justify-center h-full p-6">
          <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-red-800 font-medium mb-4">
              {error || "Scenario not found"}
            </p>
            <Button
              onClick={() =>
                router.push("/patient-interactions/patient-simulation")
              }
              className="bg-[#015a8b] hover:bg-[#014a71]"
            >
              Return to Scenarios
            </Button>
          </div>
        </div>
      </ContentLayout>
    );
  }

  return (
    <ContentLayout
      title={
        <HeaderContent
          scenario={scenario}
          simulationPhase={simulationPhase}
          handleExit={handleExit}
          startSimulation={startSimulation}
          endSimulation={endSimulation}
          showPatientInfo={showPatientInfo}
          setShowPatientInfo={setShowPatientInfo}
          onMenuOptionClick={handleMenuOptionClick}
          simulationDuration={simulationDuration}
        />
      }
      showSearch={false}
      backgroundColor="bg-[#F8F9FA]"
    >
      <div className="h-full flex flex-col w-full relative overflow-hidden">
        {/* Main content area that will resize when panel is open */}
        <div className="flex-1 flex overflow-hidden">
          <div
            className={`flex-1 flex flex-col w-full transition-all duration-300 ease-in-out ${
              sidePanelOpen ? "mr-[400px]" : ""
            }`}
          >
            {/* Messages area */}
            <ChatContainer
              messages={messages}
              isTyping={isProcessing}
              typingMessageProps={{
                role: "assistant",
                senderName: scenario?.patient_profile?.patientName || "Patient",
              }}
              className="w-full max-w-full py-4 px-6"
            />

            {/* Input area */}
            {simulationPhase === "simulation" && (
              <div className="border-t border-[#015a8b] py-4 px-6 bg-[#F8F9FA] w-full">
                <TabsInputArea
                  value={currentInput}
                  onChange={setCurrentInput}
                  onSend={handleSendMessage}
                  isProcessing={isProcessing}
                  disabled={!!error}
                  inputRef={inputRef}
                  placeholder={`Type your message...


(Press Enter to send, Shift+Enter for new line)`}
                  helperText="Use this area to communicate with the patient. Press Enter to send."
                  availableActions={availableActions}
                  onActionSelect={handleAction}
                  defaultTab="chat"
                  className="w-full"
                />
              </div>
            )}
          </div>
        </div>

        {/* Side Panels - positioned absolutely within the container */}
        <ScenarioOverviewPanel
          title="Scenario Overview"
          isOpen={sidePanelOpen && activeMenuOption === "scenario-overview"}
          onClose={handleCloseSidePanel}
          onNext={handleNextPanel}
          onPrevious={handlePreviousPanel}
        />

        <PatientReportPanel
          title="Patient Report"
          isOpen={sidePanelOpen && activeMenuOption === "patient-report"}
          onClose={handleCloseSidePanel}
          onNext={handleNextPanel}
          onPrevious={handlePreviousPanel}
        />

        <PatientInformationPanel
          title="Patient Information"
          isOpen={sidePanelOpen && activeMenuOption === "patient-information"}
          onClose={handleCloseSidePanel}
          onNext={handleNextPanel}
          onPrevious={handlePreviousPanel}
          patientData={
            scenario?.detailed_patient_data || {
              dob: "2/10/XX",
              mrNumber: "PCS21000",
            }
          }
          patientProfile={
            scenario?.patient_profile
              ? {
                  gender: scenario.patient_profile.gender,
                  age:
                    scenario.patient_profile.age != null
                      ? scenario.patient_profile.age
                      : undefined,
                  weight: scenario.patient_profile.weight,
                  height: scenario.patient_profile.height,
                  allergies: scenario.patient_profile.allergies,
                }
              : {}
          }
          medicalHistory={{
            prior: scenario?.medical_history_prior,
            recent: scenario?.medical_history_recent,
          }}
        />

        <SimulationActionsPanel
          title="Simulation Actions"
          isOpen={sidePanelOpen && activeMenuOption === "simulation-actions"}
          onClose={handleCloseSidePanel}
          onNext={handleNextPanel}
          onPrevious={handlePreviousPanel}
          availableActions={availableActions}
          onActionSelect={handleAction}
        />

        {/* Patient Info Modal */}
        {showPatientInfo && scenario?.patient_profile && (
          <PatientProfileModal
            open={showPatientInfo}
            onOpenChange={setShowPatientInfo}
            patient={scenario.patient_profile as any}
          />
        )}

        {/* Patient Config Modal */}
        <PatientConfigModal
          isOpen={showConfigModal}
          onClose={() => setShowConfigModal(false)}
          onSave={handleConfigSave}
          initialOptions={patientConfig}
        />

        <ExitConfirmationDialog
          isOpen={showExitConfirmation}
          onClose={() => setShowExitConfirmation(false)}
          onExit={() =>
            router.push("/patient-interactions/select-patient?mode=simulation")
          }
          title="Exit Simulation?"
          message="You are in the middle of a simulation. If you exit now, your progress will not be saved."
        />
      </div>
    </ContentLayout>
  );
}
