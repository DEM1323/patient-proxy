import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: NextRequest) {
  try {
    // Create supabase server client
    const supabase = createClient();
    
    // Get session from Supabase auth
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.error("No active session found");
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    
    // Get request body
    const body = await request.json();
    console.log("Request body:", body);
    
    // Validate required fields
    if (!body.title || !body.description) {
      return NextResponse.json(
        { error: "Title and description are required" },
        { status: 400 }
      );
    }
    
    // Get user ID from session
    const userId = session.user.id;
    console.log("User ID from session:", userId);
    
    // Insert into Supabase
    const { data, error } = await supabase
      .from("bug_reports")
      .insert([
        {
          user_id: userId,
          title: body.title,
          description: body.description,
          steps_to_reproduce: body.stepsToReproduce || null,
          severity: body.severity || "medium",
          status: "new",
        }
      ])
      .select();
    
    if (error) {
      console.error("Error from Supabase:", error);
      return NextResponse.json(
        { error: `Failed to submit bug report: ${error.message}` },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Unhandled error in bug report API:", error);
    return NextResponse.json(
      { error: `An unexpected error occurred: ${error.message || "Unknown error"}` },
      { status: 500 }
    );
  }
} 