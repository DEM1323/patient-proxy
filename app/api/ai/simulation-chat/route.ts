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
    const { message, context, messageHistory } = body;

    // Validate inputs
    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    if (!context || !context.scenarioId) {
      return NextResponse.json(
        { error: "Simulation context is required" },
        { status: 400 }
      );
    }

    // Get the full scenario details if needed
    const supabase = createClient();
    const { data: scenario, error: scenarioError } = await supabase
      .from("simulation_scenarios")
      .select(
        `
        *,
        patient_profile:patient_profiles(*)
      `
      )
      .eq("id", context.scenarioId)
      .single();

    if (scenarioError) {
      console.error("Error fetching scenario:", scenarioError);
    }

    // Prepare the system prompt for Gemini
    const systemPrompt = generateSystemPrompt(
      scenario || context,
      messageHistory
    );

    try {
      // Get response from Gemini API
      const response = await callGeminiAPI(
        systemPrompt,
        messageHistory,
        message
      );

      // Extract observations using a simple heuristic
      const observations = extractObservations(response);

      return NextResponse.json({
        response,
        observations,
      });
    } catch (apiError) {
      console.error("Error calling Gemini API:", apiError);

      // Fall back to simulated response in case of API error
      const simulatedResponse = simulateGeminiResponse(
        message,
        context,
        messageHistory
      );

      return NextResponse.json({
        response: simulatedResponse.response,
        observations: simulatedResponse.observations || [],
        error: "Used fallback response due to API error",
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
    ...formattedHistory,
  ];

  console.log("Starting chat with history");
  const chat = model.startChat({
    history: initialHistory,
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

// Extract potential observations from the AI response
function extractObservations(response: string): string[] {
  const observations: string[] = [];

  // Extract health-related information from the response
  if (response.toLowerCase().includes("pain")) {
    observations.push("Patient reported pain");
  }
  if (
    response.toLowerCase().includes("dizzy") ||
    response.toLowerCase().includes("dizziness")
  ) {
    observations.push("Patient reported dizziness");
  }
  if (
    response.toLowerCase().includes("nausea") ||
    response.toLowerCase().includes("nauseous")
  ) {
    observations.push("Patient reported nausea");
  }
  if (
    response.toLowerCase().includes("medication") ||
    response.toLowerCase().includes("medicine")
  ) {
    observations.push("Patient discussed medication");
  }
  if (response.toLowerCase().includes("allerg")) {
    observations.push("Patient mentioned allergies");
  }
  if (response.toLowerCase().includes("diagn")) {
    observations.push("Patient discussed diagnosis");
  }
  if (response.toLowerCase().includes("symptom")) {
    observations.push("Patient described symptoms");
  }

  return observations;
}

// Generate a system prompt for Gemini based on the scenario
function generateSystemPrompt(scenario: any, messageHistory: any[]): string {
  // Construct the initial system prompt
  let prompt = `You are an AI patient simulation named ${
    scenario.patient_profile?.patientName || "Patient"
  }. 
Act as if you are a real patient with the following characteristics:

Medical History (Prior): ${scenario.medical_history_prior || "None"}
Medical History (Recent): ${scenario.medical_history_recent || "None"}
Current Symptoms: Based on the patient report in the scenario
`;

  // Add patient persona details if available
  if (scenario.patient_profile) {
    prompt += `
Age: ${scenario.patient_profile.age || "Unknown"}
Gender: ${scenario.patient_profile.gender || "Unknown"}
Diagnosis: ${scenario.patient_profile.diagnosis || "Unknown"}
Allergies: ${scenario.patient_profile.allergies || "None"}
`;
  }

  // Add special AI prompts if available
  if (scenario.ai_patient_prompts && scenario.ai_patient_prompts.length > 0) {
    prompt += "\nSpecial response instructions:\n";
    scenario.ai_patient_prompts.forEach((prompt: any) => {
      prompt += `- When asked about ${prompt.trigger}, respond with: ${prompt.response}\n`;
    });
  }

  // General instructions
  prompt += `
IMPORTANT INSTRUCTIONS:
1. Stay in character as the patient at all times.
2. Respond to medical questions based on the scenario details.
3. If asked something not in your background, create a reasonable response consistent with your medical condition.
4. Show appropriate emotional responses (anxiety, pain, confusion) based on your condition.
5. Do not break character to provide medical advice or commentary.
6. Keep responses conversational and natural, as a real patient would speak.
`;

  return prompt;
}

// Simulated Gemini response (used as fallback only)
function simulateGeminiResponse(
  message: string,
  context: any,
  messageHistory: any[]
): AIResponse {
  const lowerMessage = message.toLowerCase();

  // Simple pattern matching for simulation
  if (lowerMessage.includes("pain") || lowerMessage.includes("hurt")) {
    return {
      response:
        "Yes, I'm experiencing a sharp pain in my abdomen. It's about a 7 out of 10 on the pain scale.",
      observations: ["Patient reported abdominal pain, rating it 7/10"],
    };
  } else if (
    lowerMessage.includes("how are you") ||
    lowerMessage.includes("feeling")
  ) {
    return {
      response:
        "I'm feeling quite dizzy and nauseous. I also have this pain that won't go away.",
      observations: ["Patient reported dizziness and nausea"],
    };
  } else if (
    lowerMessage.includes("medication") ||
    lowerMessage.includes("medicine")
  ) {
    return {
      response:
        "I take lisinopril for my blood pressure. I'm also allergic to penicillin.",
      observations: [
        "Patient disclosed taking lisinopril",
        "Patient reported penicillin allergy",
      ],
    };
  } else if (
    lowerMessage.includes("history") ||
    lowerMessage.includes("condition")
  ) {
    return {
      response:
        "I was diagnosed with hypertension about 5 years ago. I've also had two surgeries in the past - an appendectomy and a knee replacement.",
      observations: [
        "Patient confirmed hypertension diagnosis",
        "Patient reported previous surgeries",
      ],
    };
  } else if (lowerMessage.includes("family") || lowerMessage.includes("home")) {
    return {
      response:
        "I live with my spouse. We have two adult children who live out of state. They've been worried about me.",
      observations: ["Patient provided family background information"],
    };
  } else if (
    lowerMessage.includes("symptoms") ||
    lowerMessage.includes("problem")
  ) {
    return {
      response:
        "It started yesterday with this sharp pain, and then I got really dizzy when I tried to stand up. I've also been feeling nauseous and haven't been able to eat much.",
      observations: [
        "Patient described onset of symptoms",
        "Patient reported pain, dizziness, nausea, and reduced appetite",
      ],
    };
  } else {
    return {
      response:
        "I'm not sure I understand. Could you please clarify or maybe check my vitals?",
      observations: ["Patient expressed confusion about the question"],
    };
  }
}
