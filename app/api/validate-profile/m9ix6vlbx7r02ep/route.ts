import { NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";

export async function GET() {
  const profileId = "m9ix6vlbx7r02ep";

  try {
    console.log(
      `[VALIDATE-PROFILE] Validating specific profile ID: ${profileId}`
    );

    // 1. Skip authentication check to see if profile exists for any user
    const { data: profileData, error: profileError } = await supabase
      .from("patient_profiles")
      .select("*")
      .eq("id", profileId);

    // 2. Get all profiles to verify database state
    const { data: allProfiles, error: allProfilesError } = await supabase
      .from("patient_profiles")
      .select("id, user_id, created_at, is_sample")
      .limit(10);

    // 3. Check for case sensitivity by doing an ilike search
    const { data: caseSensitiveProfiles } = await supabase
      .from("patient_profiles")
      .select("id, user_id, created_at, is_sample")
      .ilike("id", profileId)
      .limit(10);

    // 4. Get profile count to verify database is not empty
    const { count: totalCount } = await supabase
      .from("patient_profiles")
      .select("*", { count: "exact", head: true });

    if (profileError) {
      console.error(
        `[VALIDATE-PROFILE] Error checking profile: ${profileError.message}`
      );
      return NextResponse.json({
        error: profileError.message,
        status: "error",
        databaseState: {
          totalCount,
          sampleProfiles: allProfiles?.filter((p) => p.is_sample) || [],
        },
      });
    }

    // Check if we found the profile
    if (!profileData || profileData.length === 0) {
      console.log(`[VALIDATE-PROFILE] Profile not found: ${profileId}`);

      // Let's check if there's a similar ID that might have been mistyped
      const { data: similarProfiles } = await supabase
        .from("patient_profiles")
        .select("id")
        .ilike("id", `${profileId.substring(0, 3)}%`)
        .limit(5);

      return NextResponse.json({
        found: false,
        id: profileId,
        message: "Profile not found in database",
        similarIds: similarProfiles?.map((p) => p.id) || [],
        databaseState: {
          totalProfiles: totalCount,
          profileSample: allProfiles?.slice(0, 5) || [],
          caseSensitiveMatches: caseSensitiveProfiles || [],
          allProfileIds: allProfiles?.map((p) => p.id) || [],
        },
      });
    }

    // Profile found - return details without sensitive info
    console.log(`[VALIDATE-PROFILE] Profile found: ${profileId}`);
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
    console.error("[VALIDATE-PROFILE] Error:", error);
    return NextResponse.json(
      {
        error: (error as Error).message,
        status: "error",
      },
      { status: 500 }
    );
  }
}
