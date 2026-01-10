import { NextRequest, NextResponse } from "next/server";
import { FantasyController } from "@/controllers/FantasyController";
import { ScoringFormat } from "@/types/database";

/**
 * GET /api/fantasy/leaderboard
 * Get the fantasy leaderboard
 * 
 * Query params:
 * - season: Season year (default: 2025)
 * - format: Scoring format for sorting (ppr, half_ppr, standard) - optional
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const season = parseInt(searchParams.get("season") || "2025");
    const format = searchParams.get("format") as ScoringFormat | null;

    let leaderboard;

    if (format) {
      // Get leaderboard sorted by specific format
      leaderboard = await FantasyController.getLeaderboardByFormat(season, format);
    } else {
      // Get default leaderboard (sorted by PPR)
      leaderboard = await FantasyController.getLeaderboard(season);
    }

    return NextResponse.json({ leaderboard });
  } catch (error) {
    console.error("Error getting leaderboard:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get leaderboard" },
      { status: 500 }
    );
  }
}
