import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { FantasyController } from "@/controllers/FantasyController";
import { ScoringFormat } from "@/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * PATCH /api/fantasy/team/format
 * Update user's preferred scoring format
 */
export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { teamId, format } = body;

    if (!teamId || !format) {
      return NextResponse.json(
        { error: "Missing teamId or format" },
        { status: 400 }
      );
    }

    // Validate format
    const validFormats: ScoringFormat[] = ["ppr", "half_ppr", "standard"];
    if (!validFormats.includes(format)) {
      return NextResponse.json(
        { error: "Invalid scoring format" },
        { status: 400 }
      );
    }

    const team = await FantasyController.updateScoringFormat(
      teamId,
      user.id,
      format
    );

    return NextResponse.json({ team });
  } catch (error) {
    console.error("Error updating scoring format:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update format" },
      { status: 500 }
    );
  }
}
