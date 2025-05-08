import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "Patient ID is required" },
      { status: 400 }
    );
  }

  try {
    // Create a Supabase client
    const supabase = createClient();

    // Get user session to check authentication
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;

    // Prepare the query
    const query = supabase.from("patient_profiles").select("*").eq("id", id);

    // If user is authenticated, they can access their own profiles and global ones
    if (userId) {
      // Allow access to own profiles and global ones
      query.or(`user_id.eq.${userId},is_global.eq.true`);
    } else {
      // Anonymous users can only access global profiles
      query.eq("is_global", true);
    }

    const { data, error } = await query.single();

    if (error) {
      console.error("Error fetching patient profile:", error);
      return NextResponse.json(
        {
          error: "Failed to fetch patient profile",
          details: error.message,
        },
        { status: error.code === "PGRST116" ? 404 : 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        {
          error: "Patient profile not found",
        },
        { status: 404 }
      );
    }

    // Parse the patient profile data
    const patientProfile = {
      ...data.profile_data,
      id: data.id,
      isGlobal: data.is_global,
    };

    return NextResponse.json({
      profile: patientProfile,
      success: true,
    });
  } catch (error: any) {
    console.error("Exception fetching patient profile:", error);
    return NextResponse.json(
      {
        error: "Server error while fetching patient profile",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
