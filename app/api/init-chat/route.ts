import { NextRequest, NextResponse } from "next/server";
import { generatePatientResponse } from "@/app/lib/gemini";
import { createChatSession } from "@/app/lib/chat-sessions";
import { createAuthClient } from "@/app/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("[INIT-CHAT] Authentication error: No token provided");
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Extract token from header
    const authToken = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Create a Supabase client with the provided auth token
    const supabaseAuth = createAuthClient(authToken);

    // Verify the auth token is valid by checking user
    const { data: userData, error: userError } =
      await supabaseAuth.auth.getUser();
    if (userError || !userData.user) {
      console.error(
        `[INIT-CHAT] Invalid authentication: ${
          userError?.message || "No user found"
        }`
      );
      return NextResponse.json(
        { error: "Invalid authentication token" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { patientId } = body;

    if (!patientId) {
      console.error("[INIT-CHAT] Validation error: Missing patientId");
      return NextResponse.json(
        { error: "Missing patientId" },
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Log a single consolidated message at the start of the process
    console.log(
      `[INIT-CHAT] Initializing chat for patient ID: ${patientId} (user: ${userData.user.id})`
    );

    // Get profile directly from Supabase using the auth token
    const { data: profileData, error: profileError } = await supabaseAuth
      .from("patient_profiles")
      .select("*")
      .eq("id", patientId)
      .eq("user_id", userData.user.id)
      .single();

    if (profileError || !profileData) {
      console.error(
        `[INIT-CHAT] Patient profile not found: ${
          profileError?.message || "No data returned"
        }`
      );

      // Try to get profiles directly from Supabase to see if they exist
      const { data: profiles } = await supabaseAuth
        .from("patient_profiles")
        .select("id")
        .eq("user_id", userData.user.id);

      const availableIds = profiles?.map((p) => p.id) || [];

      return NextResponse.json(
        {
          error: "Patient profile not found",
          debugInfo: {
            requestedId: patientId,
            userId: userData.user.id,
            availableIds: availableIds,
          },
        },
        {
          status: 404,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Convert profile data to PatientProfile format
    const patientProfile = {
      ...profileData.profile_data,
      id: profileData.id,
    };

    // Generate an initial greeting
    const greeting = await generatePatientResponse(
      patientProfile,
      [],
      "Please introduce yourself briefly as the patient and ask how the user can help you today. Keep it to 1-2 sentences. Act naturally like regular conversation. Also most people don't introduce themselves using their full name, so don't use your full name in your greeting."
    );

    // Log the initial greeting with the patient name prefix
    const patientName = patientProfile.patientName || "Patient";
    console.log(
      `[SERVER:${patientName}] ${greeting.substring(0, 100)}${
        greeting.length > 100 ? "..." : ""
      }`
    );

    // Create a new chat session in Supabase with the auth token
    const sessionData = await createChatSession(
      patientId,
      patientProfile,
      greeting,
      authToken
    );

    console.log(
      `[INIT-CHAT] Session initialized successfully: ${sessionData.sessionId} for ${patientProfile.patientName}`
    );
    return NextResponse.json(sessionData, {
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error(`[INIT-CHAT] Error: ${(error as Error).message}`);
    return NextResponse.json(
      {
        error: "Failed to initialize chat session",
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
