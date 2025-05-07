import { NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";

export async function GET() {
  try {
    // Direct query for all profiles
    const { data: allProfiles, error: allError } = await supabase
      .from("patient_profiles")
      .select("id, user_id, is_global, created_at");

    if (allError) {
      return NextResponse.json({
        success: false,
        error: allError.message,
      });
    }

    // Direct query for global profiles
    const { data: globalProfiles, error: globalError } = await supabase
      .from("patient_profiles")
      .select("id, user_id, is_global, profile_data->patientName as name")
      .eq("is_global", true);

    if (globalError) {
      return NextResponse.json({
        success: false,
        error: globalError.message,
      });
    }

    // Check if a specific profile exists (for debugging)
    const debugId = "default-doris-bowman";
    const { data: debugProfileData, error: debugError } = await supabase
      .from("patient_profiles")
      .select("id, user_id, is_global, profile_data->patientName as name")
      .eq("id", debugId)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      all: {
        count: allProfiles.length,
        profiles: allProfiles,
      },
      global: {
        count: globalProfiles.length,
        profiles: globalProfiles,
      },
      debug: {
        id: debugId,
        found: !!debugProfileData,
        profile: debugProfileData || null,
        error: debugError?.message || null,
      },
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: (error as Error).message,
    });
  }
}
