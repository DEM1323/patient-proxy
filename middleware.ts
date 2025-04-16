import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // Refresh session if expired - required for Server Components
  await supabase.auth.getSession();

  return res;
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
