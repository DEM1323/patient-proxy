import { NextResponse } from "next/server";
import { SimulationScenario } from "@/app/types/simulation";
import { createClient } from "@/utils/supabase/server";
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";

// Response structure
interface AIResponse {
  response: string;
  observations?: string[];
}

// Message structure for Gemini API
interface ChatMessage {
  role: "user" | "model";
  parts: string;
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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, context, messageHistory, isAction } = body;

    // Validate inputs
    if (!message && !isAction) {
      return NextResponse.json(
        { error: "Message or action is required" },
        { status: 400 }
      );
    }

    if (!context || !context.scenarioId) {
      return NextResponse.json(
        { error: "Simulation context is required" },
        { status: 400 }
      );
    }

    // Create a consolidated patient profile that combines all available data
    const patientProfile = context.patientProfile || {};

    // Log the received patient info for debugging
    console.log("Received chat request for patient simulation:", {
      scenarioId: context.scenarioId,
      patientName: patientProfile?.patientName || "Unknown",
      patientId: patientProfile?.id || "None",
      messageHistoryLength: messageHistory?.length || 0,
      isAction: isAction || false,
      hasMedicationItems: !!patientProfile?.medicationItems?.length,
    });

    if (patientProfile?.medicationItems?.length > 0) {
      console.log(
        "Patient medications:",
        patientProfile.medicationItems
          .filter((item: any) => item.checked)
          .map(
            (item: any) =>
              `${item.title}${item.details ? ` (${item.details})` : ""}`
          )
          .join(", ")
      );
    }

    // Build the complete scenario with all available data
    let fullScenario = {
      ...context,
      // Ensure consistent patient_profile field access
      patient_profile: patientProfile,
      // Also maintain patientProfile for backwards compatibility
      patientProfile: patientProfile,
    };

    // Only fetch from database if absolutely necessary (typically we shouldn't need this)
    if (
      (!patientProfile || Object.keys(patientProfile).length === 0) &&
      context.scenarioId
    ) {
      console.log(
        "No patient profile provided in context. Attempting to fetch from database."
      );
      try {
        const supabase = createClient();

        // First try to get the scenario with patient profile ID
        const { data: scenario, error: scenarioError } = await supabase
          .from("simulation_scenarios")
          .select("*, patient_profile_id")
          .eq("id", context.scenarioId)
          .single();

        if (scenarioError) {
          console.error("Error fetching scenario:", scenarioError);
        } else if (scenario && scenario.patient_profile_id) {
          // If we have a patient profile ID, fetch the patient profile
          const { data: patientProfileData, error: profileError } =
            await supabase
              .from("patient_profiles")
              .select("*")
              .eq("id", scenario.patient_profile_id)
              .single();

          if (profileError) {
            console.error("Error fetching patient profile:", profileError);
          } else if (patientProfileData) {
            // Get the complete patient profile data
            let completeProfile = patientProfileData;

            // Check if the profile data is stored in a profile_data field
            if (patientProfileData.profile_data) {
              completeProfile = {
                ...patientProfileData,
                ...patientProfileData.profile_data,
              };
            }

            console.log(
              "Retrieved patient profile from database:",
              completeProfile.patientName ||
                patientProfileData.patientName ||
                "Unnamed"
            );

            // Log medications for debugging if they exist
            if (
              completeProfile.medicationItems &&
              completeProfile.medicationItems.length > 0
            ) {
              console.log(
                "Database patient medications:",
                completeProfile.medicationItems
                  .filter((item: any) => item.checked)
                  .map(
                    (item: any) =>
                      `${item.title}${item.details ? ` (${item.details})` : ""}`
                  )
                  .join(", ")
              );
            }

            // Update the scenario with the database data
            fullScenario = {
              ...scenario,
              patient_profile: completeProfile,
              patientProfile: completeProfile,
            };
          }
        }
      } catch (dbError) {
        console.error("Database error:", dbError);
      }
    }

    // Get patient name for the response metadata
    const finalPatientProfile =
      fullScenario.patient_profile || fullScenario.patientProfile || {};
    const patientName = finalPatientProfile.patientName || "Patient";

    // Check if this is an action response request
    if (isAction) {
      // Generate response to clinical action
      const actionResponse = generateActionResponse(message, fullScenario);

      return NextResponse.json({
        response: actionResponse,
        observations: [],
        senderName: patientName, // Include the patient name to display as sender
      });
    }

    // Regular chat message - continue with existing flow
    // Prepare the system prompt for Gemini
    const systemPrompt = generateSystemPrompt(fullScenario, messageHistory);

    // Format the message history for Gemini if needed
    const formattedHistory: ChatMessage[] = Array.isArray(messageHistory)
      ? messageHistory
      : [];

    try {
      // Get response from Gemini API
      const response = await callGeminiAPI(
        systemPrompt,
        formattedHistory,
        message
      );

      // Check if this is a name-related query that needs special handling
      let finalResponse = response;
      const lowerMessage = message.toLowerCase().trim();

      // Get patient name from the patient profile
      const patientName =
        fullScenario.patient_profile?.patientName ||
        fullScenario.patientProfile?.patientName ||
        "Patient";

      // Log the patient name for verification
      console.log("Using patient name for response:", patientName);

      // Force the patient name for direct name questions
      const isNameQuestion =
        lowerMessage.includes("your name") ||
        lowerMessage.includes("what is your name") ||
        lowerMessage.includes("who are you") ||
        lowerMessage.match(/\bname\b/) ||
        lowerMessage === "hi what is your name" ||
        lowerMessage === "hi what is your name?" ||
        lowerMessage === "what's your name" ||
        lowerMessage === "what's your name?";

      if (isNameQuestion) {
        console.log("Direct name question detected:", message);
        console.log("Original response:", response);

        // For very direct name questions, provide a very direct answer
        if (
          lowerMessage.trim() === "hi what is your name" ||
          lowerMessage.trim() === "hi what is your name?" ||
          lowerMessage.trim() === "what is your name" ||
          lowerMessage.trim() === "what is your name?" ||
          lowerMessage.trim() === "what's your name" ||
          lowerMessage.trim() === "what's your name?"
        ) {
          finalResponse = `My name is ${patientName}.`;
        }
        // For other name-related questions, ensure the name is in the response
        else if (!response.includes(patientName)) {
          finalResponse = `My name is ${patientName}. ${response}`.replace(
            /^(?:I'm|I am|My name is) .+?\. /i,
            ""
          );
        }

        console.log("Modified response:", finalResponse);
      }

      // Extract observations using enhanced function
      const allObservations = extractObservations(finalResponse, fullScenario);

      // Filter out monitoring observations (for backend only)
      const studentObservations = allObservations.filter(
        (obs) => !obs.startsWith("MONITORING:")
      );

      // Add specific observation for name questions
      if (isNameQuestion) {
        studentObservations.push("Patient correctly stated their name");
        allObservations.push(
          "MONITORING: Patient correctly introduced themselves with proper name"
        );
      }

      // Log all observations for backend tracking
      console.log("All observations (including monitoring):", allObservations);
      console.log("Student-facing observations:", studentObservations);

      return NextResponse.json({
        response: finalResponse,
        observations: studentObservations,
        senderName: patientName, // Include the patient name to display as sender
      });
    } catch (apiError) {
      console.error("Error calling Gemini API:", apiError);

      // Fall back to simulated response in case of API error
      const simulatedResponse = simulateGeminiResponse(
        message,
        fullScenario,
        messageHistory
      );

      // Filter simulated observations too if needed
      const studentObservations = simulatedResponse.observations
        ? simulatedResponse.observations.filter(
            (obs) => !obs.startsWith("MONITORING:")
          )
        : [];

      return NextResponse.json({
        response: simulatedResponse.response,
        observations: studentObservations,
        error: "Used fallback response due to API error",
        senderName: patientName, // Include the patient name to display as sender
      });
    }
  } catch (error) {
    console.error("Error in simulation chat API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
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
  console.log("Initializing Gemini API for simulation");
  const genAI = getGeminiAPI();

  // Using Gemini 2.0 Flash-lite model
  console.log("Creating model with gemini-2.0-flash-lite");
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-lite",
  });

  // Format history in the way Gemini expects it
  const formattedHistory = messageHistory.map((msg) => ({
    role: msg.role,
    parts: [{ text: msg.parts }],
  }));

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

  // Combine initial history with the conversation history
  const fullHistory = [...initialHistory, ...formattedHistory];

  console.log("Starting chat with history length:", fullHistory.length);
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

  console.log("Sending message to Gemini:", userMessage);

  // Generate response
  const result = await chat.sendMessage([{ text: userMessage }]);
  const response = await result.response;
  console.log("Received response from Gemini for simulation");
  return response.text();
}

// Enhanced observation extraction using nursing diagnosis and scenario chart
function extractObservations(response: string, scenario: any = null): string[] {
  const observations: string[] = [];
  const lowerResponse = response.toLowerCase();

  // Basic symptom extraction (always performed)
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

  // Extract based on scenario chart if available - FOR SYSTEM MONITORING ONLY
  if (scenario && scenario.scenario_chart) {
    const scenarioChart = scenario.scenario_chart;

    // Track vital sign discussions for simulation monitoring
    if (
      lowerResponse.includes("heart") ||
      lowerResponse.includes("pulse") ||
      lowerResponse.includes("beating")
    ) {
      observations.push("MONITORING: Patient discussed heart rate/pulse");
    }

    if (
      lowerResponse.includes("breath") ||
      lowerResponse.includes("breathing")
    ) {
      observations.push(
        "MONITORING: Patient discussed breathing/respiratory status"
      );
    }

    if (
      lowerResponse.includes("blood pressure") ||
      lowerResponse.includes("bp")
    ) {
      observations.push("MONITORING: Patient mentioned blood pressure");
    }

    if (
      lowerResponse.includes("temperature") ||
      lowerResponse.includes("fever") ||
      lowerResponse.includes("cold")
    ) {
      observations.push("MONITORING: Patient discussed body temperature");
    }

    // Check for mentions of scenario-specific symptoms for system tracking
    if (scenarioChart.symptoms) {
      Object.entries(scenarioChart.symptoms || {}).forEach(([symptom, _]) => {
        const lowerSymptom = symptom.toLowerCase();
        if (lowerResponse.includes(lowerSymptom)) {
          observations.push(`MONITORING: Patient reported ${symptom}`);
        }
      });
    }
  }

  // Track nursing diagnosis relevance for backend system monitoring only
  if (scenario && scenario.nursing_diagnosis) {
    const diagnoses = Array.isArray(scenario.nursing_diagnosis)
      ? scenario.nursing_diagnosis
      : [scenario.nursing_diagnosis];

    diagnoses.forEach((diagnosis: any) => {
      // Check if diagnosis is a string before calling toLowerCase()
      if (typeof diagnosis === "string") {
        const lowerDiagnosis = diagnosis.toLowerCase();

        // Check for keywords related to nursing diagnoses
        if (
          lowerDiagnosis.includes("anxiety") &&
          lowerResponse.includes("anxi")
        ) {
          observations.push(
            "MONITORING: Patient expressed anxiety - relevant to nursing diagnosis"
          );
        }

        if (lowerDiagnosis.includes("pain") && lowerResponse.includes("pain")) {
          observations.push(
            "MONITORING: Patient discussed pain - relevant to nursing diagnosis"
          );
        }

        if (
          lowerDiagnosis.includes("knowledge deficit") &&
          (lowerResponse.includes("understand") ||
            lowerResponse.includes("know") ||
            lowerResponse.includes("confused"))
        ) {
          observations.push(
            "MONITORING: Patient showed signs of knowledge deficit - relevant to nursing diagnosis"
          );
        }

        if (
          lowerDiagnosis.includes("mobility") &&
          (lowerResponse.includes("move") ||
            lowerResponse.includes("walk") ||
            lowerResponse.includes("mobility"))
        ) {
          observations.push(
            "MONITORING: Patient discussed mobility issues - relevant to nursing diagnosis"
          );
        }
      } else if (typeof diagnosis === "object" && diagnosis) {
        // Extract the diagnosis string from the object if possible
        let diagnosisText = "";

        if (diagnosis.diagnosis && typeof diagnosis.diagnosis === "string") {
          diagnosisText = diagnosis.diagnosis.toLowerCase();
        } else if (diagnosis.name && typeof diagnosis.name === "string") {
          diagnosisText = diagnosis.name.toLowerCase();
        } else {
          // If no valid string representation, just log and continue
          console.log(
            "WARNING: Non-string nursing diagnosis encountered:",
            diagnosis
          );
          observations.push(
            "MONITORING: Patient interaction related to nursing diagnosis"
          );
          return;
        }

        // Now check the diagnosis text for keywords
        if (
          diagnosisText.includes("anxiety") &&
          lowerResponse.includes("anxi")
        ) {
          observations.push(
            "MONITORING: Patient expressed anxiety - relevant to nursing diagnosis"
          );
        }

        if (diagnosisText.includes("pain") && lowerResponse.includes("pain")) {
          observations.push(
            "MONITORING: Patient discussed pain - relevant to nursing diagnosis"
          );
        }

        if (
          diagnosisText.includes("nausea") &&
          (lowerResponse.includes("nausea") ||
            lowerResponse.includes("sick") ||
            lowerResponse.includes("vomit"))
        ) {
          observations.push(
            "MONITORING: Patient reported nausea - relevant to nursing diagnosis"
          );
        }

        if (
          diagnosisText.includes("aspiration") &&
          (lowerResponse.includes("chok") ||
            lowerResponse.includes("cough") ||
            lowerResponse.includes("swallow"))
        ) {
          observations.push(
            "MONITORING: Patient showed aspiration risk signs - relevant to nursing diagnosis"
          );
        }
      } else {
        // Handle case where diagnosis is not a string or object
        console.log(
          "WARNING: Invalid nursing diagnosis encountered:",
          diagnosis
        );
        observations.push(
          "MONITORING: Patient interaction related to nursing diagnosis"
        );
      }
    });
  }

  // Additional common observations - filtered to present to student
  const studentObservations: string[] = [];

  if (
    lowerResponse.includes("medication") ||
    lowerResponse.includes("medicine") ||
    lowerResponse.includes("pill")
  ) {
    studentObservations.push("Patient discussed medication");
  }

  if (lowerResponse.includes("allerg")) {
    studentObservations.push("Patient mentioned allergies");
  }

  if (lowerResponse.includes("diagn")) {
    studentObservations.push("Patient discussed diagnosis");
  }

  if (lowerResponse.includes("symptom")) {
    studentObservations.push("Patient described symptoms");
  }

  if (
    lowerResponse.includes("family") ||
    lowerResponse.includes("husband") ||
    lowerResponse.includes("wife") ||
    lowerResponse.includes("child") ||
    lowerResponse.includes("parent")
  ) {
    studentObservations.push("Patient discussed family/social support");
  }

  if (
    lowerResponse.includes("worry") ||
    lowerResponse.includes("scared") ||
    lowerResponse.includes("afraid") ||
    lowerResponse.includes("fear")
  ) {
    studentObservations.push("Patient expressed concerns/fears");
  }

  // Combine monitoring observations (for backend) with student observations (to be shown)
  // In a production system, we would filter these observations appropriately before displaying
  return [...observations, ...studentObservations];
}

// Generate a system prompt for Gemini based on the scenario
function generateSystemPrompt(scenario: any, messageHistory: any[]): string {
  // Determine the patient name from the patient profile
  // We first try to get it from patient_profile, then fall back to patientProfile for backward compatibility
  const patientProfile =
    scenario.patient_profile || scenario.patientProfile || {};
  const patientName = patientProfile.patientName || "Patient";

  console.log("Generating system prompt for patient:", patientName);

  // Extract all medication information to ensure it's properly accessible
  let medicationInfo = "";
  if (
    patientProfile.medicationItems &&
    patientProfile.medicationItems.length > 0
  ) {
    const medications = patientProfile.medicationItems
      .filter((item: any) => item.checked)
      .map(
        (item: any) =>
          `${item.title}${item.details ? ` (${item.details})` : ""}`
      );

    if (medications.length > 0) {
      medicationInfo = `You are currently receiving these medications: ${medications.join(
        ", "
      )}. You should be aware of these when asked about medications.`;
      console.log("Including medication info in prompt:", medicationInfo);
    }
  }

  // Construct the initial system prompt
  let prompt = `You are an AI patient simulation named ${patientName}. 
Act as if you are a real patient with the following characteristics:

Name: ${patientName}
Medical History (Prior): ${scenario.medical_history_prior || "None"}
Medical History (Recent): ${scenario.medical_history_recent || "None"}
Current Symptoms: Based on the patient report in the scenario
${medicationInfo ? `\n${medicationInfo}` : ""}

SPECIAL INSTRUCTIONS FOR NAME QUESTIONS:
When asked "What is your name?", "Who are you?", "What's your name?", or any variation of these questions, 
you MUST respond with "My name is ${patientName}." Do not say you are "Patient" or give any other generic name.

SPECIAL INSTRUCTIONS FOR MEDICATION QUESTIONS:
When asked about your medications, you MUST reference the specific medications listed in your profile if they exist.
If asked about a medication that isn't in your list but seems reasonable for your condition, say you're not sure but it sounds familiar.
`;

  // Add detailed patient profile information
  if (patientProfile) {
    prompt += `
PATIENT PROFILE DETAILS:
Age: ${patientProfile.age || "Unknown"}
Gender: ${patientProfile.gender || "Unknown"}
Diagnosis: ${patientProfile.diagnosis || "Unknown"}
Allergies: ${patientProfile.allergies || "None"}
Weight: ${patientProfile.weight || "Unknown"}
Height: ${patientProfile.height || "Unknown"}
`;

    // If there's a diagnosis, highlight it to ensure the AI stays in character
    if (patientProfile.diagnosis) {
      prompt += `You are suffering from: ${patientProfile.diagnosis}. Refer to this when discussing your condition.\n\n`;
    }

    // Add detailed chart information from various profile sections
    prompt += "DETAILED CHART INFORMATION:\n";

    // Add monitoring items (vital signs, etc.)
    if (
      patientProfile.monitoringItems &&
      patientProfile.monitoringItems.length > 0
    ) {
      prompt += "\nMonitoring Information:\n";
      patientProfile.monitoringItems
        .filter((item: any) => item.checked)
        .forEach((item: any) => {
          prompt += `- ${item.title}${
            item.details ? ` (${item.details})` : ""
          }\n`;
        });
    }

    // Add medication information with extra emphasis
    if (
      patientProfile.medicationItems &&
      patientProfile.medicationItems.length > 0
    ) {
      prompt +=
        "\nCurrent Medications (IMPORTANT - KNOW THESE DETAILS WHEN ASKED):\n";
      patientProfile.medicationItems
        .filter((item: any) => item.checked)
        .forEach((item: any) => {
          prompt += `- ${item.title}${
            item.details ? ` (${item.details})` : ""
          }\n`;
        });
    }

    // Add respiratory items
    if (
      patientProfile.respiratoryItems &&
      patientProfile.respiratoryItems.length > 0
    ) {
      prompt += "\nRespiratory Status:\n";
      patientProfile.respiratoryItems
        .filter((item: any) => item.checked)
        .forEach((item: any) => {
          prompt += `- ${item.title}${
            item.details ? ` (${item.details})` : ""
          }\n`;
        });
    }

    // Add diagnostic items
    if (
      patientProfile.diagnosticItems &&
      patientProfile.diagnosticItems.length > 0
    ) {
      prompt += "\nDiagnostic Tests:\n";
      patientProfile.diagnosticItems
        .filter((item: any) => item.checked)
        .forEach((item: any) => {
          prompt += `- ${item.title}${
            item.details ? ` (${item.details})` : ""
          }\n`;
        });
    }

    // Add social history items
    if (
      patientProfile.socialHistoryItems &&
      patientProfile.socialHistoryItems.length > 0
    ) {
      prompt += "\nSocial History:\n";
      patientProfile.socialHistoryItems
        .filter((item: any) => item.checked)
        .forEach((item: any) => {
          prompt += `- ${item.title}${
            item.details ? ` (${item.details})` : ""
          }\n`;
        });
    }

    // Add activity items
    if (
      patientProfile.activityItems &&
      patientProfile.activityItems.length > 0
    ) {
      prompt += "\nActivity Status:\n";
      patientProfile.activityItems
        .filter((item: any) => item.checked)
        .forEach((item: any) => {
          prompt += `- ${item.title}${
            item.details ? ` (${item.details})` : ""
          }\n`;
        });
    }

    // Add drain items
    if (patientProfile.drainItems && patientProfile.drainItems.length > 0) {
      prompt += "\nDrains and Tubes:\n";
      patientProfile.drainItems
        .filter((item: any) => item.checked)
        .forEach((item: any) => {
          prompt += `- ${item.title}${
            item.details ? ` (${item.details})` : ""
          }\n`;
        });
    }

    // Add home medications if available
    if (
      patientProfile.medicationFromHomeItems &&
      patientProfile.medicationFromHomeItems.length > 0
    ) {
      prompt += "\nHome Medications:\n";
      patientProfile.medicationFromHomeItems
        .filter((item: any) => item.checked)
        .forEach((item: any) => {
          prompt += `- ${item.title}${
            item.details ? ` (${item.details})` : ""
          }\n`;
        });
    }

    // Add additional patient profile details that might be relevant
    if (patientProfile.diet) {
      prompt += `\nDiet: ${patientProfile.diet}\n`;
    }

    if (patientProfile.fallPrecautions) {
      prompt += `Fall Precautions: ${patientProfile.fallPrecautions}\n`;
    }

    if (patientProfile.isolationPrecautions) {
      prompt += `Isolation Precautions: ${patientProfile.isolationPrecautions}\n`;
    }

    if (patientProfile.dischargePlanning) {
      prompt += `Discharge Planning: ${patientProfile.dischargePlanning}\n`;
    }
  }

  // Add nursing diagnosis information if available - INTERNAL USE ONLY, NOT TO BE PRESENTED TO STUDENTS
  if (scenario && scenario.nursing_diagnosis) {
    const diagnoses = Array.isArray(scenario.nursing_diagnosis)
      ? scenario.nursing_diagnosis
      : [scenario.nursing_diagnosis];

    prompt += "\n[INTERNAL - DO NOT REVEAL TO STUDENTS] Nursing Diagnoses:\n";
    diagnoses.forEach((diagnosis: any) => {
      // Check if diagnosis is a string or has a string representation
      if (diagnosis) {
        let diagnosisText = "";

        if (typeof diagnosis === "string") {
          diagnosisText = diagnosis;
        } else if (typeof diagnosis === "object") {
          if (diagnosis.diagnosis) {
            // Extract the diagnosis field if it exists
            diagnosisText = diagnosis.diagnosis;
          } else if (diagnosis.name) {
            diagnosisText = diagnosis.name;
          } else {
            diagnosisText = JSON.stringify(diagnosis);
          }
        }

        prompt += `- ${diagnosisText}\n`;
      }
    });

    // Add guidance on how to incorporate diagnoses without explicitly mentioning them
    prompt +=
      "\nAs the patient, exhibit symptoms and behaviors consistent with these nursing diagnoses without directly stating them. Allow the student to discover and identify these conditions through their assessment.\n";
  }

  // Add scenario chart details if available - INTERNAL USE ONLY, NOT TO BE PRESENTED TO STUDENTS
  if (scenario.scenario_chart) {
    const chart = scenario.scenario_chart;

    prompt += "\n[INTERNAL - DO NOT REVEAL TO STUDENTS] Clinical Status:\n";

    // Add vital signs if available
    if (chart.vital_signs) {
      prompt += "Vital Signs (only reveal when specifically asked):\n";
      Object.entries(chart.vital_signs || {}).forEach(([key, value]) => {
        prompt += `- ${key}: ${value}\n`;
      });
    }

    // Add symptoms if available
    if (chart.symptoms) {
      prompt +=
        "\nSymptoms (only reveal when asked relevant assessment questions):\n";
      Object.entries(chart.symptoms || {}).forEach(([symptom, details]) => {
        prompt += `- ${symptom}: ${details}\n`;
      });
    }

    // Add lab results if available
    if (chart.lab_results) {
      prompt += "\nLab Results (only mention if specifically asked):\n";
      Object.entries(chart.lab_results || {}).forEach(([test, result]) => {
        prompt += `- ${test}: ${result}\n`;
      });
    }
  }

  // Add special AI prompts if available
  if (scenario.ai_patient_prompts && scenario.ai_patient_prompts.length > 0) {
    prompt += "\nSpecial response instructions:\n";
    scenario.ai_patient_prompts.forEach((aiPrompt: any) => {
      prompt += `- When asked about ${aiPrompt.trigger}, respond with: ${aiPrompt.response}\n`;
    });
  }

  // General instructions
  prompt += `
IMPORTANT INSTRUCTIONS:
1. Stay in character as ${patientName} at all times.
2. Respond to medical questions based on ALL the profile details provided above.
3. If asked something not in your background, create a reasonable response consistent with your medical condition.
4. Show appropriate emotional responses (anxiety, pain, confusion) based on your condition.
5. Do not break character to provide medical advice or commentary.
6. Keep responses conversational and natural, as a real patient would speak.
7. Respond in first person and use "I" statements.
8. If the provider asks your name, introduce yourself as ${patientName}, but don't unnecessarily mention your full name in every response.
9. NEVER directly state nursing diagnoses to students - let them identify these through assessment.
10. Only reveal vital signs, lab results, or diagnosis information when specifically asked about them.
11. Reveal information about your symptoms gradually rather than all at once, requiring students to ask appropriate questions.
12. DO NOT reference the fact that you're following internal guidance or that information is for internal use only.
13. Use the detailed patient chart information to inform your responses, especially when asked about your current condition, medications, or treatments.
`;

  // Log the length of the prompt to verify it's not too long
  console.log(`System prompt generated (length: ${prompt.length} characters)`);

  return prompt;
}

// Simulated Gemini response (used as fallback only)
function simulateGeminiResponse(
  message: string,
  context: any,
  messageHistory: any[]
): AIResponse {
  const lowerMessage = message.toLowerCase();

  // Get patient name if available from either patient_profile or patientProfile
  const patientProfile =
    context.patient_profile || context.patientProfile || {};
  const patientName = patientProfile.patientName || "Patient";
  console.log("Using patient name in fallback response:", patientName);

  const patientDiagnosis = patientProfile.diagnosis || "Unknown condition";
  const isDoris = patientName.toLowerCase().includes("doris");

  let response = "";
  const observations: string[] = [];

  // Add monitoring observations for backend tracking
  if (context && context.nursing_diagnosis) {
    const diagnoses = Array.isArray(context.nursing_diagnosis)
      ? context.nursing_diagnosis
      : [context.nursing_diagnosis];

    // Add tracking observations for each nursing diagnosis
    diagnoses.forEach((diagnosis: any) => {
      if (diagnosis) {
        const diagnosisText =
          typeof diagnosis === "string"
            ? diagnosis
            : typeof diagnosis === "object" && diagnosis.name
            ? diagnosis.name
            : JSON.stringify(diagnosis);

        observations.push(
          `MONITORING: Patient simulation relevant to nursing diagnosis: ${diagnosisText}`
        );
      }
    });
  }

  // Get patient-specific information from profile for better responses
  const patientAge = patientProfile.age || "unknown age";
  const patientGender = patientProfile.gender || "unknown gender";

  // Extract medication information directly from profile - consistent with main route
  let medicationInfo = "";
  let medicationDetails: string[] = [];

  if (
    patientProfile.medicationItems &&
    patientProfile.medicationItems.length > 0
  ) {
    // Process exactly like the main route
    const medications = patientProfile.medicationItems
      .filter((item: any) => item.checked)
      .map((item: any) => {
        const medText = item.details
          ? `${item.title} (${item.details})`
          : item.title;

        medicationDetails.push(medText);
        return medText;
      });

    medicationInfo = medications.length > 0 ? medications.join(", ") : "";

    console.log("Fallback route: found medications:", medicationInfo);
  } else {
    console.log("Fallback route: no medications found in patient profile");
  }

  // Check if the message is specifically about medications
  const isMedicationQuestion =
    lowerMessage.includes("medication") ||
    lowerMessage.includes("medicine") ||
    lowerMessage.includes("pill") ||
    lowerMessage.includes("drug") ||
    lowerMessage.includes("meds");

  // Get information about patient's activity level
  let activityStatus = "";
  if (patientProfile.activityItems && patientProfile.activityItems.length > 0) {
    const activities = patientProfile.activityItems
      .filter((item: any) => item.checked)
      .map((item: any) => item.title);

    if (activities.length > 0) {
      activityStatus = activities[0]; // Just use the first activity for simplicity
    }
  }

  // Direct name questions for any patient type
  if (
    lowerMessage.includes("name") ||
    lowerMessage.includes("who are you") ||
    lowerMessage.includes("hi what") ||
    lowerMessage.includes("your name")
  ) {
    response = `My name is ${patientName}.`;
    observations.push("Patient correctly stated their name");
    observations.push("MONITORING: Patient orientation to person");
  }
  // Medication questions - handle consistently with main route
  else if (isMedicationQuestion) {
    if (medicationInfo) {
      // If asking about a specific medication
      const specificMedSearch = extractMedicationNameFromQuery(lowerMessage);
      if (specificMedSearch) {
        // Check if the specific medication is in the list
        const matchingMed = medicationDetails.find((med) =>
          med.toLowerCase().includes(specificMedSearch.toLowerCase())
        );

        if (matchingMed) {
          response = `Yes, I'm receiving ${matchingMed}. The doctor prescribed it for my ${patientDiagnosis}.`;
          observations.push(`Patient confirmed receiving ${matchingMed}`);
        } else {
          response = `I don't think I'm receiving ${specificMedSearch}. The medications I know I'm taking are ${medicationInfo}.`;
          observations.push(`Patient denied receiving ${specificMedSearch}`);
        }
      } else {
        // General medication question
        response = `I'm receiving ${medicationInfo}.`;
        observations.push("Patient correctly listed medications");
      }
    } else {
      // Realistic response when no medications are defined
      response =
        "I have an IV in my arm, and I know they're giving me fluids. I also got something for pain, but I'm not sure of all the names.";
      observations.push(
        "Patient provided general information about medications"
      );
    }

    observations.push("MONITORING: Patient discussed medication knowledge");
  }
  // Pain-related questions
  else if (lowerMessage.includes("pain") || lowerMessage.includes("hurt")) {
    // Customize based on diagnosis
    if (patientDiagnosis !== "Unknown condition") {
      response = `Yes, I'm experiencing some pain related to my ${patientDiagnosis}. It's quite uncomfortable.`;
    } else {
      response = "Yes, I'm experiencing some pain. It's quite uncomfortable.";
    }
    observations.push(`Patient reported pain related to ${patientDiagnosis}`);
    observations.push("MONITORING: Patient reported pain");
  }
  // General feeling questions
  else if (
    lowerMessage.includes("how are you") ||
    lowerMessage.includes("feeling")
  ) {
    response =
      "I'm not feeling my best right now. I'm a bit uncomfortable and tired.";
    observations.push("Patient reported discomfort and fatigue");
    observations.push("MONITORING: Patient expressed fatigue");
  }
  // Medical history questions
  else if (
    lowerMessage.includes("history") ||
    lowerMessage.includes("condition")
  ) {
    response = `The doctor diagnosed me with ${patientDiagnosis}. It's been affecting me for some time now.`;
    observations.push(`Patient aware of diagnosis: ${patientDiagnosis}`);
    observations.push("MONITORING: Patient demonstrated diagnosis knowledge");
  }
  // Family questions
  else if (lowerMessage.includes("family") || lowerMessage.includes("home")) {
    if (patientProfile.majorSupport) {
      response = `${patientProfile.majorSupport} has been my main support. They've been really worried about me.`;
    } else {
      response = "I have family at home. They've been worried about me.";
    }
    observations.push("Patient provided family information");
    observations.push("MONITORING: Patient discussed social support system");
  }
  // Activity-related questions
  else if (
    lowerMessage.includes("move") ||
    lowerMessage.includes("walk") ||
    lowerMessage.includes("activity")
  ) {
    if (activityStatus) {
      response = `The doctor said I should ${activityStatus.toLowerCase()}. I'm trying my best but it's not easy.`;
    } else {
      response =
        "I'm supposed to try moving around a bit, but it's not easy with how I'm feeling.";
    }
    observations.push("Patient discussed activity level");
    observations.push("MONITORING: Patient aware of activity recommendations");
  }
  // Symptom questions
  else if (
    lowerMessage.includes("symptoms") ||
    lowerMessage.includes("problem")
  ) {
    response =
      "My symptoms have been getting worse over the past few months. That's why I came in for treatment.";
    observations.push("Patient described progression of symptoms");
    observations.push("MONITORING: Patient described symptom timeline");
  }
  // Generic fallback
  else {
    response =
      "I'm not sure I understand. Could you please clarify that or maybe check how I'm doing?";
    observations.push("Patient expressed confusion about the question");
    observations.push("MONITORING: Patient expressed confusion");
  }

  return {
    response,
    observations,
  };
}

// Helper function to extract medication name from a query
function extractMedicationNameFromQuery(query: string): string | null {
  const lowerQuery = query.toLowerCase();

  // Common medication-related words to exclude
  const commonWords = [
    "medication",
    "medicine",
    "pill",
    "drug",
    "meds",
    "taking",
    "on",
    "any",
    "the",
    "your",
    "my",
    "about",
    "what",
    "have",
    "are",
    "is",
    "do",
    "you",
    "receiving",
    "getting",
  ];

  // Split the query into words
  const words = lowerQuery.split(/\s+/);

  // Look for potential medication names (words not in the common list and longer than 3 chars)
  for (const word of words) {
    if (!commonWords.includes(word) && word.length > 3) {
      return word;
    }
  }

  return null;
}

// Generate response to clinical actions
function generateActionResponse(action: string, scenario: any): string {
  // Get patient profile with comprehensive data
  const patientProfile =
    scenario.patient_profile || scenario.patientProfile || {};
  const patientName = patientProfile.patientName || "Patient";
  const patientGender = patientProfile.gender || "";
  const pronoun =
    patientGender.toLowerCase() === "female"
      ? "her"
      : patientGender.toLowerCase() === "male"
      ? "his"
      : "their";
  const diagnosis = patientProfile.diagnosis || "";

  console.log("Generating action response for:", action);

  // Incorporate patient-specific information from their profile
  let specificResponse = "";

  // Get relevant items from the patient profile based on the action type
  if (action.includes("Vitals")) {
    const monitoringItems = patientProfile.monitoringItems || [];
    const relevantItems = monitoringItems.filter(
      (item: any) =>
        item.checked &&
        (action.includes(item.title) ||
          item.title.includes("vital") ||
          item.title.includes("SpO2") ||
          item.title.includes("Telemetry"))
    );

    if (relevantItems.length > 0) {
      // Patient is aware of this monitoring
      specificResponse = ` I know the doctor ordered ${relevantItems
        .map((i: any) => i.title)
        .join(", ")}.`;
    }
  }

  if (action.includes("Medication")) {
    const medicationItems = patientProfile.medicationItems || [];
    if (
      medicationItems.length > 0 &&
      medicationItems.some((item: any) => item.checked)
    ) {
      specificResponse = ` I've been getting some medications. ${
        diagnosis
          ? `Is this for my ${diagnosis}?`
          : "Is this helping my condition?"
      }`;
    }
  }

  // Common responses based on action type
  if (action.includes("Vitals")) {
    if (action.includes("Blood Pressure")) {
      return `*shifts slightly as the cuff tightens* Is my blood pressure normal?${specificResponse}`;
    }
    if (action.includes("Temperature")) {
      return `*holds still as temperature is taken* Do I have a fever?${specificResponse}`;
    }
    if (action.includes("Heart Rate")) {
      return `My heart feels like it's beating pretty fast.${specificResponse}`;
    }
    if (action.includes("Respiratory Rate")) {
      return `*breathes normally* Is my breathing okay?${specificResponse}`;
    }
    if (action.includes("SpO2")) {
      return `*watches as the pulse oximeter is placed on ${pronoun} finger* What's that measuring exactly?${specificResponse}`;
    }
    return `*watches quietly as vitals are checked* How does everything look?${specificResponse}`;
  }

  if (action.includes("Assessment")) {
    // Check if patient has related items in their chart
    let assessmentContext = "";

    if (patientProfile.respiratoryItems && action.includes("Auscultation")) {
      const respItems = patientProfile.respiratoryItems.filter(
        (item: any) => item.checked
      );
      if (respItems.length > 0) {
        assessmentContext = ` I've been using ${respItems[0].title}.`;
      }
    }

    if (
      patientProfile.drainItems &&
      (action.includes("Inspection") || action.includes("Palpation"))
    ) {
      const drainItems = patientProfile.drainItems.filter(
        (item: any) => item.checked
      );
      if (drainItems.length > 0) {
        assessmentContext = ` Be careful around my ${drainItems[0].title}.`;
      }
    }

    if (action.includes("Auscultation")) {
      return `*breathes deeply as instructed* The stethoscope feels cold.${assessmentContext}`;
    }
    if (action.includes("Palpation")) {
      return `*winces slightly* It's a bit tender there when you press.${assessmentContext}`;
    }
    if (action.includes("Inspection")) {
      return `Should I move the gown so you can see better?${assessmentContext}`;
    }
    if (action.includes("Neurological")) {
      return `*follows instructions for neurological assessment* Did I do that right?${assessmentContext}`;
    }
    return `*cooperates with the assessment* Let me know if you need me to do anything.${assessmentContext}`;
  }

  if (action.includes("Medication")) {
    // Check if patient has medications in their chart
    const medications = patientProfile.medicationItems || [];
    const medicationNames = medications
      .filter((item: any) => item.checked)
      .map((item: any) => item.title)
      .join(", ");

    if (medicationNames) {
      return `Is this one of the medications the doctor ordered? I think they mentioned ${medicationNames}.`;
    }

    return `What is this medication for? Will it help with ${
      diagnosis || "the pain"
    }?`;
  }

  if (action.includes("Documentation")) {
    // Personalized comment based on patient diagnosis or condition
    if (diagnosis) {
      return `*waits quietly while the nurse documents* Are you writing down everything about my ${diagnosis}?`;
    }
    return `*waits quietly while the nurse documents* Are you writing down everything we've discussed?`;
  }

  // Generic response if no specific match
  if (diagnosis) {
    return `*watches as the nurse performs ${action}* Is this going to help with my ${diagnosis}?`;
  }
  return `*watches as the nurse performs ${action}* Is everything looking okay?`;
}
