import { NextRequest, NextResponse } from "next/server";
import { syncWeeklyStats, syncPlayoffPlayers } from "@/services/fantasy-sync";

/**
 * GET /api/cron/sync-fantasy
 * Cron job to sync fantasy player stats from ESPN
 * Should run every 5 minutes during playoff games
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "stats";
    const week = parseInt(searchParams.get("week") || "1");
    const season = parseInt(searchParams.get("season") || "2025");

    console.log(`🏈 Fantasy sync started - Action: ${action}, Week: ${week}, Season: ${season}`);

    let result;

    if (action === "players") {
      // Sync player rosters from playoff teams
      result = await syncPlayoffPlayers();
      console.log(`✅ Players sync complete: ${result.playersAdded} players added`);
    } else {
      // Sync player stats for the week
      result = await syncWeeklyStats(week, season);
      console.log(
        `✅ Stats sync complete: ${result.gamesProcessed} games, ${result.playersUpdated} players updated`
      );
    }

    return NextResponse.json({
      success: result.success,
      action,
      week,
      season,
      ...result,
    });
  } catch (error) {
    console.error("❌ Fantasy sync error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Sync failed",
      },
      { status: 500 }
    );
  }
}
