import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: async (name: string) => {
            const cookieStore = await cookies();
            return cookieStore.get(name)?.value;
          },
          set: async (name: string, value: string, options: CookieOptions) => {
            const cookieStore = await cookies();
            cookieStore.set(name, value, options);
          },
          remove: async (name: string, options: CookieOptions) => {
            const cookieStore = await cookies();
            cookieStore.set(name, "", { ...options, maxAge: 0 });
          },
        },
      }
    );
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Check if this is a password reset
  const type = requestUrl.searchParams.get("type");

  // If it's a password reset, redirect to the reset password page
  if (type === "recovery") {
    return NextResponse.redirect(
      new URL("/auth/reset-password", requestUrl.origin)
    );
  }

  // For normal sign-ins, redirect to profile
  return NextResponse.redirect(new URL("/profile", requestUrl.origin));
}
