"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ContentLayout } from "@/app/components/layouts/ContentLayout";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { getProfiles, getProfile } from "@/app/lib/storage";
import { type PatientProfile } from "@/app/types/patient";
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
} from "lucide-react";
import { type ChatMessage } from "@/app/lib/gemini";
import { supabase } from "@/app/lib/supabase";
import { toast } from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/app/components/ui/dialog";
import { ScrollArea } from "@/app/components/ui/scroll-area";

interface Message {
  id: string;
  text: string;
  sender: "user" | "patient";
  timestamp: Date;
}

// CheckboxItem component from select-patient page
const CheckboxItem = ({
  label,
  checked,
}: {
  label: string;
  checked: boolean;
}) => (
  <div className="flex items-start">
    <div
      className={`flex-shrink-0 w-4 h-4 mr-1 border border-gray-500 rounded flex items-center justify-center ${
        checked ? "bg-[#015a8b] border-[#015a8b]" : "bg-white"
      }`}
    >
      {checked && <Check className="w-3 h-3 text-white" />}
    </div>
    <span className="font-semibold">{label}</span>
  </div>
);

// Patient Info Modal component was here, now replaced with the Dialog component

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

      // Log the initial greeting with patient prefix
      console.log(`[${data.patientName || "PATIENT"}] ${data.greeting}`);

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

      // Add initial greeting message from patient
      const initialMessage: Message = {
        id: Date.now().toString(),
        text: data.greeting,
        sender: "patient",
        timestamp: new Date(),
      };

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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !sessionId || !authToken || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
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
        id: Date.now().toString(),
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

  const Title = patient && (
    <div className="flex items-center gap-4">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() =>
          router.push("/patient-interactions/select-patient?mode=chat")
        }
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <div>
        <h1 className="text-xl font-bold flex items-center">
          {patient.patientName}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 ml-1"
            onClick={() => setShowPatientInfo(true)}
            title="View patient information"
          >
            <Info className="h-4 w-4 text-blue-500" />
          </Button>
        </h1>
        <p className="text-sm text-gray-500">
          {patient.age ? `${patient.age} years` : ""}
          {patient.age && patient.gender ? " • " : ""}
          {patient.gender || ""}
          {patient.diagnosis ? (
            <span className="ml-2 text-blue-600">• {patient.diagnosis}</span>
          ) : (
            ""
          )}
        </p>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <ContentLayout
        title="Patient Chat"
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
        title="Patient Chat"
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
        title="Patient Chat"
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
      title={Title}
      showSearch={false}
      backgroundColor="bg-[#F8F9FA]"
    >
      {/* Patient Info Modal */}
      {showPatientInfo && patient && (
        <Dialog open={showPatientInfo} onOpenChange={setShowPatientInfo}>
          <DialogContent className="max-w-[95vw] w-[1200px] max-h-[95vh] p-6 overflow-hidden">
            <DialogHeader className="pb-4">
              <DialogTitle className="text-2xl text-[#015a8b]">
                Patient Profile Details
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-full max-h-[calc(95vh-120px)]">
              <div className="h-full w-full max-w-full overflow-x-auto">
                <table className="h-full w-full border-collapse text-[8px] xs:text-[9px] sm:text-xs md:text-sm min-w-[650px]">
                  <tbody>
                    {/* Patient Basic Info Row */}
                    <tr>
                      <td
                        className="border border-[#97a8b5] bg-[#97a8b5]/30 p-1 sm:p-2 w-1/3 align-top"
                        colSpan={2}
                      >
                        <div className="mb-1">
                          <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                            Patient Name:
                          </strong>{" "}
                          {patient.patientName || (
                            <span className="text-gray-400">Not specified</span>
                          )}
                        </div>
                      </td>
                      <td className="border border-[#97a8b5] bg-[#97a8b5]/30 p-1 sm:p-2 w-1/6 align-top">
                        <div className="mb-1">
                          <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                            Age:
                          </strong>{" "}
                          {patient.age || (
                            <span className="text-gray-400">Not specified</span>
                          )}
                        </div>
                      </td>
                      <td className="border border-[#97a8b5] bg-[#97a8b5]/30 p-1 sm:p-2 w-1/6 align-top">
                        <div className="mb-1">
                          <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                            Gender:
                          </strong>{" "}
                          {patient.gender || (
                            <span className="text-gray-400">Not specified</span>
                          )}
                        </div>
                      </td>
                      <td
                        className="border border-[#97a8b5] bg-[#97a8b5]/30 p-1 sm:p-2 w-1/3 align-top"
                        rowSpan={2}
                      >
                        <div className="mb-1">
                          <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                            Allergies:
                          </strong>{" "}
                          {patient.allergies || "No known allergies"}
                        </div>
                        <div className="mt-1 sm:mt-2">
                          <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                            Unit:
                          </strong>{" "}
                          {patient.unit || (
                            <span className="text-gray-400">Not specified</span>
                          )}
                        </div>
                        <div className="mt-1 sm:mt-2">
                          <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                            Major support:
                          </strong>{" "}
                          {patient.majorSupport || (
                            <span className="text-gray-400">Not specified</span>
                          )}
                        </div>
                        <div className="mt-1 sm:mt-2">
                          <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                            Phone:
                          </strong>{" "}
                          {patient.phone || (
                            <span className="text-gray-400">Not specified</span>
                          )}
                        </div>
                        <div className="mt-1 sm:mt-2">
                          <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                            Immunizations:
                          </strong>{" "}
                          {patient.immunizations || (
                            <span className="text-gray-400">Not specified</span>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Case Details Row */}
                    <tr>
                      <td
                        className="border border-[#97a8b5] bg-[#97a8b5]/30 p-1 sm:p-2 align-top"
                        colSpan={2}
                      >
                        <div className="mb-1">
                          <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                            Case:
                          </strong>{" "}
                          {patient.case || (
                            <span className="text-gray-400">Not specified</span>
                          )}
                        </div>
                        <div className="mt-0.5 sm:mt-1">
                          <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                            Diagnosis:
                          </strong>{" "}
                          {patient.diagnosis || (
                            <span className="text-gray-400">Not specified</span>
                          )}
                        </div>
                        <div className="mt-0.5 sm:mt-1">
                          <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                            History:
                          </strong>{" "}
                          {patient.history || (
                            <span className="text-gray-400">Not specified</span>
                          )}
                        </div>
                        <div className="mt-0.5 sm:mt-1">
                          <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                            Type of operation:
                          </strong>{" "}
                          {patient.operationType || (
                            <span className="text-gray-400">Not specified</span>
                          )}
                        </div>
                        <div className="mt-0.5 sm:mt-1">
                          <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                            Height:
                          </strong>{" "}
                          {patient.height || (
                            <span className="text-gray-400">Not specified</span>
                          )}
                        </div>
                        <div className="mt-0.5 sm:mt-1">
                          <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                            Consultation:
                          </strong>{" "}
                          {patient.consultation || (
                            <span className="text-gray-400">Not specified</span>
                          )}
                        </div>
                        <div className="mt-0.5 sm:mt-1">
                          <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                            Consent obtained:
                          </strong>{" "}
                          {patient.consentObtained ? "✓ Yes" : "☐ Yes"}
                          {!patient.consentObtained ? "✓ No" : "☐ No"}
                        </div>
                      </td>
                      <td
                        className="border border-[#97a8b5] bg-[#97a8b5]/30 p-1 sm:p-2 align-top"
                        colSpan={2}
                      >
                        <div className="mt-0.5 sm:mt-1">
                          <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                            Weight:
                          </strong>{" "}
                          {patient.weight || (
                            <span className="text-gray-400">Not specified</span>
                          )}
                        </div>
                        <div className="mt-0.5 sm:mt-1">
                          <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                            Physician:
                          </strong>{" "}
                          {patient.physician || (
                            <span className="text-gray-400">Not specified</span>
                          )}
                        </div>
                        <div className="mt-0.5 sm:mt-1">
                          <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                            Advanced directives:
                          </strong>{" "}
                          {patient.advancedDirectives || (
                            <span className="text-gray-400">Not specified</span>
                          )}
                        </div>
                        <div className="mt-0.5 sm:mt-1">
                          <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                            Diet:
                          </strong>{" "}
                          {patient.diet || (
                            <span className="text-gray-400">Not specified</span>
                          )}
                        </div>
                        <div className="mt-0.5 sm:mt-1">
                          <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                            Fall precautions:
                          </strong>{" "}
                          {patient.fallPrecautions || (
                            <span className="text-gray-400">Not specified</span>
                          )}
                        </div>
                        <div className="mt-0.5 sm:mt-1">
                          <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                            Restraints:
                          </strong>{" "}
                          {patient.restraints || (
                            <span className="text-gray-400">Not specified</span>
                          )}
                        </div>
                        <div className="mt-0.5 sm:mt-1">
                          <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                            Isolation precautions:
                          </strong>{" "}
                          {patient.isolationPrecautions || (
                            <span className="text-gray-400">Not specified</span>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Monitoring, Medication, Respiratory Row */}
                    <tr>
                      <td className="border border-[#97a8b5] bg-[#97a8b5]/30 p-1 sm:p-2 w-1/5 align-top">
                        <div className="mb-1">
                          <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                            Monitoring:
                          </strong>
                        </div>
                        {patient.monitoringItems?.length > 0 ? (
                          patient.monitoringItems.map((item) => (
                            <div key={item.id} className="mt-1 sm:mt-2">
                              <CheckboxItem
                                label={item.title}
                                checked={item.checked}
                              />
                              {item.details && (
                                <div className="mt-0.5 sm:mt-1 ml-5 font-normal text-gray-700">
                                  ({item.details})
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="text-gray-400 text-[9px] xs:text-[10px] sm:text-xs md:text-sm">
                            No monitoring items
                          </div>
                        )}
                      </td>
                      <td className="border border-[#97a8b5] bg-[#97a8b5]/30 p-1 sm:p-2 w-1/5 align-top">
                        <div className="mb-1">
                          <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                            Medication:
                          </strong>
                        </div>
                        <div className="mb-1">
                          <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                            Medications:
                          </strong>
                          {patient.medicationItems &&
                          patient.medicationItems.length > 0 ? (
                            patient.medicationItems.map((item) => (
                              <div key={item.id} className="mt-1 sm:mt-2">
                                <CheckboxItem
                                  label={item.title}
                                  checked={item.checked}
                                />
                                {item.details && (
                                  <div className="mt-0.5 sm:mt-1 ml-5 font-normal text-gray-700">
                                    ({item.details})
                                  </div>
                                )}
                              </div>
                            ))
                          ) : (
                            <div className="text-gray-400 text-[9px] xs:text-[10px] sm:text-xs md:text-sm">
                              No medications
                            </div>
                          )}
                        </div>
                      </td>
                      <td
                        className="border border-[#97a8b5] bg-[#97a8b5]/30 p-1 sm:p-2 w-3/5 align-top"
                        colSpan={3}
                      >
                        <div className="mb-1">
                          <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                            Respiratory:
                          </strong>
                        </div>
                        {patient.respiratoryItems?.length > 0 ? (
                          patient.respiratoryItems.map((item) => (
                            <div key={item.id} className="mt-1 sm:mt-2">
                              <CheckboxItem
                                label={item.title}
                                checked={item.checked}
                              />
                              {item.details && (
                                <div className="mt-0.5 sm:mt-1 ml-5 font-normal text-gray-700">
                                  ({item.details})
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="text-gray-400 text-[9px] xs:text-[10px] sm:text-xs md:text-sm">
                            No respiratory items
                          </div>
                        )}
                      </td>
                    </tr>

                    {/* Diagnostic Studies, Social History, Activity of Daily Living Row */}
                    <tr>
                      <td className="border border-[#97a8b5] bg-[#97a8b5]/30 p-1 sm:p-2 w-1/5 align-top">
                        <div className="mb-1">
                          <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                            Diagnostic studies:
                          </strong>
                        </div>
                        {patient.diagnosticItems?.length > 0 ? (
                          patient.diagnosticItems.map((item) => (
                            <div key={item.id} className="mt-1 sm:mt-2">
                              <CheckboxItem
                                label={item.title}
                                checked={item.checked}
                              />
                              {item.details && (
                                <div className="mt-0.5 sm:mt-1 ml-5 font-normal text-gray-700">
                                  ({item.details})
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="text-gray-400 text-[9px] xs:text-[10px] sm:text-xs md:text-sm">
                            No diagnostic studies
                          </div>
                        )}
                      </td>
                      <td className="border border-[#97a8b5] bg-[#97a8b5]/30 p-1 sm:p-2 w-1/5 align-top">
                        <div className="mb-1">
                          <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                            Social history:
                          </strong>
                        </div>
                        {patient.socialHistoryItems?.length > 0 ? (
                          patient.socialHistoryItems.map((item) => (
                            <div key={item.id} className="mt-1 sm:mt-2">
                              <CheckboxItem
                                label={item.title}
                                checked={item.checked}
                              />
                              {item.details && (
                                <div className="mt-0.5 sm:mt-1 ml-5 font-normal text-gray-700">
                                  ({item.details})
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="text-gray-400 text-[9px] xs:text-[10px] sm:text-xs md:text-sm">
                            No social history items
                          </div>
                        )}
                        <div className="mt-2 sm:mt-3">
                          <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                            Race/Religion:
                          </strong>{" "}
                          {patient.raceReligion || (
                            <span className="text-gray-400">Not specified</span>
                          )}
                        </div>
                        <div className="mt-2 sm:mt-3">
                          <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                            Medication brought from home:
                          </strong>
                        </div>
                        {patient.medicationFromHomeItems?.length > 0 ? (
                          patient.medicationFromHomeItems.map((item) => (
                            <div key={item.id} className="mt-1 sm:mt-2">
                              <CheckboxItem
                                label={item.title}
                                checked={item.checked}
                              />
                              {item.details && (
                                <div className="mt-0.5 sm:mt-1 ml-5 font-normal text-gray-700">
                                  ({item.details})
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="text-gray-400 text-[9px] xs:text-[10px] sm:text-xs md:text-sm mt-1">
                            No medications from home
                          </div>
                        )}
                      </td>
                      <td
                        className="border border-[#97a8b5] bg-[#97a8b5]/30 p-1 sm:p-2 w-3/5 align-top"
                        colSpan={3}
                      >
                        <div className="mb-1">
                          <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                            Activity of daily living:
                          </strong>
                        </div>
                        {patient.activityItems?.length > 0 ? (
                          patient.activityItems.map((item) => (
                            <div key={item.id} className="mt-1 sm:mt-2">
                              <CheckboxItem
                                label={item.title}
                                checked={item.checked}
                              />
                              {item.details && (
                                <div className="mt-0.5 sm:mt-1 ml-5 font-normal text-gray-700">
                                  ({item.details})
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="text-gray-400 text-[9px] xs:text-[10px] sm:text-xs md:text-sm">
                            No activity items
                          </div>
                        )}

                        <div className="mt-2 sm:mt-3">
                          <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                            Discharge planning:
                          </strong>{" "}
                          {patient.dischargePlanning || (
                            <span className="text-gray-400">Not specified</span>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Drains Row */}
                    <tr>
                      <td
                        className="border border-[#97a8b5] bg-[#97a8b5]/30 p-1 sm:p-2 align-top"
                        colSpan={5}
                      >
                        <div className="mb-1">
                          <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                            Drains:
                          </strong>
                        </div>
                        {patient.drainItems?.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                            {patient.drainItems.map((item) => (
                              <div key={item.id} className="mt-1 sm:mt-2">
                                <CheckboxItem
                                  label={item.title}
                                  checked={item.checked}
                                />
                                {item.details && (
                                  <div className="mt-0.5 sm:mt-1 ml-5 font-normal text-gray-700">
                                    ({item.details})
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-gray-400 text-[9px] xs:text-[10px] sm:text-xs md:text-sm">
                            No drains
                          </div>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}

      <div className="h-full flex flex-col">
        {/* Debug Info - now collapsible */}
        <div className="bg-gray-100 text-xs text-gray-600 rounded mb-2 overflow-hidden">
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
          <div className="flex-1 flex items-center justify-center">
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
          <div className="mx-6 mb-4 p-4 bg-red-50 text-red-700 rounded-md">
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
          <div className="flex-1 overflow-y-auto space-y-4 p-6">
            {/* Initial greeting loading indicator */}
            {isTyping && messages.length === 0 && (
              <div className="flex justify-start">
                <div className="bg-[#E9ECEF] text-gray-900 max-w-[70%] rounded-[10px] p-4">
                  <div className="flex flex-col">
                    <span className="text-xs font-medium opacity-75 mb-1">
                      {patient?.patientName || "Patient"}
                    </span>
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <p className="text-sm">Preparing a greeting...</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Display non-critical errors as a notification banner */}
            {error && messages.length > 0 && (
              <div className="mx-2 mb-4 p-3 bg-amber-50 text-amber-700 rounded-md text-sm">
                <div className="flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[70%] rounded-[10px] p-4 ${
                    message.sender === "user"
                      ? "bg-[#015a8b] text-white"
                      : "bg-[#E9ECEF] text-gray-900"
                  }`}
                >
                  {message.sender === "user" ? (
                    <div className="flex flex-col">
                      <span className="text-xs font-medium opacity-75 mb-1">
                        You
                      </span>
                      <p className="text-sm leading-relaxed">{message.text}</p>
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      <span className="text-xs font-medium opacity-75 mb-1">
                        {patient?.patientName || "Patient"}
                      </span>
                      <p className="text-sm leading-relaxed">{message.text}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && messages.length > 0 && (
              <div className="flex justify-start">
                <div className="bg-[#E9ECEF] text-gray-900 max-w-[70%] rounded-[10px] p-4">
                  <div className="flex flex-col">
                    <span className="text-xs font-medium opacity-75 mb-1">
                      {patient?.patientName || "Patient"}
                    </span>
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <p className="text-sm">Typing...</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Input Area */}
        <form
          onSubmit={handleSendMessage}
          className="mt-4 border-t border-gray-100 pt-4 px-6"
        >
          <div className="flex gap-2 items-center">
            <div className="flex-1 relative">
              <textarea
                placeholder="Say anything..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="w-full text-sm px-4 py-4 h-[120px] pr-12 align-top bg-white border-[1px] border-[#E5E5E5] overflow-y-auto resize-none rounded-[1rem] focus:outline-none"
                style={{ alignItems: "flex-start" }}
                disabled={isTyping || !!error}
              />
              <button
                type="button"
                className="absolute right-4 bottom-4"
                onClick={() => {
                  // Speech to text functionality will be added later
                  console.log("Audio input clicked");
                }}
              >
                <img
                  src="/audio-input.svg"
                  alt="Audio Input"
                  className="w-[32px] h-[32px]"
                />
              </button>
            </div>
            <Button
              type="submit"
              className="bg-[#015a8b] hover:bg-[#216f99] h-[38px] w-[38px] p-0 flex-shrink-0"
              disabled={!newMessage.trim() || isTyping || !!error}
            >
              {isTyping ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
        </form>

        {/* Warning Banner */}
        <div className="mt-2 text-center pb-4 bg-[#F8F9FA]">
          <p className="text-sm text-gray-500">
            Chat sessions are temporarily stored for testing purposes and
            automatically deleted after 2 hours.
            {sessionTimeRemaining && sessionTimeRemaining < 15 * 60 * 1000 && (
              <span className="block text-amber-600 font-medium mt-1">
                Your session will expire in{" "}
                {formatTimeRemaining(sessionTimeRemaining)}
              </span>
            )}
          </p>
        </div>
      </div>
    </ContentLayout>
  );
}
