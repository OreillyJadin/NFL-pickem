import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role key for server-side operations
);

const ADMIN_EMAIL = "oreillyjadin24@gmail.com";

export async function middleware(request: NextRequest) {
  // Check if accessing admin routes
  if (request.nextUrl.pathname.startsWith("/admin")) {
    // Get the access token from cookies
    const token = request.cookies.get("sb-access-token")?.value;

    if (!token) {
      // No token = not logged in, redirect to home
      return NextResponse.redirect(new URL("/", request.url));
    }

    try {
      // Verify the token with Supabase (server-side verification)
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser(token);

      // Check if user exists, token is valid, AND email matches admin
      if (error || !user || user.email !== ADMIN_EMAIL) {
        // Not you = redirect to dashboard
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    } catch {
      // Any error = redirect to home
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"], // Only protect admin routes
};
