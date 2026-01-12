import { NextRequest, NextResponse } from "next/server";
import { syncWeeklyStats, syncPlayoffPlayers } from "@/services/fantasy-sync";
import { createClient } from "@supabase/supabase-js";

/**
 * GET /api/cron/sync-fantasy
 * Cron job to sync fantasy player stats from ESPN
 * Can be triggered by: cron secret OR authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // Check authorization - allow cron secret OR authenticated user
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    
    let isAuthorized = false;
    
    // Check for cron secret
    if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
      isAuthorized = true;
    }
    
    // Check for user auth token (for manual button clicks)
    if (!isAuthorized && authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      // Verify it's a valid Supabase user token
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        isAuthorized = true;
      }
    }
    
    // Also allow if no cron secret is configured (local dev)
    if (!cronSecret) {
      isAuthorized = true;
    }
    
    if (!isAuthorized) {
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
