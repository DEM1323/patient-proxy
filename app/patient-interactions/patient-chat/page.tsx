"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { ContentLayout } from "@/app/components/layouts/ContentLayout";
import { Button } from "@/app/components/ui/button";
import { type PatientProfile } from "@/app/types/patient";
import { ChatInput } from "@/app/components/molecules/ChatInput";
import { TabsInputArea } from "@/app/components/molecules/TabsInputArea";
import {
  Send,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Info,
  X,
  Check,
  Activity,
  StethoscopeIcon,
  Pill,
  ClipboardList,
  Download,
  LogOut,
} from "lucide-react";
import { type ChatMessage } from "@/app/lib/gemini";
import { supabase } from "@/app/lib/supabase";
import { toast } from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { ScrollArea } from "@/app/components/ui/scroll-area";
import { ChatContainer } from "@/app/components/molecules/ChatContainer";
import {
  ChatMessage as ChatMessageComponent,
  type MessageRole,
} from "@/app/components/molecules/ChatMessage";
import { ExitConfirmationDialog } from "@/app/components/molecules/ExitConfirmationDialog";
import { PatientProfileModal } from "@/app/components/molecules/PatientProfileModal";
import {
  PatientConfigModal,
  PatientConfigOptions,
} from "@/app/components/molecules/PatientConfigModal";

// Add a utility function to generate unique message IDs
const generateUniqueId = (() => {
  let counter = 0;
  return () => {
    counter++;
    return `${Date.now()}-${counter}`;
  };
})();

interface Message {
  id: string;
  text: string;
  sender: "user" | "patient" | "system";
  timestamp: Date;
}

// Add a utility function to convert the chat messages to the format expected by ChatContainer
const adaptMessageFormat = (messages: Message[], patientName?: string) => {
  return messages.map((msg) => ({
    id: msg.id,
    role:
      msg.sender === "user"
        ? ("user" as MessageRole)
        : ("patient" as MessageRole),
    content: msg.text,
    timestamp: msg.timestamp,
    senderName: msg.sender === "user" ? "You" : patientName || "Patient",
  }));
};

export default function PatientChat() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientId = searchParams.get("patientId");
  const [patient, setPatient] = useState<PatientProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [apiStatus, setApiStatus] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<Record<string, string>>({});
  const hasInitialized = useRef(false);
  const [debugBannerExpanded, setDebugBannerExpanded] = useState(false);
  const [sessionTimeRemaining, setSessionTimeRemaining] = useState<
    number | null
  >(null);
  const SESSION_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
  const sessionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showPatientInfo, setShowPatientInfo] = useState(false);
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [patientConfig, setPatientConfig] = useState<PatientConfigOptions>({
    emotion: "Calm",
    healthLiteracy: "3",
  });
  const [showEndChatConfirmation, setShowEndChatConfirmation] = useState(false);

  // Simulation actions that can be performed during the chat
  const availableActions = [
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

    // Simulate a result for the action
    const result = getActionResult(actionId, optionId);

    // Add simulation action to message list
    const actionMessage: Message = {
      id: generateUniqueId(),
      text: `**${actionName}**\nResult: ${result}`,
      sender: "system",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, actionMessage]);

    // Add patient's response to the action
    setTimeout(() => {
      const responseMessage: Message = {
        id: generateUniqueId(),
        text: getPatientActionResponse(actionId, optionId),
        sender: "patient",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, responseMessage]);
    }, 1000);
  };

  // Get result text for a performed action
  const getActionResult = (actionId: string, optionId?: string): string => {
    switch (actionId) {
      case "vitals":
        if (optionId === "bp") return "BP: 128/82 mmHg";
        if (optionId === "temp") return "Temperature: 37.2°C (99.0°F)";
        if (optionId === "hr") return "Heart Rate: 82 bpm";
        if (optionId === "rr") return "Respiratory Rate: 16 breaths/min";
        if (optionId === "spo2") return "SpO2: 98%";
        return "Vitals checked - all within normal limits";

      case "assess":
        if (optionId === "auscultation")
          return "Lungs clear bilaterally; Heart sounds normal, no murmurs";
        if (optionId === "palpation")
          return "Abdomen soft, non-tender; No organomegaly";
        if (optionId === "inspection")
          return "Skin normal color, warm and dry; No visible lesions";
        if (optionId === "neurological")
          return "Alert and oriented x3; Pupils equal and reactive";
        return "Assessment completed - no abnormal findings";

      case "medication":
        return "Medication administered as ordered";

      case "documentation":
        return "Documentation completed in patient chart";

      default:
        return "Action completed";
    }
  };

  // Get patient's response to simulation actions
  const getPatientActionResponse = (
    actionId: string,
    optionId?: string
  ): string => {
    switch (actionId) {
      case "vitals":
        return "Thanks for checking my vitals.";

      case "assess":
        if (optionId === "auscultation")
          return "I've been trying to take deep breaths like you showed me earlier.";
        if (optionId === "palpation")
          return "I don't have any pain when you press there.";
        return "Let me know if you find anything concerning.";

      case "medication":
        return "Thank you. When should I expect the medication to start working?";

      case "documentation":
        return "Make sure you note that I've been following the care plan at home.";

      default:
        return "Is there anything else you need to check?";
    }
  };

  // Initialize session timeout mechanism
  useEffect(() => {
    if (sessionId) {
      // Set a session expiry timestamp when session starts
      const expiryTime = Date.now() + SESSION_TIMEOUT_MS;
      localStorage.setItem(
        `chat_session_expiry_${sessionId}`,
        expiryTime.toString()
      );

      // Set up the countdown timer
      const updateRemainingTime = () => {
        const expiry = Number(
          localStorage.getItem(`chat_session_expiry_${sessionId}`)
        );
        if (!expiry) return;

        const remaining = expiry - Date.now();
        if (remaining <= 0) {
          // Session expired
          handleSessionExpiry();
          return;
        }

        setSessionTimeRemaining(remaining);
        sessionTimeoutRef.current = setTimeout(updateRemainingTime, 30000); // Update every 30 seconds
      };

      updateRemainingTime();

      return () => {
        if (sessionTimeoutRef.current) {
          clearTimeout(sessionTimeoutRef.current);
        }
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Reset expiry time when user is active
  useEffect(() => {
    if (!sessionId) return;

    const resetExpiryTime = () => {
      if (sessionId) {
        const expiryTime = Date.now() + SESSION_TIMEOUT_MS;
        localStorage.setItem(
          `chat_session_expiry_${sessionId}`,
          expiryTime.toString()
        );
      }
    };

    // Reset expiry time when user sends a message
    resetExpiryTime();

    // Add event listeners to detect user activity
    const events = ["mousedown", "keypress", "scroll", "touchstart"];

    const resetOnActivity = () => {
      resetExpiryTime();
    };

    events.forEach((event) => {
      window.addEventListener(event, resetOnActivity);
    });

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, resetOnActivity);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, messages]); // Reset timer when messages change (user interaction)

  // Handle session expiry
  const handleSessionExpiry = () => {
    console.log("[CHAT] Session expired due to timeout");
    toast.error(
      "Your chat session has expired. You will be redirected to the patient selection page."
    );

    // Clean up local storage
    if (sessionId) {
      localStorage.removeItem(`chat_session_expiry_${sessionId}`);
    }

    // Set error state
    setError("Chat session expired. Please start a new session.");

    // Redirect after a short delay
    setTimeout(() => {
      router.push("/patient-interactions/select-patient?mode=chat");
    }, 3000);
  };

  // Format remaining time for display
  const formatTimeRemaining = (ms: number) => {
    if (!ms) return "";

    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    } else {
      return `${minutes}m remaining`;
    }
  };

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const isAuthed = !!data.session;
        const authToken = data.session?.access_token || "";

        if (!isAuthed || !authToken) {
          setAuthStatus(`Auth: Not authenticated or missing token`);
          console.error(
            "Authentication error: User not authenticated or missing token"
          );
          setError(
            "You must be authenticated to use the patient chat. Please sign in."
          );
          setIsLoading(false); // Stop loading state

          // Redirect to login
          router.push(
            `/login?redirect=${encodeURIComponent(
              window.location.pathname + window.location.search
            )}`
          );
          return;
        }

        setAuthStatus(
          `Auth: Authenticated with token: ${authToken.substring(0, 10)}...`
        );
        console.log("Auth session:", {
          authenticated: isAuthed,
          tokenLength: authToken.length,
          tokenPrefix: authToken.substring(0, 10) + "...",
          userId: data.session?.user?.id,
        });

        // Only load patient after authentication confirmed and with valid token
        if (!hasInitialized.current) {
          hasInitialized.current = true;
          loadPatient(authToken);
        }
      } catch (error) {
        setAuthStatus(`Auth error: ${(error as Error).message}`);
        console.error("Auth error:", error);
        setError(`Authentication error: ${(error as Error).message}`);
        setIsLoading(false); // Stop loading state
      }
    };

    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Test API endpoint on load (only in development mode)
  useEffect(() => {
    // Skip API test in production
    if (process.env.NODE_ENV === "production") {
      return;
    }

    const testApiEndpoint = async () => {
      try {
        const response = await fetch("/api/chat-test");
        if (response.ok) {
          const data = await response.json();
          setApiStatus(`API test successful: ${data.message}`);
          console.log(`[CHAT] API test successful: ${data.message}`);
        } else {
          setApiStatus(`API test failed: ${response.status}`);
          console.error(`[CHAT] API test failed: ${response.status}`);
          setError(
            `API test failed with status ${response.status}. The server may not be responding correctly.`
          );
        }
      } catch (error) {
        setApiStatus(`API test error: ${(error as Error).message}`);
        console.error(`[CHAT] API test error: ${(error as Error).message}`);
        setError(`API connection error: ${(error as Error).message}`);
      }
    };

    testApiEndpoint();
  }, []);

  // Load patient profile
  const loadPatient = async (authToken: string) => {
    if (!patientId) {
      setError("No patient ID provided. Cannot proceed with chat.");
      setIsLoading(false);
      return;
    }

    if (hasInitialized.current && sessionId) {
      console.log(
        "[CHAT] Session already initialized, skipping initialization"
      );
      return;
    }

    try {
      setIsLoading(true);
      console.log(`[CHAT] Initializing chat for patient ID: ${patientId}`);

      // Initialize chat session with the exact patient ID requested
      const response = await fetch("/api/init-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          patientId,
        }),
      });

      if (!response.ok) {
        // If it's a 404 (profile not found) error, try to get the detailed error message
        if (response.status === 404) {
          const errorData = await response.json();
          console.error(`[CHAT] Profile not found: ${patientId}`);

          // Set a more specific error with debug info
          const errorMsg = `Patient profile with ID '${patientId}' was not found. Please select a different patient.`;
          setError(errorMsg);

          // Store the debug info for the debug button
          setDebugInfo(errorData.debugInfo || {});

          throw new Error(errorMsg);
        }
        throw new Error(`Failed to initialize chat: ${response.status}`);
      }

      const data = await response.json();
      console.log(
        `[CHAT] Session initialized: ${data.sessionId} for patient: ${data.patientName}`
      );

      // Store session ID and auth token
      setSessionId(data.sessionId);
      // Store auth token in component state for later use
      setAuthToken(authToken);

      // Set patient name from response
      if (data.fullProfile) {
        // Use the full profile if available
        setPatient(data.fullProfile as PatientProfile);
      } else {
        // Fallback to limited data if full profile is not available
        setPatient({
          id: patientId,
          patientName: data.patientName,
          age: data.patientAge,
          gender: data.patientGender,
          diagnosis: data.patientDiagnosis,
        } as PatientProfile);
      }

      // Create a more appropriate greeting based on current emotion setting
      // instead of using the default API greeting
      const patientName = data.fullProfile?.patientName || data.patientName;
      let customGreeting = "";

      // Generate greeting based on the current emotion setting
      switch (patientConfig.emotion) {
        case "Anxious":
          customGreeting = `Hi... I'm ${patientName}. *fidgets nervously* I'm a bit worried about being here today. Do you have time to see me?`;
          break;
        case "Confused":
          customGreeting = `Hello... I'm ${patientName}. I'm not entirely sure why I'm here or what's happening. Can you help me understand?`;
          break;
        case "Angry":
          customGreeting = `I'm ${patientName}. *crosses arms* I've been waiting for quite a while. I hope this doesn't take too long.`;
          break;
        case "Sad":
          customGreeting = `Hi, I'm ${patientName}... *sighs* I haven't been feeling well lately. Thanks for seeing me today.`;
          break;
        case "Frustrated":
          customGreeting = `I'm ${patientName}. *exhales deeply* I've been dealing with this for a while and not getting better. Hope you can help.`;
          break;
        case "Worried":
          customGreeting = `Hello, I'm ${patientName}. I'm concerned about my symptoms and what they might mean. Can we talk about that?`;
          break;
        case "In Pain":
          customGreeting = `Hi... *winces* I'm ${patientName}. Sorry if I seem distracted, I'm in quite a bit of discomfort right now.`;
          break;
        case "Hopeful":
          customGreeting = `Hi! I'm ${patientName}. I'm really looking forward to our conversation today. I've heard good things about you.`;
          break;
        case "Calm":
        default:
          customGreeting = `Hello, I'm ${patientName}. Thank you for seeing me today. How can we make the most of our time together?`;
      }

      // Log the customized greeting
      console.log(`[${patientName || "PATIENT"}] ${customGreeting}`);

      // Add initial greeting message from patient with custom greeting
      const initialMessage: Message = {
        id: generateUniqueId(),
        text: customGreeting,
        sender: "patient",
        timestamp: new Date(),
      };

      // Set the message directly - no need for complex logic in initialization
      setMessages([initialMessage]);
    } catch (error) {
      console.error(`[CHAT] Initialization error: ${(error as Error).message}`);
      setError(`Error initializing chat: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Removed loadPatient call from here - now called after auth check
  }, [patientId]);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    if (!newMessage.trim() || !sessionId || !authToken || isTyping) return;

    const userMessage: Message = {
      id: generateUniqueId(),
      text: newMessage,
      sender: "user",
      timestamp: new Date(),
    };

    // Log user message with prefix
    console.log(`[USER] ${newMessage}`);

    // Add user message to UI immediately
    setMessages((prev) => [...prev, userMessage]);
    setNewMessage("");
    setIsTyping(true);
    setError(null); // Clear any previous errors

    try {
      console.log(`[CHAT] Sending message to session: ${sessionId}`);

      // Make API call using the session ID
      const response = await fetch("/api/chat-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          sessionId,
          message: newMessage,
          patientConfig, // Include patient configuration
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }

        console.error(
          `[CHAT] API error: ${response.status} - ${
            errorData.error || errorText
          }`
        );
        throw new Error(
          errorData.error ||
            errorData.details ||
            `Failed to get response from AI: ${response.status}`
        );
      }

      const data = await response.json();

      // Log AI response with prefix
      console.log(`[${patient?.patientName || "PATIENT"}] ${data.response}`);
      console.log(`[CHAT] Response received (${data.response.length} chars)`);

      // Create patient message from AI response
      const patientMessage: Message = {
        id: generateUniqueId(),
        text: data.response,
        sender: "patient",
        timestamp: new Date(),
      };

      // Add patient message to UI
      setMessages((prev) => [...prev, patientMessage]);
    } catch (error) {
      console.error(
        `[CHAT] Error sending message: ${(error as Error).message}`
      );

      // Add error message with more details
      const errorMessage =
        error instanceof Error
          ? `Error: ${error.message}`
          : "An unknown error occurred. Please try again.";

      // Show error in UI
      setError(errorMessage);
    } finally {
      setIsTyping(false);
    }
  };

  // Add a handler for the back button
  const handleBackButton = () => {
    if (messages.length > 0) {
      // Show confirmation dialog if there are messages
      setShowExitConfirmation(true);
    } else {
      // Direct exit if no messages
      router.push("/patient-interactions/select-patient?mode=chat");
    }
  };

  // Add new function to handle configuration saving
  const handleConfigSave = (options: PatientConfigOptions) => {
    setPatientConfig(options);
    console.log("Patient configuration updated:", options);

    // Add a system message to indicate configuration change
    const configMessage: Message = {
      id: generateUniqueId(),
      text: `Patient configuration updated (Emotion: ${options.emotion}, Health Literacy: ${options.healthLiteracy})`,
      sender: "system",
      timestamp: new Date(),
    };

    // Generate an initial greeting based on the emotion state
    if (patient) {
      // Create an appropriate greeting based on emotional state
      let greeting = "";

      switch (options.emotion) {
        case "Anxious":
          greeting = `Hi... I'm ${patient.patientName}. *fidgets nervously* I'm a bit worried about being here today. Do you have time to see me?`;
          break;
        case "Confused":
          greeting = `Hello... I'm ${patient.patientName}. I'm not entirely sure why I'm here or what's happening. Can you help me understand?`;
          break;
        case "Angry":
          greeting = `I'm ${patient.patientName}. *crosses arms* I've been waiting for quite a while. I hope this doesn't take too long.`;
          break;
        case "Sad":
          greeting = `Hi, I'm ${patient.patientName}... *sighs* I haven't been feeling well lately. Thanks for seeing me today.`;
          break;
        case "Frustrated":
          greeting = `I'm ${patient.patientName}. *exhales deeply* I've been dealing with this for a while and not getting better. Hope you can help.`;
          break;
        case "Worried":
          greeting = `Hello, I'm ${patient.patientName}. I'm concerned about my symptoms and what they might mean. Can we talk about that?`;
          break;
        case "In Pain":
          greeting = `Hi... *winces* I'm ${patient.patientName}. Sorry if I seem distracted, I'm in quite a bit of discomfort right now.`;
          break;
        case "Hopeful":
          greeting = `Hi! I'm ${patient.patientName}. I'm really looking forward to our conversation today. I've heard good things about you.`;
          break;
        case "Calm":
        default:
          greeting = `Hello, I'm ${patient.patientName}. Thank you for seeing me today. How can we make the most of our time together?`;
      }

      // Create patient greeting message
      const patientMessage: Message = {
        id: generateUniqueId(),
        text: greeting,
        sender: "patient",
        timestamp: new Date(),
      };

      setMessages((prev) => {
        // First add the system message about config update
        const updatedMessages = [...prev, configMessage];

        // If there are only user/system messages (no patient messages yet)
        const hasPatientMessages = prev.some((msg) => msg.sender === "patient");

        if (!hasPatientMessages) {
          // Add the patient's first message
          return [...updatedMessages, patientMessage];
        } else {
          // Add a new patient response based on the updated configuration
          return [...updatedMessages, patientMessage];
        }
      });
    } else {
      // Just add the system message if no patient is loaded
      setMessages((prev) => [...prev, configMessage]);
    }
  };

  // Function to generate and download transcript
  const handleDownloadTranscript = () => {
    if (messages.length === 0) {
      toast.error("No messages to download");
      return;
    }

    // Create transcript text
    let transcript = `Patient Chat Transcript\n`;
    transcript += `Date: ${new Date().toLocaleString()}\n`;
    transcript += `Patient: ${patient?.patientName || "Unknown"}\n`;
    transcript += `Age: ${patient?.age || "Unknown"} | Gender: ${
      patient?.gender || "Unknown"
    }\n`;

    // Add diagnostic information if available
    if (patient?.diagnosis) {
      transcript += `Diagnosis: ${patient.diagnosis}\n`;
    }

    if (patient?.allergies) {
      transcript += `Allergies: ${patient.allergies}\n`;
    }

    if (patient?.medicationItems && patient.medicationItems.length > 0) {
      const medications = patient.medicationItems
        .filter((item) => item.checked)
        .map(
          (item) => `${item.title}${item.details ? ` (${item.details})` : ""}`
        )
        .join(", ");

      if (medications) {
        transcript += `Medications: ${medications}\n`;
      }
    }

    // Add configuration information
    transcript += `\nPatient Configuration:\n`;
    transcript += `Emotional State: ${patientConfig.emotion}\n`;
    transcript += `Health Literacy Level: ${patientConfig.healthLiteracy}\n`;

    transcript += `\n--- Conversation ---\n\n`;

    // Add messages to transcript
    messages.forEach((msg) => {
      const timestamp = msg.timestamp.toLocaleString();
      const sender =
        msg.sender === "user"
          ? "Provider"
          : msg.sender === "patient"
          ? patient?.patientName || "Patient"
          : "System";

      transcript += `[${timestamp}] ${sender}:\n${msg.text}\n\n`;
    });

    // Create and download file
    const blob = new Blob([transcript], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chat_transcript_${
      patient?.patientName?.replace(/\s+/g, "_") || "patient"
    }_${new Date().toISOString().split("T")[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("Transcript downloaded successfully");
  };

  // Function to end chat
  const handleEndChat = (shouldDownload = false) => {
    if (shouldDownload) {
      handleDownloadTranscript();
    }

    // Clean up local storage
    if (sessionId) {
      localStorage.removeItem(`chat_session_expiry_${sessionId}`);
    }

    // Navigate back to select page
    router.push("/patient-interactions/select-patient?mode=chat");
  };

  // Patient info header component
  const HeaderContent = () => {
    if (!patient) return null;
    return (
      <div className="flex items-center space-x-2 justify-between w-full">
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-[#015a8b] rounded-full group"
            onClick={handleBackButton}
          >
            <ArrowLeft className="h-5 w-5 text-[#015a8b] group-hover:text-white" />
          </Button>
          <div>
            <div className="text-sm font-bold">
              Patient:{" "}
              <span className="font-normal">{patient.patientName}</span>
              {patient.isGlobal && (
                <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                  Default Profile
                </span>
              )}
            </div>
            <div className="text-sm text-gray-600">
              Age: {patient.age} | Gender: {patient.gender}
            </div>
          </div>
          <div className="flex items-center space-x-1">
            {patient.diagnosis && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 hover:bg-[#015a8b] rounded-full group"
                onClick={() => setShowPatientInfo(true)}
                title="View patient information"
              >
                <Info className="h-4 w-4 text-[#015a8b] group-hover:text-white" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-[#015a8b] hover:bg-blue-50 hover:text-[#014a71]"
              onClick={() => setShowConfigModal(true)}
              title="Configure patient behavior"
            >
              Configure
            </Button>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-red-600 hover:bg-red-50 hover:text-red-700 flex items-center"
            onClick={() => setShowEndChatConfirmation(true)}
            title="End chat"
          >
            <LogOut className="h-3 w-3 mr-1" />
            End Chat
          </Button>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <ContentLayout
        title={patient ? <HeaderContent /> : "Patient Chat"}
        showSearch={false}
        backgroundColor="bg-[#F8F9FA]"
      >
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#015a8b] mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading patient information...</p>
            {apiStatus && (
              <p className="mt-2 text-xs text-gray-500">{apiStatus}</p>
            )}
          </div>
        </div>
      </ContentLayout>
    );
  }

  if (error) {
    return (
      <ContentLayout
        title={patient ? <HeaderContent /> : "Patient Chat"}
        showSearch={false}
        backgroundColor="bg-[#F8F9FA]"
      >
        <div className="flex flex-col items-center justify-center h-full p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-800 mb-2">Error</h3>
            <p className="text-gray-600 mb-6">{error}</p>

            {/* Action buttons based on error type */}
            {error.includes("No valid patient profiles found") && (
              <div className="flex flex-col space-y-3">
                <Button
                  className="bg-[#015a8b] hover:bg-[#014a71]"
                  onClick={() => router.push("/manage-profiles/create")}
                >
                  Create New Patient Profile
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push("/patient-profiles")}
                >
                  Go to Patient Profiles
                </Button>
              </div>
            )}

            {error.includes("Failed to initialize chat") && (
              <Button
                className="bg-[#015a8b] hover:bg-[#014a71]"
                onClick={() =>
                  router.push("/patient-interactions/select-patient?mode=chat")
                }
              >
                Select Different Patient
              </Button>
            )}

            {error.includes("Authentication") && (
              <Button
                className="bg-[#015a8b] hover:bg-[#014a71]"
                onClick={() => router.push("/login")}
              >
                Go to Login
              </Button>
            )}

            {/* Default back button if no specific action */}
            {!error.includes("No valid patient profiles found") &&
              !error.includes("Failed to initialize chat") &&
              !error.includes("Authentication") && (
                <Button variant="outline" onClick={() => router.back()}>
                  Go Back
                </Button>
              )}

            {error && error.includes("Patient profile") && (
              <div className="mt-4">
                <div className="text-xs text-gray-500 mb-2">
                  Authentication Status:
                </div>
                <div className="text-left text-xs bg-blue-50 p-2 rounded mb-4">
                  {authStatus || "Unknown"}
                </div>

                {Object.keys(debugInfo).length > 0 && (
                  <>
                    <div className="text-xs text-gray-500 mb-2">
                      Debug Information:
                    </div>
                    <div className="text-left text-xs bg-gray-100 p-2 rounded mb-2 overflow-x-auto">
                      <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
                    </div>
                    <div className="flex flex-col space-y-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          window.open(
                            `/api/validate-id?id=${patientId}`,
                            "_blank"
                          )
                        }
                        className="text-xs"
                      >
                        Validate Exact ID
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => {
                          // Force re-authentication by redirecting to login with a return URL
                          const returnUrl = encodeURIComponent(
                            window.location.pathname + window.location.search
                          );
                          router.push(
                            `/login?redirect=${returnUrl}&forceAuth=true`
                          );
                        }}
                        className="text-xs"
                      >
                        Re-authenticate and Try Again
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </ContentLayout>
    );
  }

  if (!patient) {
    return (
      <ContentLayout
        title={patient ? <HeaderContent /> : "Patient Chat"}
        showSearch={false}
        backgroundColor="bg-[#F8F9FA]"
      >
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <p className="text-gray-600 mb-4">Patient profile not found</p>
            <Button
              onClick={() =>
                router.push("/patient-interactions/select-patient?mode=chat")
              }
              className="bg-[#015a8b] hover:bg-[#216f99]"
            >
              Select a Different Patient
            </Button>
          </div>
        </div>
      </ContentLayout>
    );
  }

  return (
    <ContentLayout
      title={patient ? <HeaderContent /> : "Patient Chat"}
      showSearch={false}
      backgroundColor="bg-[#F8F9FA]"
    >
      {/* Patient Info Modal */}
      {showPatientInfo && patient && (
        <PatientProfileModal
          open={showPatientInfo}
          onOpenChange={setShowPatientInfo}
          patient={patient}
        />
      )}

      {/* Patient Configuration Modal */}
      <PatientConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        onSave={handleConfigSave}
        initialOptions={patientConfig}
        patientName={patient?.patientName}
      />

      {/* Add End Chat Confirmation Dialog */}
      <ExitConfirmationDialog
        isOpen={showEndChatConfirmation}
        onClose={() => setShowEndChatConfirmation(false)}
        onExit={() => handleEndChat(false)}
        title="End Chat Session?"
        message="Do you want to end this chat session? You can download a transcript of this conversation before ending."
        cancelText="Cancel"
        exitText="End Chat"
        extraButton={
          <Button
            onClick={() => {
              handleEndChat(true);
              setShowEndChatConfirmation(false);
            }}
            className="bg-green-600 hover:bg-green-700"
          >
            Download & End
          </Button>
        }
      />

      <div className="h-full flex flex-col w-full">
        {/* Debug Info - now collapsible */}
        <div className="bg-gray-100 text-xs text-gray-600 rounded mb-2 overflow-hidden w-full">
          <div
            className="p-2 flex justify-between items-center cursor-pointer hover:bg-gray-200"
            onClick={() => setDebugBannerExpanded(!debugBannerExpanded)}
          >
            <span className="font-medium">Session Info</span>
            {debugBannerExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </div>

          {debugBannerExpanded && (
            <div className="p-2 pt-0 border-t border-gray-200">
              {process.env.NODE_ENV !== "production" && apiStatus && (
                <div>{apiStatus}</div>
              )}
              {process.env.NODE_ENV !== "production" && authStatus ? (
                <div>{authStatus}</div>
              ) : (
                <div>
                  Auth: {authToken ? "Authenticated" : "Not authenticated"}
                </div>
              )}
              <div>Patient ID: {patientId}</div>
              {sessionId && <div>Session ID: {sessionId}</div>}
              {sessionTimeRemaining && (
                <div className="text-amber-600">
                  Session timeout: {formatTimeRemaining(sessionTimeRemaining)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex-1 flex items-center justify-center w-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#015a8b] mx-auto"></div>
              <p className="mt-4 text-gray-600">
                Loading patient information...
              </p>
            </div>
          </div>
        )}

        {/* Error Display */}
        {!isLoading && error && messages.length === 0 && (
          <div className="mx-6 mb-4 p-4 bg-red-50 text-red-700 rounded-md w-full">
            <div className="flex items-center mb-1">
              <AlertTriangle className="h-5 w-5 mr-2" />
              <span className="font-semibold">Error</span>
            </div>
            <p className="text-sm">{error}</p>

            {/* Add login button when unauthenticated */}
            {error.includes("authenticated") && (
              <div className="mt-4">
                <Button
                  onClick={() => router.push("/auth/login")}
                  className="bg-[#015a8b] hover:bg-[#216f99]"
                >
                  Sign In
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Messages Area */}
        {!isLoading && (
          <div className="flex-1 overflow-y-auto w-full">
            {/* Display non-critical errors as a notification banner */}
            {error && messages.length > 0 && (
              <div className="mx-2 mb-4 p-3 bg-amber-50 text-amber-700 rounded-md text-sm">
                <div className="flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              </div>
            )}

            <ChatContainer
              messages={adaptMessageFormat(messages, patient?.patientName)}
              isTyping={isTyping}
              typingMessageProps={{
                role: "patient",
                senderName: patient?.patientName || "Patient",
                content: "",
              }}
              className="p-6 w-full max-w-full"
            />
          </div>
        )}

        {/* Input Area */}
        <form
          onSubmit={handleSendMessage}
          className="mt-4 border-t border-[#015a8b] py-4 px-6 w-full"
        >
          <div className="flex items-center w-full">
            <div className="flex-1 w-full">
              <TabsInputArea
                value={newMessage}
                onChange={setNewMessage}
                onSend={handleSendMessage}
                isProcessing={isTyping}
                disabled={!!error}
                placeholder={`Say anything...\n\n\n(Press Enter to send, Shift+Enter for new line)`}
                helperText="Chat sessions are temporarily stored for testing purposes and automatically deleted after 2 hours."
                availableActions={availableActions}
                onActionSelect={handleAction}
                defaultTab="chat"
                className="w-full"
              />
            </div>
          </div>
        </form>

        {/* Add conditional session expiry warning if needed */}
        {sessionTimeRemaining && sessionTimeRemaining < 15 * 60 * 1000 && (
          <div className="mt-2 text-center pb-4 bg-[#F8F9FA] w-full">
            <span className="block text-amber-600 font-medium mt-1">
              Your session will expire in{" "}
              {formatTimeRemaining(sessionTimeRemaining)}
            </span>
          </div>
        )}
      </div>

      {/* Exit Confirmation Dialog */}
      <ExitConfirmationDialog
        isOpen={showExitConfirmation}
        onClose={() => setShowExitConfirmation(false)}
        onExit={() => {
          setShowExitConfirmation(false);
          router.push("/patient-interactions/select-patient?mode=chat");
        }}
        title="Exit Chat?"
        message="You are in the middle of a chat session. If you exit now, your conversation will not be saved."
      />
    </ContentLayout>
  );
}
