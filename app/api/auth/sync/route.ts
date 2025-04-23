import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { event, session } = await request.json();

    // Get server-side Supabase client
    const supabase = createClient();
    
    // Get cookies instance and await it
    const cookieStore = await cookies();

    // If session exists, set the access token for server-side Supabase client
    if (session) {
      // Setting the auth cookie for server-side requests
      cookieStore.set("sb-access-token", session.access_token, {
        path: "/",
        maxAge: session.expires_in,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });

      // Set refresh token
      cookieStore.set("sb-refresh-token", session.refresh_token, {
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 days
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });

      console.log(`Auth cookies set for user ${session.user.id}`);
    } else if (event === "SIGNED_OUT") {
      // Clear auth cookies on sign out
      cookieStore.set("sb-access-token", "", {
        path: "/",
        maxAge: 0,
        httpOnly: true,
      });

      cookieStore.set("sb-refresh-token", "", {
        path: "/",
        maxAge: 0,
        httpOnly: true,
      });

      console.log("Auth cookies cleared on sign out");
    }

    return NextResponse.json({
      success: true,
      message: `Auth state synchronized: ${event}`,
    });
  } catch (error) {
    console.error("Error syncing auth cookies:", error);
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
