import { ensureSampleProfile } from "@/app/lib/data-migration";
import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

/**
 * API endpoint to ensure a user has a sample profile
 * This is useful as a fallback if the sample profile wasn't created during signup
 */
export async function POST(request: NextRequest) {
  // Create a Supabase client for this route handler
  const supabase = createRouteHandlerClient({ cookies });

  try {
    // Check if the user is authenticated
    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session) {
      return NextResponse.json(
        { error: "Unauthorized - user not authenticated" },
        { status: 401 }
      );
    }

    // Ensure the user has a sample profile
    const sampleProfile = await ensureSampleProfile();

    return NextResponse.json({
      success: true,
      created: !!sampleProfile,
      message: sampleProfile
        ? "Sample profile created successfully"
        : "Sample profile already exists",
      profile: sampleProfile,
    });
  } catch (error) {
    console.error("Error ensuring sample profile:", error);
    return NextResponse.json(
      { error: "Failed to ensure sample profile", details: error },
      { status: 500 }
    );
  }
}
