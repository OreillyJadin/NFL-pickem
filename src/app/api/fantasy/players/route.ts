import { NextRequest, NextResponse } from "next/server";
import { FantasyController } from "@/controllers/FantasyController";
import { FantasyPosition, RosterSlotType } from "@/types/database";

/**
 * GET /api/fantasy/players
 * Get available fantasy players
 * 
 * Query params:
 * - slotType: Filter by roster slot eligibility (QB, RB1, FLEX, etc.)
 * - position: Filter by position (QB, RB, WR, TE, K, DST)
 * - search: Search by player name
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slotType = searchParams.get("slotType") as RosterSlotType | null;
    const position = searchParams.get("position") as FantasyPosition | null;
    const search = searchParams.get("search");

    let players;

    if (slotType) {
      // Get players eligible for a specific slot
      players = await FantasyController.getAvailablePlayers(slotType, search || undefined);
    } else if (position) {
      // Get players by position
      players = await FantasyController.getPlayersByPosition(position);
    } else {
      // Get all playoff players
      players = await FantasyController.getAllPlayers();
    }

    // If search query provided, filter results
    if (search && search.length >= 2 && !slotType) {
      const searchLower = search.toLowerCase();
      players = players.filter(
        (p) =>
          p.name.toLowerCase().includes(searchLower) ||
          p.team.toLowerCase().includes(searchLower)
      );
    }

    return NextResponse.json({ players });
  } catch (error) {
    console.error("Error getting players:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get players" },
      { status: 500 }
    );
  }
}
