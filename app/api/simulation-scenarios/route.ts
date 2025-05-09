import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const supabase = createClient();

    // Get user session to determine which scenarios they can access
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;

    if (id) {
      // Fetch a specific scenario by ID
      const { data, error } = await supabase
        .from("simulation_scenarios")
        .select(
          `
          *,
          patient_profile:patient_profiles(*)
        `
        )
        .eq("id", id)
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Process the patient profile data to match expected format if it exists
      if (data && data.patient_profile) {
        // Transform the profile_data from the database into the expected format in the frontend
        data.patient_profile = {
          ...data.patient_profile.profile_data,
          id: data.patient_profile.id,
          isGlobal: data.patient_profile.is_global,
        };
      }

      // If no detailed_patient_data exists, create it from existing fields for backwards compatibility
      if (data && !data.detailed_patient_data) {
        data.detailed_patient_data = {
          dob: "2/10/XX", // Default value, should be updated in real scenarios
          mrNumber: "PCS21000", // Default value, should be updated in real scenarios
        };
      }

      return NextResponse.json({ scenario: data });
    } else {
      // Fetch all scenarios the user has access to
      const query = supabase.from("simulation_scenarios").select(`
          id,
          title,
          estimated_time_minutes,
          guided_reflection_time_minutes,
          target_group,
          brief_summary,
          created_at,
          updated_at,
          is_global
        `);

      if (userId) {
        // If user is logged in, they can see global and their own scenarios
        query.or(`is_global.eq.true,created_by.eq.${userId}`);
      } else {
        // Anonymous users can only see global scenarios
        query.eq("is_global", true);
      }

      const { data, error } = await query;

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ scenarios: data });
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createClient();

    // Get user session
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const scenarioData = await request.json();

    // Make sure the created_by field is set to the current user
    scenarioData.created_by = userId;

    // Ensure is_global is false for user-created scenarios
    scenarioData.is_global = false;

    const { data, error } = await supabase
      .from("simulation_scenarios")
      .insert(scenarioData)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ scenario: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Missing scenario ID" },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Get user session
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if the user owns this scenario and it's not a global scenario
    const { data: existingScenario, error: fetchError } = await supabase
      .from("simulation_scenarios")
      .select("created_by, is_global")
      .eq("id", id)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!existingScenario) {
      return NextResponse.json(
        { error: "Scenario not found" },
        { status: 404 }
      );
    }

    if (existingScenario.created_by !== userId) {
      return NextResponse.json(
        { error: "You do not have permission to update this scenario" },
        { status: 403 }
      );
    }

    if (existingScenario.is_global) {
      return NextResponse.json(
        { error: "Global scenarios cannot be modified" },
        { status: 403 }
      );
    }

    const scenarioData = await request.json();

    // Prevent changing the created_by and is_global fields
    delete scenarioData.created_by;
    delete scenarioData.is_global;

    const { data, error } = await supabase
      .from("simulation_scenarios")
      .update(scenarioData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ scenario: data });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Missing scenario ID" },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Get user session
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if the user owns this scenario and it's not a global scenario
    const { data: existingScenario, error: fetchError } = await supabase
      .from("simulation_scenarios")
      .select("created_by, is_global")
      .eq("id", id)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!existingScenario) {
      return NextResponse.json(
        { error: "Scenario not found" },
        { status: 404 }
      );
    }

    if (existingScenario.created_by !== userId) {
      return NextResponse.json(
        { error: "You do not have permission to delete this scenario" },
        { status: 403 }
      );
    }

    if (existingScenario.is_global) {
      return NextResponse.json(
        { error: "Global scenarios cannot be deleted" },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from("simulation_scenarios")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
