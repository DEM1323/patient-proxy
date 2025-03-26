import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // For testing purposes: We're still refreshing the session
  // but we're not enforcing authentication
  await supabase.auth.getSession();

  // Original authentication logic (commented out)
  /*
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Check if the request is for a protected route and the user is not authenticated
  const isProtectedRoute = 
    req.nextUrl.pathname.startsWith("/manage-profiles");
  
  // If accessing a protected route without a session, redirect to login
  if (isProtectedRoute && !session) {
    const redirectUrl = new URL("/login", req.url);
    return NextResponse.redirect(redirectUrl);
  }
  */

  return res;
}

// Still running middleware on auth-related routes for session refresh
// but not enforcing protected routes
export const config = {
  matcher: ["/auth/callback"],
};
