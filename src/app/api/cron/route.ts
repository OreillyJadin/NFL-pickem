import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { updateSoloPickStatus } from "@/services/scoring";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ESPN API integration for real-time scores
async function fetchESPNGameData(espnId: string) {
  try {
    const response = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard/${espnId}`
    );

    if (!response.ok) {
      throw new Error(`ESPN API error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching ESPN data:", error);
    throw error;
  }
}

// Sync scores for a specific game
async function syncGameScore(gameId: string) {
  try {
    // Get game data
    const { data: game, error: gameError } = await supabase
      .from("games")
      .select("*")
      .eq("id", gameId)
      .single();

    if (gameError || !game) {
      throw new Error("Game not found");
    }

    if (!game.espn_id) {
      console.log(`Game ${gameId} has no ESPN ID, skipping`);
      return { success: false, reason: "No ESPN ID" };
    }

    // Fetch current data from ESPN
    const espnData = await fetchESPNGameData(game.espn_id);

    if (!espnData.competitions || espnData.competitions.length === 0) {
      throw new Error("No competition data from ESPN");
    }

    const competition = espnData.competitions[0];
    const competitors = competition.competitors;

    if (competitors.length !== 2) {
      throw new Error("Expected exactly 2 competitors");
    }

    // Find home and away teams
    const homeTeam = competitors.find((c: any) => c.homeAway === "home");
    const awayTeam = competitors.find((c: any) => c.homeAway === "away");

    if (!homeTeam || !awayTeam) {
      throw new Error("Could not find home/away teams");
    }

    const homeScore = parseInt(homeTeam.score) || 0;
    const awayScore = parseInt(awayTeam.score) || 0;
    const gameStatus = competition.status?.type?.name || "scheduled";
    const quarter = competition.status?.period || null;

    // Extract TV information from broadcasts
    let tvInfo = "TBD";
    if (competition.broadcasts && competition.broadcasts.length > 0) {
      const broadcastNames = competition.broadcasts
        .map((broadcast: any) => broadcast.names?.[0])
        .filter(Boolean);

      if (broadcastNames.length > 0) {
        tvInfo = broadcastNames.join(", ");
      }
    }

    // Map ESPN status to our status
    let status = "scheduled";
    if (gameStatus === "STATUS_FINAL") {
      status = "completed";
    } else if (gameStatus === "STATUS_IN_PROGRESS") {
      status = "in_progress";
    }

    // Update game in database
    const { error: updateError } = await supabase
      .from("games")
      .update({
        home_score: homeScore,
        away_score: awayScore,
        status: status,
        quarter: quarter,
        tv: tvInfo,
        updated_at: new Date().toISOString(),
      })
      .eq("id", gameId);

    if (updateError) {
      throw new Error(`Database update error: ${updateError.message}`);
    }

    console.log(
      `Updated game ${gameId}: ${awayTeam.team.displayName} ${awayScore} - ${homeTeam.team.displayName} ${homeScore} (${status})`
    );

    // Update solo pick/lock status when game status changes to in_progress or completed
    if (status === "in_progress" || status === "completed") {
      await updateSoloPickStatus(gameId);
    }

    return { success: true, homeScore, awayScore, status };
  } catch (error) {
    console.error(`Error syncing game ${gameId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Sync all games for a specific week and season type
async function syncWeekScores(
  week: number,
  seasonType: string,
  season: number = 2025
) {
  try {
    console.log(
      `Syncing scores for ${seasonType} week ${week} (season ${season})`
    );

    // Get all games for the week
    const { data: games, error: gamesError } = await supabase
      .from("games")
      .select("id, home_team, away_team, espn_id, status")
      .eq("week", week)
      .eq("season_type", seasonType)
      .eq("season", season);

    if (gamesError) {
      throw new Error(`Database query error: ${gamesError.message}`);
    }

    if (!games || games.length === 0) {
      console.log(`No games found for ${seasonType} week ${week}`);
      return { success: true, gamesProcessed: 0 };
    }

    console.log(`Found ${games.length} games to sync`);

    // Process each game
    const results = [];
    for (const game of games) {
      const result = await syncGameScore(game.id);
      results.push({ gameId: game.id, ...result });

      // Add small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    console.log(`Sync completed: ${successful} successful, ${failed} failed`);

    return {
      success: true,
      gamesProcessed: games.length,
      successful,
      failed,
      results,
    };
  } catch (error) {
    console.error("Error syncing week scores:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Get current NFL week (simplified logic)
function getCurrentWeek() {
  const now = new Date();
  const seasonStart = new Date("2025-09-04"); // NFL season start
  const daysSinceStart = Math.floor(
    (now.getTime() - seasonStart.getTime()) / (1000 * 60 * 60 * 24)
  );
  const week = Math.floor(daysSinceStart / 7) + 1;
  return Math.max(1, Math.min(18, week)); // Clamp between 1 and 18
}

// Main cron job handler - DISABLED (requires upgraded Vercel account)
export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: false,
    message:
      "Cron jobs disabled - requires upgraded Vercel account. Use dashboard sync button instead.",
  });
}
