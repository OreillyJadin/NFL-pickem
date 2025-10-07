import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { updateSoloPickStatus } from "@/lib/scoring";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Safety net: Find and fix any games with incorrect scoring
async function findAndFixIncorrectScoring() {
  try {
    console.log("🔍 Looking for games with incorrect scoring...");

    // Find all completed games
    const { data: completedGames, error: gamesError } = await supabase
      .from("games")
      .select("id, week, home_team, away_team, home_score, away_score, status")
      .eq("status", "completed")
      .not("home_score", "is", null)
      .not("away_score", "is", null);

    if (gamesError) {
      throw new Error(`Failed to fetch games: ${gamesError.message}`);
    }

    if (!completedGames || completedGames.length === 0) {
      console.log("No completed games found");
      return { gamesChecked: 0, gamesFixed: 0, picksFixed: 0 };
    }

    console.log(`Checking ${completedGames.length} completed games...`);

    let gamesFixed = 0;
    let totalPicksFixed = 0;
    const problemGames: any[] = [];

    // Check each game for incorrect scoring
    for (const game of completedGames) {
      // Skip ties
      if (game.home_score === game.away_score) {
        continue;
      }

      const winner =
        game.home_score > game.away_score ? game.home_team : game.away_team;

      // Find winning picks with 0 points (should be 1+ for non-lock, 2+ for lock)
      const { data: incorrectPicks, error: picksError } = await supabase
        .from("picks")
        .select("id, user_id, picked_team, is_lock, pick_points")
        .eq("game_id", game.id)
        .eq("picked_team", winner)
        .eq("pick_points", 0);

      if (picksError) {
        console.error(`Error checking picks for game ${game.id}:`, picksError);
        continue;
      }

      if (incorrectPicks && incorrectPicks.length > 0) {
        console.log(
          `❌ Found ${incorrectPicks.length} incorrectly scored picks in game ${game.id} (Week ${game.week})`
        );
        problemGames.push({
          gameId: game.id,
          week: game.week,
          matchup: `${game.away_team} @ ${game.home_team}`,
          incorrectPicks: incorrectPicks.length,
        });

        // Fix the scoring for this game
        const result = await updateSoloPickStatus(game.id);
        if (result.success) {
          gamesFixed++;
          totalPicksFixed += incorrectPicks.length;
          console.log(`✅ Fixed scoring for game ${game.id}`);
        } else {
          console.error(`Failed to fix game ${game.id}:`, result.error);
        }
      }
    }

    return {
      gamesChecked: completedGames.length,
      gamesFixed,
      picksFixed: totalPicksFixed,
      problemGames,
    };
  } catch (error) {
    console.error("Error in findAndFixIncorrectScoring:", error);
    throw error;
  }
}

// Main handler for the fix-scoring cron job
export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Starting scoring fix check...");

    const result = await findAndFixIncorrectScoring();

    const message =
      result.gamesFixed > 0
        ? `⚠️ Fixed ${result.picksFixed} picks across ${result.gamesFixed} games`
        : `✅ All ${result.gamesChecked} games have correct scoring`;

    console.log(message);

    return NextResponse.json({
      success: true,
      message,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error) {
    console.error("Fix scoring cron job error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
