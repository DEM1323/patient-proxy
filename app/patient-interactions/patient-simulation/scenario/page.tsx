"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SimulationScenario } from "@/app/types/simulation";
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
import { TabsInputArea } from "@/app/components/molecules/TabsInputArea";

// Message types
type MessageRole = "user" | "assistant" | "system" | "action";

interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
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

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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

  // Fetch scenario data
  useEffect(() => {
    const fetchScenario = async () => {
      if (!scenarioId) {
        setError("No scenario ID provided");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `/api/simulation-scenarios?id=${scenarioId}`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch scenario");
        }

        const data = await response.json();
        setScenario(data.scenario);

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
              data.scenario.student_report || "No patient report available.",
            timestamp: new Date(),
          },
        ];

        setMessages(initialMessages);
      } catch (err) {
        setError("Error loading simulation scenario. Please try again later.");
        console.error(err);
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

  // Handle phase transition
  const startSimulation = () => {
    setSimulationPhase("simulation");

    // Add system message indicating phase change
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role: "system",
        content:
          "You are now entering the simulation phase. Interact with the patient and perform necessary actions.",
        timestamp: new Date(),
      },
    ]);

    // Add initial patient message
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: "Hello. I'm not feeling well today. Can you help me?",
          timestamp: new Date(),
        },
      ]);
    }, 1000);
  };

  const endSimulation = () => {
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
      // Prepare simulation context for the AI
      const simulationContext = {
        scenarioId: scenarioId,
        patientProfile: scenario?.patient_profile || {},
        medicalHistory: {
          prior: scenario?.medical_history_prior || "",
          recent: scenario?.medical_history_recent || "",
        },
        aiPrompts: scenario?.ai_patient_prompts || [],
        actionHistory: actionLog,
      };

      // Call the simulation AI endpoint
      const response = await fetch("/api/ai/simulation-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: currentInput,
          context: simulationContext,
          messageHistory: messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get AI response");
      }

      const data = await response.json();

      // Record any observations from the AI
      if (data.observations) {
        recordObservation(data.observations);
      }

      // Add the AI response
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response || getSimulatedResponse(currentInput), // Fall back to simulated response if API fails
        timestamp: new Date(),
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
      };

      setMessages((prev) => [...prev, fallbackMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle performing a clinical action
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
  };

  // Simulate response based on input
  // In the future, this will be replaced with Gemini API call
  const getSimulatedResponse = (input: string): string => {
    const lowerInput = input.toLowerCase();

    if (lowerInput.includes("pain") || lowerInput.includes("hurt")) {
      return "Yes, I'm experiencing a sharp pain in my abdomen. It's about a 7 out of 10 on the pain scale.";
    } else if (
      lowerInput.includes("how are you") ||
      lowerInput.includes("feeling")
    ) {
      return "I'm feeling quite dizzy and nauseous. I also have this pain that won't go away.";
    } else if (
      lowerInput.includes("medication") ||
      lowerInput.includes("medicine")
    ) {
      return "I take lisinopril for my blood pressure. I'm also allergic to penicillin.";
    } else if (
      lowerInput.includes("history") ||
      lowerInput.includes("condition")
    ) {
      return "I was diagnosed with hypertension about 5 years ago. I've also had two surgeries in the past - an appendectomy and a knee replacement.";
    } else {
      return "I'm not sure I understand. Could you please clarify or maybe check my vitals?";
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

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#015a8b]"></div>
      </div>
    );
  }

  if (error || !scenario) {
    return (
      <div className="max-w-6xl mx-auto p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-800 font-medium text-lg">
            {error || "Scenario not found"}
          </p>
          <button
            onClick={() =>
              router.push("/patient-interactions/patient-simulation")
            }
            className="mt-4 bg-red-100 text-red-800 px-4 py-2 rounded hover:bg-red-200"
          >
            Return to Scenarios
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 py-2 px-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <button
              onClick={handleExit}
              className="mr-4 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-[#015a8b]">
                {scenario.title}
              </h1>
              <div className="flex items-center text-sm text-gray-500">
                <Clock className="h-4 w-4 mr-1" />
                <span>
                  {simulationPhase === "briefing"
                    ? "Briefing"
                    : simulationPhase === "simulation"
                    ? "Simulation in progress"
                    : "Debriefing"}
                </span>
              </div>
            </div>
          </div>
          <div>
            {simulationPhase === "briefing" && (
              <Button
                onClick={startSimulation}
                className="bg-[#015a8b] hover:bg-[#014a71]"
              >
                Begin Simulation
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
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main chat */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Messages area */}
          <ScrollArea className="flex-1 p-4 custom-scrollbar">
            <div className="max-w-3xl mx-auto space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.role === "user"
                        ? "bg-[#015a8b] text-white"
                        : message.role === "system"
                        ? "bg-amber-100 text-amber-800 border border-amber-200"
                        : message.role === "action"
                        ? "bg-green-100 text-green-800 border border-green-200"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    <div
                      className="prose prose-sm max-w-none"
                      style={{
                        whiteSpace: "pre-wrap",
                        // Add markdown styling within the divs
                        ...(message.role === "assistant" && {
                          "& h1": {
                            fontWeight: "bold",
                            fontSize: "1.25rem",
                            marginTop: "1rem",
                            marginBottom: "0.5rem",
                          },
                          "& h2": {
                            fontWeight: "bold",
                            fontSize: "1.1rem",
                            marginTop: "1rem",
                            marginBottom: "0.5rem",
                          },
                          "& ul": {
                            paddingLeft: "1.5rem",
                            marginTop: "0.5rem",
                            marginBottom: "0.5rem",
                          },
                          "& li": { marginBottom: "0.25rem" },
                        }),
                      }}
                    >
                      {message.content}
                    </div>
                    <div className="text-xs opacity-70 mt-1 text-right">
                      {message.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input area */}
          {simulationPhase === "simulation" && (
            <div className="border-t border-[#015a8b] bg-[#F8F9FA] p-4">
              <div className="max-w-3xl mx-auto">
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
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Exit Confirmation Dialog */}
      {showExitConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Exit Simulation?</h3>
            <p className="mb-6 text-gray-600">
              You are in the middle of a simulation. If you exit now, your
              progress will not be saved.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowExitConfirmation(false)}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  router.push(
                    "/patient-interactions/select-patient?mode=simulation"
                  )
                }
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Exit Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
