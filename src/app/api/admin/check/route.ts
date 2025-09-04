import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ isAdmin: false }, { status: 401 });
    }

    // Extract token from "Bearer <token>"
    const token = authHeader.replace("Bearer ", "");

    // Verify token with Supabase (server-side)
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return NextResponse.json({ isAdmin: false }, { status: 401 });
    }

    // Check if user is admin in database
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ isAdmin: false }, { status: 403 });
    }

    // Log admin check attempt
    await supabase.from("admin_audit_log").insert({
      user_id: user.id,
      action: "admin_check",
      details: { email: user.email, isAdmin: profile.is_admin },
      ip_address: request.ip || "unknown",
    });

    return NextResponse.json({
      isAdmin: profile.is_admin || false,
    });
  } catch (error) {
    console.error("Admin check error:", error);
    return NextResponse.json({ isAdmin: false }, { status: 500 });
  }
}
