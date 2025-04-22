import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { updateSession } from "./utils/supabase/middleware";

export async function middleware(req: NextRequest) {
  return await updateSession(req);
}

// Run middleware on auth-related routes and protected routes
export const config = {
  matcher: [
    "/auth/callback",
    "/patient-profiles/:path*",
    "/patient-interactions/:path*",
    "/manage-profiles/:path*",
    "/api/chat-test",
    "/api/init-chat",
    "/api/chat-session",
    "/api/validate-id",
    "/api/ensure-sample-profile",
  ],
};
