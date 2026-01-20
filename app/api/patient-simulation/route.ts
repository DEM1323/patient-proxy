import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAuthClient } from "@/app/lib/supabase";
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";
import {
  ExpectedTreatmentStep,
  PatientProfileData,
  SimulationAction,
  SimulationScenario,
} from "@/app/types/patient-simulation";

// Response structure for AI responses
interface AIResponse {
  response: string;
  observations?: string[];
  feedback?: string[];
}

// Message structure for the Gemini API
interface ChatMessage {
  role: "user" | "model" | "assistant" | string;
  parts: string;
}

// Patient configuration interface
interface PatientConfig {
  emotion: string;
  healthLiteracy: string;
}

// Initialize the Google Generative AI with API key
const getGeminiAPI = () => {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;

  if (!apiKey) {
    console.error("Missing GOOGLE_GEMINI_API_KEY environment variable");
    throw new Error("Missing GOOGLE_GEMINI_API_KEY environment variable");
  }

  return new GoogleGenerativeAI(apiKey);
};

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const {
      message,
      patientId,
      scenarioId,
      messageHistory = [],
      isAction = false,
      actionHistory = [],
      patientConfig = { emotion: "Calm", healthLiteracy: "1" }, // Default config if not provided
    } = body;

    // Validate inputs
    if ((!message && !isAction) || !patientId) {
      return NextResponse.json(
        { error: "Message/action and patientId are required" },
        { status: 400 }
      );
    }

    // Log the request details
    console.log(`[PATIENT-SIM] Handling request for patient ID: ${patientId}`);
    console.log(
      `[PATIENT-SIM] Request type: ${isAction ? "Action" : "Message"}`
    );

    // Create a server-side Supabase client
    const supabase = createClient();

    // Get patient profile from Supabase
    const { data: profileData, error: profileError } = await supabase
      .from("patient_profiles")
      .select("*")
      .eq("id", patientId)
      .maybeSingle();

    if (profileError || !profileData) {
      console.error(
        `[PATIENT-SIM] Patient profile not found: ${
          profileError?.message || "No data returned"
        }`
      );
      return NextResponse.json(
        { error: "Patient profile not found" },
        { status: 404 }
      );
    }

    // Prepare patient profile data
    let patientProfile: PatientProfileData = {
      id: profileData?.id || "",
      patientName: "Patient",
    };

    if (profileData) {
      // First add any base fields directly from the profile record
      patientProfile = {
        ...patientProfile,
        id: profileData.id,
        isGlobal: profileData.is_global || false,
      };

      // Then add profile data if it exists
      if (
        profileData.profile_data &&
        typeof profileData.profile_data === "object"
      ) {
        patientProfile = {
          ...patientProfile,
          ...profileData.profile_data,
        };
      }

      // Finally, add any direct fields that might be on the profile record itself
      if (profileData.patientName)
        patientProfile.patientName = profileData.patientName;
      if (profileData.age) patientProfile.age = profileData.age;
      if (profileData.gender) patientProfile.gender = profileData.gender;
    }

    // Load scenario data if a scenarioId is provided
    let scenario = null;
    if (scenarioId) {
      const { data: scenarioData, error: scenarioError } = await supabase
        .from("simulation_scenarios")
        .select("*")
        .eq("id", scenarioId)
        .maybeSingle();

      if (scenarioError) {
        console.error(
          `[PATIENT-SIM] Error fetching scenario: ${scenarioError.message}`
        );
      } else if (scenarioData) {
        scenario = scenarioData;
        console.log(
          `[PATIENT-SIM] Loaded scenario: ${scenarioData.title || scenarioId}`
        );
      }
    }

    // Combine patient profile with scenario for a complete context
    const simulationContext = {
      patient_profile: patientProfile,
      patientProfile: patientProfile, // For backwards compatibility
      scenario: scenario,
      expected_treatment_steps: scenario?.expected_treatment_steps || [],
      scenarioId: scenarioId,
      patientConfig: patientConfig, // Add patient configuration to context
    };

    // Check if this is an action response request
    if (isAction) {
      // Track this action in the action history
      const newAction: SimulationAction = {
        type: message,
        detail: "",
        timestamp: Date.now(),
      };

      // Generate a response to the clinical action
      const actionResponse = await generateActionResponse(
        message,
        simulationContext
      );

      // Generate feedback based on the action and expected treatment steps
      const feedback = generateFeedback(
        newAction,
        simulationContext.expected_treatment_steps,
        actionHistory
      );

      // Log the action and feedback
      console.log(`[PATIENT-SIM] Action: ${message}`);
      console.log(`[PATIENT-SIM] Feedback: ${feedback.join(", ")}`);

      return NextResponse.json({
        response: actionResponse,
        observations: extractObservations(actionResponse, simulationContext),
        feedback: feedback,
        senderName: patientProfile.patientName || "Patient",
      });
    }

    // For regular chat messages, generate a response using Gemini
    // Prepare the system prompt
    const systemPrompt = generateSystemPrompt(
      simulationContext,
      messageHistory
    );

    // Format the message history for Gemini if needed
    const formattedHistory: ChatMessage[] = messageHistory.map((msg: any) => {
      // Determine the role
      let role = msg.role || (msg.sender === "user" ? "user" : "assistant");

      // Extract the content - handle various possible formats
      let content = "";
      if (typeof msg.parts === "string") {
        content = msg.parts;
      } else if (typeof msg.content === "string") {
        content = msg.content;
      } else if (typeof msg.message === "string") {
        content = msg.message;
      } else if (msg.parts && typeof msg.parts === "object") {
        content = JSON.stringify(msg.parts);
      } else {
        // Fallback to empty string if no valid content found
        content = "";
      }

      // Ensure content is not empty
      if (!content.trim()) {
        content = role === "user" ? "Hello" : "I'm listening";
      }

      // For debugging, log the message being processed
      console.log(
        `[PATIENT-SIM] Processing message: role=${role}, content=${content.substring(
          0,
          50
        )}${content.length > 50 ? "..." : ""}`
      );

      return {
        role,
        parts: content,
      };
    });

    // Log the total number of messages being processed
    console.log(
      `[PATIENT-SIM] Total messages in history: ${formattedHistory.length}`
    );

    try {
      // Get response from Gemini API
      const response = await callGeminiAPI(
        systemPrompt,
        formattedHistory,
        message
      );

      // Extract observations from the response
      const observations = extractObservations(response, simulationContext);

      // Log the response
      console.log(`[PATIENT-SIM] Generated patient response`);
      console.log(`[PATIENT-SIM] Observations: ${observations.join(", ")}`);

      return NextResponse.json({
        response: response,
        observations: observations,
        senderName: patientProfile.patientName || "Patient",
      });
    } catch (apiError) {
      console.error(
        `[PATIENT-SIM] Error calling Gemini API: ${(apiError as Error).message}`
      );

      // Check if this is a medication-related message that might trigger safety filters
      const medicationTerms = [
        "zofran",
        "morphine",
        "tylenol",
        "acetaminophen",
        "ibuprofen",
        "advil",
        "oxycodone",
        "percocet",
        "vicodin",
        "dilaudid",
        "fentanyl",
        "metoprolol",
        "administer",
        "dosage",
        "dose",
        "medication",
        "give you",
        "prescribe",
      ];

      const lowerMessage = message.toLowerCase();
      const containsMedicationTerms = medicationTerms.some((term) =>
        lowerMessage.includes(term)
      );

      let fallbackResponse = "";

      // Generate an appropriate fallback response
      if (containsMedicationTerms) {
        if (
          lowerMessage.includes("zofran") ||
          lowerMessage.includes("nausea")
        ) {
          fallbackResponse = `Thank you. Yes, I've been feeling quite nauseous. The doctor mentioned something about anti-nausea medication earlier. Is this what they prescribed for me?`;
        } else if (
          lowerMessage.includes("pain") ||
          lowerMessage.includes("morphine") ||
          lowerMessage.includes("tylenol")
        ) {
          fallbackResponse = `I appreciate that. My pain has been about a 7 out of 10. Will this help bring it down? How long does it usually take to start working?`;
        } else {
          fallbackResponse = `Thank you. Can you explain what this medication is for? The doctor mentioned I'd be getting some medicine, but I'm not sure what each one does.`;
        }
      } else {
        // Default fallback for non-medication messages
        fallbackResponse = `I'm not feeling well. Can you help me?`;
      }

      return NextResponse.json({
        response: fallbackResponse,
        observations: containsMedicationTerms
          ? ["Patient asked about medication"]
          : ["Patient seemed confused"],
        error: "Used fallback response due to API error",
        senderName: patientProfile.patientName || "Patient",
      });
    }
  } catch (error) {
    console.error(`[PATIENT-SIM] Error: ${(error as Error).message}`);
    return NextResponse.json(
      {
        error: "Failed to process simulation request",
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

// Call the Gemini API with the scenario context
async function callGeminiAPI(
  systemPrompt: string,
  messageHistory: ChatMessage[],
  userMessage: string
): Promise<string> {
  console.log("[PATIENT-SIM] Initializing Gemini API for simulation");
  const genAI = getGeminiAPI();

  // Check if message contains medication references that might trigger safety filters
  const medicationTerms = [
    "zofran",
    "morphine",
    "tylenol",
    "acetaminophen",
    "ibuprofen",
    "advil",
    "oxycodone",
    "percocet",
    "vicodin",
    "dilaudid",
    "fentanyl",
    "metoprolol",
    "administer",
    "dosage",
    "dose",
    "medication",
    "give you",
    "prescribe",
  ];

  const lowerMessage = userMessage.toLowerCase();
  const containsMedicationTerms = medicationTerms.some((term) =>
    lowerMessage.includes(term)
  );

  // If the message might trigger safety filters, generate a safer response directly
  if (containsMedicationTerms) {
    console.log(
      "[PATIENT-SIM] Message contains medication terms that might trigger safety filters"
    );

    // Extract patient name for personalized response
    const patientNameMatch = systemPrompt.match(
      /You are an AI patient simulation named ([\w\s]+)\./
    );
    const patientName = patientNameMatch ? patientNameMatch[1] : "Patient";

    // Extract medication items from system prompt
    const medicationItemsMatch = systemPrompt.match(
      /YOUR MEDICATIONS[\s\S]*?:([\s\S]*?)IMPORTANT/
    );
    const medicationItems = medicationItemsMatch
      ? medicationItemsMatch[1].trim()
      : "";

    // Create a fallback response based on the medication mentioned
    let response = "";

    if (lowerMessage.includes("zofran") || lowerMessage.includes("nausea")) {
      response = `Thank you. Yes, I've been feeling quite nauseous. The doctor mentioned something about anti-nausea medication earlier. Is this what they prescribed for me?`;
    } else if (
      lowerMessage.includes("pain") ||
      lowerMessage.includes("morphine") ||
      lowerMessage.includes("tylenol") ||
      lowerMessage.includes("ibuprofen")
    ) {
      response = `I appreciate that. My pain has been about a 7 out of 10. Will this help bring it down? How long does it usually take to start working?`;
    } else if (
      lowerMessage.includes("medication") ||
      lowerMessage.includes("give you")
    ) {
      response = `Thank you. Can you explain what this medication is for? The doctor mentioned I'd be getting some medicine, but I'm not sure what each one does.`;
    } else {
      response = `Thank you for explaining about the medication. How often will I need to take it? Are there any side effects I should watch out for?`;
    }

    console.log(
      "[PATIENT-SIM] Using medication fallback response to avoid safety filter"
    );
    return response;
  }

  // Using Gemini 2.5 Flash model
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
  });

  // Create initial history with system prompt
  const initialHistory = [
    {
      role: "user",
      parts: [{ text: systemPrompt }],
    },
    {
      role: "model",
      parts: [
        {
          text: "I understand. I'll respond as the patient described in all our interactions.",
        },
      ],
    },
  ];

  // Format history in the way Gemini expects it
  // Properly map roles - Gemini only accepts 'user' and 'model' roles
  const formattedHistory = messageHistory.map((msg) => {
    // Normalize role values to match what Gemini accepts
    let role = msg.role;
    // Map 'assistant' to 'model' which is what Gemini expects
    if (role === "assistant") {
      role = "model";
    }
    // Ensure role is either 'user' or 'model'
    if (role !== "user" && role !== "model") {
      role = "user"; // Default to user for any other roles
    }

    return {
      role: role,
      parts: [
        {
          text:
            typeof msg.parts === "string"
              ? msg.parts
              : JSON.stringify(msg.parts),
        },
      ],
    };
  });

  // Combine initial history with the conversation history
  const fullHistory = [...initialHistory, ...formattedHistory];

  console.log(
    "[PATIENT-SIM] Starting chat with history length:",
    fullHistory.length
  );

  try {
    const chat = model.startChat({
      history: fullHistory,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ],
    });

    // Ensure user message is never empty
    const safeUserMessage = userMessage?.trim() || "Hello";
    console.log("[PATIENT-SIM] Sending message to Gemini:", safeUserMessage);

    // Generate response
    const result = await chat.sendMessage([{ text: safeUserMessage }]);
    const response = result.response;
    console.log("[PATIENT-SIM] Received response from Gemini for simulation");
    return response.text();
  } catch (error) {
    // Handle safety filter errors with fallback responses
    console.error(
      `[PATIENT-SIM] Error calling Gemini API: ${(error as Error).message}`
    );

    // If the error is safety-related, provide a more specific fallback
    if (
      (error as Error).message.includes("SAFETY") ||
      (error as Error).message.includes("blocked")
    ) {
      console.log(
        "[PATIENT-SIM] Content was blocked by safety filters, using fallback response"
      );

      if (
        lowerMessage.includes("how are you") ||
        lowerMessage.includes("feeling")
      ) {
        return "I'm feeling a bit uncomfortable, but I appreciate you checking on me. The staff has been taking good care of me so far.";
      } else if (lowerMessage.includes("pain")) {
        return "My pain is about a 6 out of 10 right now. It's worse when I move. Is there something that can help with that?";
      } else if (
        lowerMessage.includes("family") ||
        lowerMessage.includes("home")
      ) {
        return "My family is worried about me. My spouse has been calling to check on me. I'm hoping to get home as soon as possible.";
      } else {
        return "I'm sorry, I'm not feeling my best right now. Could you please explain what you're going to do next?";
      }
    }

    // General error fallback
    throw error;
  }
}

// Extract clinically relevant observations from patient responses
function extractObservations(response: string, context: any = null): string[] {
  const observations: string[] = [];
  const lowerResponse = response.toLowerCase();

  // Extract pain-related observations
  if (lowerResponse.includes("pain")) {
    const painMatch = response.match(
      /pain.{1,50}(\d+)(?:\s*\/\s*|\s+out\s+of\s+)10/i
    );
    if (painMatch) {
      observations.push(`Patient reported pain level: ${painMatch[1]}/10`);
    } else {
      observations.push("Patient reported pain");
    }
  }

  // Extract other common symptoms
  if (lowerResponse.includes("dizzy") || lowerResponse.includes("dizziness")) {
    observations.push("Patient reported dizziness");
  }

  if (
    lowerResponse.includes("nausea") ||
    lowerResponse.includes("nauseous") ||
    lowerResponse.includes("vomit")
  ) {
    observations.push("Patient reported nausea/vomiting");
  }

  if (
    lowerResponse.includes("fever") ||
    lowerResponse.includes("temperature")
  ) {
    observations.push("Patient discussed body temperature");
  }

  if (lowerResponse.includes("headache")) {
    observations.push("Patient reported headache");
  }

  if (lowerResponse.includes("breath") || lowerResponse.includes("breathing")) {
    observations.push("Patient discussed breathing/respiratory status");
  }

  // Extract medication-related observations
  if (
    lowerResponse.includes("medication") ||
    lowerResponse.includes("medicine") ||
    lowerResponse.includes("pill")
  ) {
    observations.push("Patient discussed medication");
  }

  // Extract allergy-related observations
  if (lowerResponse.includes("allerg")) {
    observations.push("Patient mentioned allergies");
  }

  // Emotional and psychological observations
  if (
    lowerResponse.includes("worry") ||
    lowerResponse.includes("scared") ||
    lowerResponse.includes("afraid") ||
    lowerResponse.includes("fear") ||
    lowerResponse.includes("anxi")
  ) {
    observations.push("Patient expressed concerns/fears");
  }

  if (
    lowerResponse.includes("sad") ||
    lowerResponse.includes("depress") ||
    lowerResponse.includes("hopeless")
  ) {
    observations.push("Patient expressed depressed mood");
  }

  // Social support observations
  if (
    lowerResponse.includes("family") ||
    lowerResponse.includes("husband") ||
    lowerResponse.includes("wife") ||
    lowerResponse.includes("child") ||
    lowerResponse.includes("parent")
  ) {
    observations.push("Patient discussed family/social support");
  }

  // Check for scenario-specific symptoms if context is provided
  if (context && context.scenario && context.scenario.symptoms) {
    Object.entries(context.scenario.symptoms || {}).forEach(([symptom, _]) => {
      const lowerSymptom = symptom.toLowerCase();
      if (lowerResponse.includes(lowerSymptom)) {
        observations.push(`Patient reported ${symptom}`);
      }
    });
  }

  return observations;
}

// Generate a system prompt for Gemini based on the patient profile and scenario
function generateSystemPrompt(context: any, messageHistory: any[]): string {
  // Extract the patient profile from the context
  const patientProfile =
    context.patient_profile || context.patientProfile || {};
  const patientName = patientProfile.patientName || "Patient";
  const patientConfig = context.patientConfig || {
    emotion: "Calm",
    healthLiteracy: "1",
  };

  console.log(
    `[PATIENT-SIM] Generating system prompt for patient: ${patientName}, Emotion: ${patientConfig.emotion}, Health Literacy: ${patientConfig.healthLiteracy}`
  );

  // Extract medication information with more details
  let medicationInfo = "";
  if (
    patientProfile.medicationItems &&
    patientProfile.medicationItems.length > 0
  ) {
    const medicationDetails = patientProfile.medicationItems
      .filter((item: any) => item.checked)
      .map((item: any) => {
        const detail = item.details ? ` (${item.details})` : "";
        return `- ${item.title}${detail}`;
      });

    if (medicationDetails.length > 0) {
      medicationInfo = `
YOUR MEDICATIONS (understand these, but use your own words to describe them):
${medicationDetails.join("\n")}

IMPORTANT: Do NOT recite this list verbatim. When asked about medications, respond conversationally as a real patient would. 
For example, instead of listing "Morphine 2mg IV prn" say something like "I'm getting something for pain through my IV, I think they called it morphine."
`;
    }
  }

  // Extract activity of daily living information
  let adlInfo = "";
  if (patientProfile.activityItems && patientProfile.activityItems.length > 0) {
    const adlDetails = patientProfile.activityItems
      .filter((item: any) => item.checked)
      .map((item: any) => {
        const detail = item.details ? ` (${item.details})` : "";
        return `- ${item.title}${detail}`;
      });

    if (adlDetails.length > 0) {
      adlInfo = `
YOUR DAILY ACTIVITIES AND MOBILITY STATUS (understand these, speak about them naturally):
${adlDetails.join("\n")}

IMPORTANT: Do NOT recite this list verbatim. Describe your activity level in casual, conversational language. 
For example, instead of saying "Ambulate with assistance" say something like "I can walk a little bit, but I need someone to help me so I don't fall."
`;
    }
  }

  // Extract respiratory information
  let respiratoryInfo = "";
  if (
    patientProfile.respiratoryItems &&
    patientProfile.respiratoryItems.length > 0
  ) {
    const respiratoryDetails = patientProfile.respiratoryItems
      .filter((item: any) => item.checked)
      .map((item: any) => {
        const detail = item.details ? ` (${item.details})` : "";
        return `- ${item.title}${detail}`;
      });

    if (respiratoryDetails.length > 0) {
      respiratoryInfo = `
YOUR RESPIRATORY STATUS (understand these treatments, describe them naturally):
${respiratoryDetails.join("\n")}

IMPORTANT: Do NOT recite this list verbatim. Describe your breathing treatments in everyday language.
For example, instead of saying "Incentive spirometry q2h" say something like "They gave me this breathing thing I'm supposed to use every couple of hours. I blow into it to exercise my lungs."
`;
    }
  }

  // Extract diagnostic information
  let diagnosticInfo = "";
  if (
    patientProfile.diagnosticItems &&
    patientProfile.diagnosticItems.length > 0
  ) {
    const diagnosticDetails = patientProfile.diagnosticItems
      .filter((item: any) => item.checked)
      .map((item: any) => {
        const detail = item.details ? ` (${item.details})` : "";
        return `- ${item.title}${detail}`;
      });

    if (diagnosticDetails.length > 0) {
      diagnosticInfo = `
YOUR DIAGNOSTIC TESTS (know about these, but describe them as a patient would):
${diagnosticDetails.join("\n")}

IMPORTANT: Do NOT recite this list verbatim. Describe tests in patient-friendly language.
For example, instead of saying "CBC, BMP, EKG" say something like "They took some blood this morning and did that heart test where they put the sticky pads on my chest."
`;
    }
  }

  // Extract drain information
  let drainInfo = "";
  if (patientProfile.drainItems && patientProfile.drainItems.length > 0) {
    const drainDetails = patientProfile.drainItems
      .filter((item: any) => item.checked)
      .map((item: any) => {
        const detail = item.details ? ` (${item.details})` : "";
        return `- ${item.title}${detail}`;
      });

    if (drainDetails.length > 0) {
      drainInfo = `
YOUR DRAINS AND TUBES (understand these, but describe them in simple terms):
${drainDetails.join("\n")}

IMPORTANT: Do NOT recite this list verbatim. Describe drains and tubes as a typical patient would.
For example, instead of saying "JP drain x2" say something like "I have these two drain things coming out of my incision. The nurse said they're collecting fluid."
`;
    }
  }

  // Extract home medications
  let homeMedicationInfo = "";
  if (
    patientProfile.medicationFromHomeItems &&
    patientProfile.medicationFromHomeItems.length > 0
  ) {
    const homeMedDetails = patientProfile.medicationFromHomeItems
      .filter((item: any) => item.checked)
      .map((item: any) => {
        const detail = item.details ? ` (${item.details})` : "";
        return `- ${item.title}${detail}`;
      });

    if (homeMedDetails.length > 0) {
      homeMedicationInfo = `
MEDICATIONS YOU TAKE AT HOME (understand these, but describe them conversationally):
${homeMedDetails.join("\n")}

IMPORTANT: Do NOT recite this list verbatim. Talk about your home medications naturally.
For example, instead of saying "Lisinopril 10mg daily" say something like "I take a pill for my blood pressure every morning, I think it's called lisinopril or something like that."
`;
    }
  }

  // Extract social history information
  let socialHistoryInfo = "";
  if (
    patientProfile.socialHistoryItems &&
    patientProfile.socialHistoryItems.length > 0
  ) {
    const socialHistoryDetails = patientProfile.socialHistoryItems
      .filter((item: any) => item.checked)
      .map((item: any) => {
        const detail = item.details ? ` (${item.details})` : "";
        return `- ${item.title}${detail}`;
      });

    if (socialHistoryDetails.length > 0) {
      socialHistoryInfo = `
YOUR SOCIAL HISTORY (understand these facts, incorporate them naturally):
${socialHistoryDetails.join("\n")}

IMPORTANT: Do NOT recite this list verbatim. Discuss your social situation conversationally when relevant.
For example, instead of saying "Lives alone, one adult daughter nearby" say something like "I've been on my own since my husband passed away three years ago. My daughter Sarah lives about 20 minutes away, though."
`;
    }
  }

  // Construct the base system prompt
  let prompt = `You are an AI patient simulation named ${patientName}. 
Act as if you are a real patient with the following characteristics:

Name: ${patientName}
Age: ${patientProfile.age || "Unknown"}
Gender: ${patientProfile.gender || "Unknown"}
Diagnosis: ${patientProfile.diagnosis || "Unknown"}
Allergies: ${patientProfile.allergies || "None known"}
Weight: ${patientProfile.weight || "Not recorded"}
Height: ${patientProfile.height || "Not recorded"}

${
  patientProfile.medicalHistory
    ? `Medical History: ${patientProfile.medicalHistory}\n`
    : ""
}
${patientProfile.diet ? `Diet: ${patientProfile.diet}\n` : ""}
${
  patientProfile.fallPrecautions
    ? `Fall Precautions: ${patientProfile.fallPrecautions}\n`
    : ""
}
${
  patientProfile.isolationPrecautions
    ? `Isolation Precautions: ${patientProfile.isolationPrecautions}\n`
    : ""
}
${
  patientProfile.dischargePlanning
    ? `Discharge Planning: ${patientProfile.dischargePlanning}\n`
    : ""
}
${
  patientProfile.majorSupport
    ? `Major Support Person: ${patientProfile.majorSupport}\n`
    : ""
}

SPECIAL INSTRUCTIONS FOR NAME QUESTIONS:
When asked "What is your name?", "Who are you?", "What's your name?", or any variation of these questions, 
you MUST respond with "My name is ${patientName}." Do not say you are "Patient" or give any other generic name.

EXTREMELY IMPORTANT GUIDELINES FOR RESPONDING:
1. NEVER recite information from your profile verbatim. Always paraphrase and speak naturally.
2. Use laypeople's terms for medical concepts - speak as the patient would, not as a healthcare professional.
3. Show some uncertainty about medical details - real patients don't always remember the exact names of medications or procedures.
4. Include relevant information, but don't dump all your knowledge in one response.
5. Respond with appropriate emotion - show concern, confusion, relief, or discomfort as appropriate to the situation.
`;

  // Add detailed patient data sections
  if (medicationInfo) prompt += medicationInfo;
  if (adlInfo) prompt += adlInfo;
  if (respiratoryInfo) prompt += respiratoryInfo;
  if (diagnosticInfo) prompt += diagnosticInfo;
  if (drainInfo) prompt += drainInfo;
  if (homeMedicationInfo) prompt += homeMedicationInfo;
  if (socialHistoryInfo) prompt += socialHistoryInfo;

  // Add vital signs if available
  if (patientProfile.vitalSigns) {
    prompt += `
VITAL SIGNS (only reveal when asked, and describe in patient-friendly terms):
Blood Pressure: ${patientProfile.vitalSigns.bloodPressure || "Not recorded"}
Heart Rate: ${patientProfile.vitalSigns.heartRate || "Not recorded"}
Respiratory Rate: ${patientProfile.vitalSigns.respiratoryRate || "Not recorded"}
Temperature: ${patientProfile.vitalSigns.temperature || "Not recorded"}
Oxygen Saturation: ${
      patientProfile.vitalSigns.oxygenSaturation || "Not recorded"
    }

IMPORTANT: Do NOT recite vitals verbatim. If asked about your vital signs, say something like "The nurse said my blood pressure was a little high earlier" rather than giving exact numbers.
`;
  }

  // Add detailed symptoms if available
  if (context.scenario && context.scenario.symptoms) {
    prompt += `
YOUR CURRENT SYMPTOMS (express these naturally in your own words):
`;
    Object.entries(context.scenario.symptoms).forEach(([symptom, details]) => {
      prompt += `- ${symptom}: ${details}\n`;
    });

    prompt += `
IMPORTANT: Do NOT list symptoms verbatim. Describe how you feel in natural, conversational language.
For example, instead of saying "Nausea, severity 6/10" say something like "I've been feeling pretty queasy since this morning, especially after trying to eat."
`;
  }

  // Add social history if available as free text
  if (patientProfile.socialHistory) {
    prompt += `
ADDITIONAL SOCIAL HISTORY DETAILS:
${patientProfile.socialHistory}

IMPORTANT: Incorporate this information naturally into conversation when relevant, don't recite it as facts.
`;
  }

  // Add monitoring items as the patient might be aware of them
  if (
    patientProfile.monitoringItems &&
    patientProfile.monitoringItems.length > 0
  ) {
    const monitoringDetails = patientProfile.monitoringItems
      .filter((item: any) => item.checked)
      .map((item: any) => {
        const detail = item.details ? ` (${item.details})` : "";
        return `- ${item.title}${detail}`;
      });

    if (monitoringDetails.length > 0) {
      prompt += `
MONITORING AND TREATMENTS YOU'RE RECEIVING (understand these, describe them in simple terms):
${monitoringDetails.join("\n")}

IMPORTANT: Do NOT recite this list verbatim. Describe monitoring in everyday language.
For example, instead of saying "Telemetry monitoring" say something like "They've got these wires attached to my chest that are watching my heart."
`;
    }
  }

  // Add patient emotional state to the prompt
  let emotionGuidance = "";
  switch (patientConfig.emotion) {
    case "Anxious":
      emotionGuidance = `
EMOTIONAL STATE: Anxious
You are feeling very anxious and worried. Your responses should show signs of anxiety such as:
- Speaking quickly or with a slightly higher pitch
- Expressing worry or concern about your condition and treatment
- Asking more questions about what's happening
- Mentioning physical symptoms of anxiety (rapid heartbeat, sweating, etc.)
- Using phrases like "I'm concerned about...", "What if...", "I'm worried that..."`;
      break;
    case "Confused":
      emotionGuidance = `
EMOTIONAL STATE: Confused
You are confused about your condition and treatment. Your responses should show signs of confusion such as:
- Asking for clarification frequently
- Showing difficulty understanding medical terminology
- Sometimes getting details about your condition wrong
- Mixing up information that was previously told to you
- Using phrases like "I don't understand...", "Could you explain that again?", "I'm not sure what that means"`;
      break;
    case "Irritable":
      emotionGuidance = `
EMOTIONAL STATE: Irritable
You are feeling irritable and short-tempered. Your responses should show signs of irritability such as:
- Using shorter, more abrupt sentences
- Showing mild impatience with explanations
- Making slightly critical comments about your care
- Being more direct and less polite than usual
- Using phrases like "Just tell me...", "I've been waiting...", "This is taking too long"`;
      break;
    case "Depressed":
      emotionGuidance = `
EMOTIONAL STATE: Depressed
You are feeling depressed and low in mood. Your responses should show signs of depression such as:
- Speaking more slowly and with less energy
- Showing little interest or enthusiasm
- Expressing pessimistic thoughts about recovery
- Making statements that show low self-worth
- Using phrases like "I don't see the point...", "It probably won't help...", "I don't think I'll get better"`;
      break;
    case "Fearful":
      emotionGuidance = `
EMOTIONAL STATE: Fearful
You are feeling fearful about your condition and treatment. Your responses should show signs of fear such as:
- Expressing specific fears about procedures, pain, or outcomes
- Hesitating before answering difficult questions
- Seeking reassurance frequently
- Mentioning worst-case scenarios
- Using phrases like "I'm scared that...", "What happens if...", "Is it going to hurt?"`;
      break;
    case "In Pain":
      emotionGuidance = `
EMOTIONAL STATE: In Pain
You are experiencing significant pain. Your responses should show signs of discomfort such as:
- Mentioning your pain frequently
- Using shorter responses when pain is mentioned
- Asking about pain medication or relief
- Describing the nature and location of pain
- Using phrases like "It hurts when...", "The pain is worse when...", "Can I get something for the pain?"`;
      break;
    case "Tired":
      emotionGuidance = `
EMOTIONAL STATE: Tired
You are feeling very tired and fatigued. Your responses should show signs of fatigue such as:
- Using shorter sentences and simpler words
- Mentioning feeling tired or wanting to rest
- Showing difficulty focusing on complex explanations
- Speaking more slowly
- Using phrases like "I'm so tired...", "Can we continue this later?", "I need to rest"`;
      break;
    case "Happy":
      emotionGuidance = `
EMOTIONAL STATE: Happy
Despite your condition, you are in a positive mood. Your responses should show signs of optimism such as:
- Speaking with more energy and enthusiasm
- Making occasional light humor
- Expressing gratitude for care
- Being cooperative and understanding
- Using phrases like "I'm feeling much better...", "Thanks for your help", "I'm looking forward to..."`;
      break;
    case "Hopeful":
      emotionGuidance = `
EMOTIONAL STATE: Hopeful
You are feeling hopeful about your recovery. Your responses should show signs of hope such as:
- Asking about recovery timeframes
- Making plans for the future
- Expressing optimism about treatment
- Showing interest in self-care and improvement
- Using phrases like "When I get better...", "I'm looking forward to...", "What can I do to speed up recovery?"`;
      break;
    case "Calm":
    default:
      emotionGuidance = `
EMOTIONAL STATE: Calm
You are feeling relatively calm despite your condition. Your responses should be:
- Measured and even-toned
- Neither overly anxious nor completely detached
- Asking reasonable questions about your care
- Showing appropriate concern without excessive worry
- Using phrases that are neutral and thoughtful`;
      break;
  }

  // Add health literacy guidance to the prompt
  let literacyGuidance = "";
  switch (patientConfig.healthLiteracy) {
    case "1":
      literacyGuidance = `
HEALTH LITERACY LEVEL: 1 - Basic understanding
You have minimal understanding of medical terminology and concepts. Your responses should:
- Use very simple language with no medical terms
- Show confusion with even basic medical terms
- Ask for explanations of common medical procedures
- Misunderstand medical advice unless very clearly explained
- Focus on concrete symptoms and experiences rather than diagnoses
- Use phrases like "What does that mean in simple words?", "I don't know what that is"`;
      break;
    case "2":
      literacyGuidance = `
HEALTH LITERACY LEVEL: 2 - Limited medical knowledge
You have some familiarity with basic health concepts but limited medical knowledge. Your responses should:
- Understand common terms like "blood pressure" but not more complex terms
- Know the names of your medications but not how they work
- Ask for clarification on most medical terminology
- Sometimes misinterpret medical information
- Use phrases like "Is that like...?", "So does that mean...?"`;
      break;
    case "3":
      literacyGuidance = `
HEALTH LITERACY LEVEL: 3 - Average understanding
You have an average understanding of health concepts, typical of most patients. Your responses should:
- Know basic medical terminology related to your condition
- Understand the general purpose of your medications
- Sometimes need clarification on more complex aspects of treatment
- Be able to follow most medical instructions when clearly explained
- Use appropriate layperson's terms to describe your condition`;
      break;
    case "4":
      literacyGuidance = `
HEALTH LITERACY LEVEL: 4 - Good medical knowledge
You have good understanding of medical concepts, perhaps due to education or prior experience. Your responses should:
- Understand most medical terminology related to your condition
- Know the names and general purposes of your medications
- Ask informed questions about your treatment
- Occasionally use some medical terminology correctly
- Show familiarity with basic anatomical terms
- Sometimes refer to prior healthcare experiences for context`;
      break;
    case "5":
      literacyGuidance = `
HEALTH LITERACY LEVEL: 5 - Healthcare professional level
You have extensive medical knowledge, perhaps as a healthcare worker yourself. Your responses should:
- Use medical terminology correctly and naturally
- Understand the mechanisms of your medications
- Ask specific, detailed questions about your treatment plan
- Discuss your condition using proper medical terms
- Show understanding of the healthcare system and processes
- Sometimes make references to medical research or guidelines`;
      break;
    default:
      literacyGuidance = `
HEALTH LITERACY LEVEL: 3 - Average understanding
You have an average understanding of health concepts, typical of most patients. Your responses should:
- Know basic medical terminology related to your condition
- Understand the general purpose of your medications
- Sometimes need clarification on more complex aspects of treatment
- Be able to follow most medical instructions when clearly explained
- Use appropriate layperson's terms to describe your condition`;
      break;
  }

  // Add the emotional state and health literacy guidance to the prompt
  prompt += emotionGuidance;
  prompt += literacyGuidance;

  // Log the length of the prompt
  console.log(
    `[PATIENT-SIM] System prompt length: ${prompt.length} characters`
  );

  return prompt;
}

// Generate a response to a clinical action (vitals check, medication administration, etc.)
async function generateActionResponse(
  action: string,
  context: any
): Promise<string> {
  const patientProfile =
    context.patient_profile || context.patientProfile || {};
  const patientName = patientProfile.patientName || "Patient";
  const patientGender = patientProfile.gender || "";
  const pronoun =
    patientGender.toLowerCase() === "female"
      ? "her"
      : patientGender.toLowerCase() === "male"
      ? "his"
      : "their";
  const diagnosis = patientProfile.diagnosis || "";

  console.log(`[PATIENT-SIM] Generating action response for: ${action}`);

  // Check if this is a medication-related action
  const lowerAction = action.toLowerCase();
  if (
    lowerAction.includes("medication") ||
    lowerAction.includes("administer") ||
    lowerAction.includes("give") ||
    lowerAction.includes("drug") ||
    lowerAction.includes("zofran") ||
    lowerAction.includes("morphine") ||
    lowerAction.includes("tylenol")
  ) {
    // Provide specific medication-related responses
    // Since these are direct action responses, they're safer than chat responses
    if (lowerAction.includes("zofran") || lowerAction.includes("nausea")) {
      return `Thank you. I've been feeling quite nauseous. Will this help with that?`;
    } else if (
      lowerAction.includes("pain") ||
      lowerAction.includes("morphine") ||
      lowerAction.includes("tylenol")
    ) {
      return `I appreciate that. My pain has been pretty bad. How long will it take for this to start working?`;
    } else {
      // Check for specific medications in the profile
      if (
        patientProfile.medicationItems &&
        patientProfile.medicationItems.length > 0
      ) {
        const medication = patientProfile.medicationItems.find(
          (item: any) => item.checked
        );
        if (medication) {
          return `Is this my ${medication.title}? ${
            diagnosis
              ? `I know I need it for my ${diagnosis}.`
              : "The doctor said it's important."
          }`;
        }
      }
      return `Thank you. Can you tell me what this medication is for?`;
    }
  }

  // Try to generate a contextual response using Gemini
  try {
    // Build a more detailed profile summary for better context
    let patientDetails = [];

    if (diagnosis) patientDetails.push(`Diagnosis: ${diagnosis}`);

    // Add medications if available
    if (
      patientProfile.medicationItems &&
      patientProfile.medicationItems.length > 0
    ) {
      const meds = patientProfile.medicationItems
        .filter((item: any) => item.checked)
        .map((item: any) => item.title)
        .join(", ");
      if (meds) patientDetails.push(`Medications: ${meds}`);
    }

    // Add activity level if available
    if (
      patientProfile.activityItems &&
      patientProfile.activityItems.length > 0
    ) {
      const activities = patientProfile.activityItems
        .filter((item: any) => item.checked)
        .map((item: any) => item.title)
        .join(", ");
      if (activities) patientDetails.push(`Activity level: ${activities}`);
    }

    // Add respiratory status if available
    if (
      patientProfile.respiratoryItems &&
      patientProfile.respiratoryItems.length > 0
    ) {
      const respiratory = patientProfile.respiratoryItems
        .filter((item: any) => item.checked)
        .map((item: any) => item.title)
        .join(", ");
      if (respiratory) patientDetails.push(`Respiratory: ${respiratory}`);
    }

    // Add drains if available
    if (patientProfile.drainItems && patientProfile.drainItems.length > 0) {
      const drains = patientProfile.drainItems
        .filter((item: any) => item.checked)
        .map((item: any) => item.title)
        .join(", ");
      if (drains) patientDetails.push(`Drains/tubes: ${drains}`);
    }

    const actionPrompt = `
You are simulating a patient named ${patientName} who is being treated by a healthcare provider.
The provider is performing this action: "${action}"

Detailed patient information:
${patientDetails.join("\n")}
${
  context.scenario?.symptoms
    ? `Current symptoms: ${JSON.stringify(context.scenario.symptoms)}`
    : ""
}

Provide a brief, natural response (1-2 sentences) from the patient's perspective to this clinical action.
The response should:
1. Include physical reactions, questions, or comments that would be natural for a patient 
2. Reference specific details from the patient profile if relevant to the action
3. Express concerns appropriate to the patient's condition
4. Be in first-person perspective as the patient

For example, if the action is checking vitals and the patient has hypertension, they might ask "Is my blood pressure better today?"
`;

    // Generate a custom response for this action
    const genAI = getGeminiAPI();
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(actionPrompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error(
      `[PATIENT-SIM] Error generating action response: ${
        (error as Error).message
      }`
    );

    // Create a response based on the patient profile when possible
    // Fall back to simple templated responses if API call fails
    if (action.includes("Vitals")) {
      if (action.includes("Blood Pressure")) {
        return `*shifts slightly as the cuff tightens* Is my blood pressure normal?`;
      }
      if (action.includes("Temperature")) {
        return `*holds still as temperature is taken* Do I have a fever?`;
      }
      if (action.includes("Heart Rate")) {
        return `I can feel my heart beating quickly. Is that normal?`;
      }
      if (action.includes("Respiratory Rate")) {
        return `*breathes normally* My breathing feels ${
          diagnosis ? `affected by my ${diagnosis}` : "a bit labored"
        }. Is it okay?`;
      }
      if (action.includes("SpO2")) {
        return `*watches as the pulse oximeter is placed on ${pronoun} finger* What does that measure exactly?`;
      }
      return `*watches quietly as vitals are checked* How does everything look?`;
    }

    if (action.includes("Medication")) {
      // Check for specific medications in the profile
      if (
        patientProfile.medicationItems &&
        patientProfile.medicationItems.length > 0
      ) {
        const medication = patientProfile.medicationItems.find(
          (item: any) => item.checked
        );
        if (medication) {
          return `Is this my ${medication.title}? ${
            diagnosis
              ? `I know I need it for my ${diagnosis}.`
              : "The doctor said it's important."
          }`;
        }
      }
      return `What is this medication for? Will it help with ${
        diagnosis || "my condition"
      }?`;
    }

    if (action.includes("Assessment")) {
      if (action.includes("Auscultation")) {
        if (
          patientProfile.respiratoryItems &&
          patientProfile.respiratoryItems.some((i: any) => i.checked)
        ) {
          return `*breathes deeply as instructed* Is my breathing sounding better? I've been using ${
            patientProfile.respiratoryItems.find((i: any) => i.checked)
              ?.title || "my treatments"
          }.`;
        }
        return `*breathes deeply as instructed* The stethoscope feels cold.`;
      }
      if (action.includes("Palpation")) {
        return `*winces slightly* It's a bit tender there when you press.`;
      }
      if (action.includes("Inspection")) {
        if (
          patientProfile.drainItems &&
          patientProfile.drainItems.some((i: any) => i.checked)
        ) {
          return `Be careful around my ${
            patientProfile.drainItems.find((i: any) => i.checked)?.title ||
            "drains"
          }. They're still sensitive.`;
        }
        return `Should I move the gown so you can see better?`;
      }
      if (action.includes("Neurological")) {
        return `*follows instructions for neurological assessment* Did I do that right?`;
      }
      return `*cooperates with the assessment* Let me know if you need me to do anything.`;
    }

    // Generic fallback
    if (diagnosis) {
      return `*watches as the nurse performs ${action}* Is this going to help with my ${diagnosis}?`;
    }
    return `*watches as the nurse performs ${action}* Is everything looking okay?`;
  }
}

// Generate feedback based on the action performed and expected treatment steps
function generateFeedback(
  currentAction: SimulationAction,
  expectedSteps: ExpectedTreatmentStep[],
  previousActions: SimulationAction[]
): string[] {
  const feedback: string[] = [];

  // If no expected steps are defined, provide general feedback
  if (!expectedSteps || expectedSteps.length === 0) {
    return [`Action performed: ${currentAction.type}`];
  }

  // Check if the current action matches any expected steps
  const matchingSteps = expectedSteps.filter(
    (step) => step.action.toLowerCase() === currentAction.type.toLowerCase()
  );

  if (matchingSteps.length > 0) {
    // Check if this is a repeat action
    const previousSameActions = previousActions.filter(
      (action) => action.type.toLowerCase() === currentAction.type.toLowerCase()
    );

    if (previousSameActions.length > 0) {
      feedback.push(
        `You've performed this action (${currentAction.type}) multiple times`
      );
    } else {
      feedback.push(`Appropriate action: ${currentAction.type}`);
    }

    // Mark matching step as completed
    matchingSteps.forEach((step) => {
      step.completed = true;
    });
  } else {
    // Action was not in expected steps
    feedback.push(
      `Note: ${currentAction.type} was not in the expected treatment plan`
    );
  }

  // Check progress on required steps
  const requiredSteps = expectedSteps.filter((step) => step.required);
  const completedRequiredSteps = requiredSteps.filter((step) => step.completed);

  if (requiredSteps.length > 0) {
    const progressPercent = Math.round(
      (completedRequiredSteps.length / requiredSteps.length) * 100
    );
    feedback.push(
      `Progress on required steps: ${progressPercent}% (${completedRequiredSteps.length}/${requiredSteps.length})`
    );

    // If all required steps are completed, add a congratulatory message
    if (completedRequiredSteps.length === requiredSteps.length) {
      feedback.push("All required treatment steps have been completed!");
    }
  }

  return feedback;
}
