import { supabase } from "./supabase";
import { type ChatMessage } from "./gemini";
import { createClient } from "@supabase/supabase-js";

// Generate a short random session ID
const generateSessionId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

// Create a Supabase client with a specific auth token
const getSupabaseWithAuth = (authToken: string) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    },
  });
};

// Create a new chat session
export const createChatSession = async (
  patientId: string,
  patientProfile: any,
  greeting: string,
  authToken: string
) => {
  // Use Supabase with the provided auth token
  const supabaseAuth = getSupabaseWithAuth(authToken);

  // Get the user ID first
  const { data: userData, error: userError } =
    await supabaseAuth.auth.getUser();

  if (userError || !userData.user) {
    console.error(
      `[CHAT-SESSIONS] Auth error: ${userError?.message || "No user found"}`
    );
    throw new Error(
      `Failed to get user data: ${userError?.message || "User not found"}`
    );
  }

  const userId = userData.user.id;
  const sessionId = generateSessionId();

  // Store the session in Supabase
  const { error } = await supabaseAuth.from("chat_sessions").insert({
    id: sessionId,
    user_id: userId, // Add the user_id from the authenticated user
    patient_id: patientId,
    patient_profile: patientProfile,
    created_at: new Date().toISOString(),
    last_activity: new Date().toISOString(),
    history: JSON.stringify([
      {
        role: "model",
        parts: greeting,
      },
    ]),
  });

  if (error) {
    console.error(`[CHAT-SESSIONS] Error creating session: ${error.message}`);
    throw new Error(`Failed to create chat session: ${error.message}`);
  }

  // Return more patient details for the UI
  return {
    sessionId,
    patientId,
    patientName: patientProfile.patientName,
    patientAge: patientProfile.age,
    patientGender: patientProfile.gender,
    patientDiagnosis: patientProfile.diagnosis,
    fullProfile: patientProfile,
    greeting,
  };
};

// Get a chat session
export const getChatSession = async (sessionId: string, authToken: string) => {
  // Use Supabase with the provided auth token
  const supabaseAuth = getSupabaseWithAuth(authToken);

  // Get the session from Supabase
  const { data, error } = await supabaseAuth
    .from("chat_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (error) {
    console.error(`[CHAT-SESSIONS] Error retrieving session: ${error.message}`);
    throw new Error(`Chat session not found or expired: ${error.message}`);
  }

  // Parse chat history from JSON string
  return {
    ...data,
    history: JSON.parse(data.history || "[]"),
  };
};

// Update a chat session with new messages
export const updateChatSession = async (
  sessionId: string,
  updatedHistory: ChatMessage[],
  authToken: string
) => {
  // Use Supabase with the provided auth token
  const supabaseAuth = getSupabaseWithAuth(authToken);

  // Update the session in Supabase
  const { error } = await supabaseAuth
    .from("chat_sessions")
    .update({
      history: JSON.stringify(updatedHistory),
      last_activity: new Date().toISOString(),
    })
    .eq("id", sessionId);

  if (error) {
    console.error(`[CHAT-SESSIONS] Error updating session: ${error.message}`);
    throw new Error(`Failed to update chat session: ${error.message}`);
  }

  return true;
};
