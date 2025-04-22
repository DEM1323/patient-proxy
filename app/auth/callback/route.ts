import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ensureSampleProfile } from "@/app/lib/data-migration";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = await createClient();

    // Exchange the code for a session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("Error exchanging code for session:", error);
      return NextResponse.redirect(new URL("/login?error=auth", request.url));
    }

    // Check if the user is new by looking at the created_at and last_sign_in_at timestamps
    if (data?.session?.user) {
      const user = data.session.user;

      // Only proceed if we have both timestamps
      if (user.created_at && user.last_sign_in_at) {
        // Parse dates and get time difference in seconds
        const createdTime = new Date(user.created_at).getTime();
        const signInTime = new Date(user.last_sign_in_at).getTime();
        const timeDifferenceInSeconds =
          Math.abs(signInTime - createdTime) / 1000;

        // If the difference is less than 10 seconds, consider this a new user
        const isNewUser = timeDifferenceInSeconds < 10;

        if (isNewUser) {
          console.log("New user detected, creating sample profile...");

          try {
            // Create a sample profile for the new user
            await ensureSampleProfile();
          } catch (error) {
            console.error("Error creating sample profile:", error);
          }
        }
      }
    }
  }

  // Redirect to the patient profiles page with auth parameter to show success message
  return NextResponse.redirect(
    new URL("/patient-profiles?auth=true", request.url)
  );
}
