import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { FantasyController } from "@/controllers/FantasyController";
import { RosterSlotType } from "@/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * POST /api/fantasy/team/roster
 * Set a player in a roster slot
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
    const { teamId, slotType, playerId } = body;

    if (!teamId || !slotType) {
      return NextResponse.json(
        { error: "Missing teamId or slotType" },
        { status: 400 }
      );
    }

    // Validate slot type
    const validSlots: RosterSlotType[] = [
      "QB", "RB1", "RB2", "WR1", "WR2", "TE", "FLEX", "DST", "K"
    ];
    if (!validSlots.includes(slotType)) {
      return NextResponse.json(
        { error: "Invalid slot type" },
        { status: 400 }
      );
    }

    let team;
    if (playerId) {
      // Set player in slot
      team = await FantasyController.setRosterPlayer(
        teamId,
        user.id,
        slotType,
        playerId
      );
    } else {
      // Remove player from slot
      team = await FantasyController.removeRosterPlayer(
        teamId,
        user.id,
        slotType
      );
    }

    return NextResponse.json({ team });
  } catch (error) {
    console.error("Error updating roster:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update roster" },
      { status: 500 }
    );
  }
}
