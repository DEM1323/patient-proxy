import { NextRequest, NextResponse } from "next/server";
import { generatePatientResponse, type ChatMessage } from "@/app/lib/gemini";
import { getChatSession, updateChatSession } from "@/app/lib/chat-sessions";
import { getProfile } from "@/app/lib/storage";

export async function POST(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("[CHAT-SESSION] Authentication error: No token provided");
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Extract token from header
    const authToken = authHeader.substring(7); // Remove 'Bearer ' prefix

    const body = await request.json();
    const { sessionId, message } = body;

    if (!sessionId || !message) {
      console.error(
        "[CHAT-SESSION] Validation error: Missing sessionId or message"
      );
      return NextResponse.json(
        { error: "Missing sessionId or message" },
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Get the session from Supabase
    try {
      console.log(
        `[CHAT-SESSION] Processing message for session: ${sessionId}`
      );
      const session = await getChatSession(sessionId, authToken);

      const { patient_profile: patientProfile, history } = session;

      // Add user message to history
      const updatedHistory = [
        ...history,
        {
          role: "user",
          parts: message,
        } as ChatMessage,
      ];

      // Generate response using Gemini
      const aiResponse = await generatePatientResponse(
        patientProfile,
        updatedHistory,
        message
      );

      // Log the AI response with the patient name prefix
      const patientName = patientProfile.patientName || "Patient";
      console.log(
        `[SERVER:${patientName}] ${aiResponse.substring(0, 100)}${
          aiResponse.length > 100 ? "..." : ""
        }`
      );

      // Add AI response to history
      const newHistory = [
        ...updatedHistory,
        {
          role: "model",
          parts: aiResponse,
        } as ChatMessage,
      ];

      // Update session in Supabase
      await updateChatSession(sessionId, newHistory, authToken);

      return NextResponse.json(
        {
          response: aiResponse,
          sessionId,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    } catch (sessionError) {
      console.error(
        `[CHAT-SESSION] Session error: ${(sessionError as Error).message}`
      );
      return NextResponse.json(
        {
          error: "Chat session not found or expired",
          details: (sessionError as Error).message,
        },
        {
          status: 404,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }
  } catch (error) {
    console.error(`[CHAT-SESSION] Error: ${(error as Error).message}`);
    return NextResponse.json(
      {
        error: "Failed to process chat message",
        details: (error as Error).message,
      },
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}
