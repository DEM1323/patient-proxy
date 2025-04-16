import { supabase } from "@/app/lib/supabase";

export async function GET() {
  try {
    // Check authentication status by getting the session
    const { data } = await supabase.auth.getSession();
    const isAuthenticated = !!data.session;

    // Return successful response with timestamp
    return Response.json({
      message: "API is working",
      authenticated: isAuthenticated,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("API Error:", error);
    return Response.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
