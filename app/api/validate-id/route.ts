import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    // Get parameters
    const { searchParams } = new URL(request.url);
    const profileId = searchParams.get("id") || "";

    if (!profileId) {
      return NextResponse.json(
        {
          error: "Missing id parameter",
          status: "error",
        },
        { status: 400 }
      );
    }

    console.log(`[VALIDATE-ID] Validating profile ID: ${profileId}`);

    // 1. Skip authentication check to see if profile exists for any user
    const { data: profileData, error: profileError } = await supabase
      .from("patient_profiles")
      .select("*")
      .eq("id", profileId);

    if (profileError) {
      console.error(
        `[VALIDATE-ID] Error checking profile: ${profileError.message}`
      );
      return NextResponse.json({
        error: profileError.message,
        status: "error",
      });
    }

    // Check if we found the profile
    if (!profileData || profileData.length === 0) {
      console.log(`[VALIDATE-ID] Profile not found: ${profileId}`);

      // Check for case-insensitive matches
      const { data: caseInsensitiveMatches } = await supabase
        .from("patient_profiles")
        .select("id, user_id")
        .ilike("id", profileId);

      // Try a raw SQL query to check the profile ID exactly
      const { data: rawSqlData, error: rawSqlError } = await supabase
        .from("patient_profiles")
        .select("id")
        .filter("id", "eq", profileId);

      return NextResponse.json({
        found: false,
        id: profileId,
        message: "Profile not found with exact ID match",
        caseInsensitiveMatches: caseInsensitiveMatches || [],
        sqlCheck: {
          rawResult: rawSqlData,
          rawError: rawSqlError?.message,
        },
      });
    }

    // Profile found - return success
    console.log(`[VALIDATE-ID] Profile found: ${profileId}`);
    return NextResponse.json({
      found: true,
      id: profileId,
      profile: {
        id: profileData[0].id,
        user_id: profileData[0].user_id,
        created_at: profileData[0].created_at,
        updated_at: profileData[0].updated_at,
        is_sample: profileData[0].is_sample,
      },
    });
  } catch (error) {
    console.error("[VALIDATE-ID] Error:", error);
    return NextResponse.json(
      {
        error: (error as Error).message,
        status: "error",
      },
      { status: 500 }
    );
  }
}
