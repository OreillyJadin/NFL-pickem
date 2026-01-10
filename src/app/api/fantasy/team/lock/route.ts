import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { FantasyController } from "@/controllers/FantasyController";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * POST /api/fantasy/team/lock
 * Lock a fantasy team (no more changes allowed)
 */
export async function POST(request: NextRequest) {
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
    const { teamId } = body;

    if (!teamId) {
      return NextResponse.json(
        { error: "Missing teamId" },
        { status: 400 }
      );
    }

    const team = await FantasyController.lockTeam(teamId, user.id);

    return NextResponse.json({
      team,
      message: "Team locked successfully! You can now compete on the leaderboard.",
    });
  } catch (error) {
    console.error("Error locking team:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to lock team" },
      { status: 500 }
    );
  }
}
