import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";
import { PatientProfile, ChecklistItem } from "@/app/types/patient";

// Initialize the Google Generative AI with API key
const getGeminiAPI = () => {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;

  if (!apiKey) {
    console.error("Missing GOOGLE_GEMINI_API_KEY environment variable");
    throw new Error("Missing GOOGLE_GEMINI_API_KEY environment variable");
  }

  return new GoogleGenerativeAI(apiKey);
};

export interface ChatMessage {
  role: "user" | "model";
  parts: string;
}

export interface PatientConfigOptions {
  emotion: string;
  healthLiteracy: string;
}

export const generatePatientResponse = async (
  patientProfile: PatientProfile,
  messageHistory: ChatMessage[],
  userMessage: string,
  patientConfig?: PatientConfigOptions
): Promise<string> => {
  try {
    console.log("Initializing Gemini API");
    const genAI = getGeminiAPI();

    // Using the correct model name for Gemini 2.5 Flash
    console.log("Creating model with gemini-2.5-flash");
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    // Get emotion and health literacy from config or use defaults
    const emotion = patientConfig?.emotion || "Calm";
    const healthLiteracy = patientConfig?.healthLiteracy || "3";

    // Prepare system prompt with patient details
    const systemPrompt = `You are acting as a patient named ${
      patientProfile.patientName
    }. 
    You are ${patientProfile.age} years old and identify as ${
      patientProfile.gender
    }.
    Your medical diagnosis is: ${patientProfile.diagnosis}.
    Your current medications include: ${
      patientProfile.medicationItems
        ?.filter((item: ChecklistItem) => item.checked)
        .map(
          (item: ChecklistItem) =>
            `${item.title}${item.details ? ` (${item.details})` : ""}`
        )
        .join(", ") || "None"
    }.
    You have the following allergies: ${patientProfile.allergies || "None"}.
    Your medical history includes: ${
      patientProfile.history || "None relevant history"
    }.
    Current diet: ${patientProfile.diet || "Regular"}.
    
    Current emotional state: ${emotion}
    Health literacy level (1-5, where 1 is low and 5 is high): ${healthLiteracy}
    
    Based on this information, respond as if you are this patient. Be authentic and realistic in your responses,
    incorporating relevant details from your medical profile when appropriate. If asked about something not in
    your profile, respond in a way that's consistent with your diagnosis and demographics.
    
    Express emotions consistent with your current emotional state of ${emotion}.
    
    Adjust your language and medical terminology based on your health literacy level:
    - If level 1-2: Use simple language, avoid medical terms, and express confusion about complex medical concepts.
    - If level 3: Use moderate medical vocabulary, but ask for clarification on complex terms.
    - If level 4-5: Demonstrate understanding of medical terminology and concepts appropriate to your condition.
    
    Keep responses conversational and natural, as if the person is talking to a healthcare provider.
    Don't reveal that you're an AI - stay in character as the patient throughout the conversation.`;

    console.log("Creating chat session");

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
    console.log("Received response from Gemini");
    return response.text();
  } catch (error) {
    console.error("Error generating patient response:", error);
    return "I'm not feeling well enough to respond right now. Can we try again later?";
  }
};
