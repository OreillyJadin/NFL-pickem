import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { updateSoloPickStatus } from "@/lib/scoring";

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

// Helper function to detect if game data has changed
function hasGameDataChanged(currentGame: any, newData: any): boolean {
  const fieldsToCheck = [
    "home_score",
    "away_score",
    "status",
    "quarter",
    "time_remaining",
    "possession",
    "halftime",
    "tv",
  ];

  for (const field of fieldsToCheck) {
    if (currentGame[field] !== newData[field]) {
      console.log(
        `Game ${currentGame.id}: ${field} changed from ${currentGame[field]} to ${newData[field]}`
      );
      return true;
    }
  }
  return false;
}

// Sync scores for a specific game with smart caching
async function syncGameScore(gameId: string, forceSync: boolean = false) {
  try {
    // Get game data including last_synced timestamp
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

    // Check if we need to sync based on last sync time and game status
    if (!forceSync && game.last_synced) {
      const lastSyncTime = new Date(game.last_synced);
      const now = new Date();
      const timeSinceLastSync = now.getTime() - lastSyncTime.getTime();
      const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds

      // Skip sync if:
      // 1. Game is completed and was synced recently
      // 2. Game is scheduled and was synced in the last 5 minutes
      if (game.status === "completed" && timeSinceLastSync < fiveMinutes) {
        console.log(
          `Game ${gameId} is completed and recently synced, skipping`
        );
        return {
          success: true,
          skipped: true,
          reason: "Recently synced completed game",
        };
      }

      if (game.status === "scheduled" && timeSinceLastSync < fiveMinutes) {
        console.log(
          `Game ${gameId} is scheduled and recently synced, skipping`
        );
        return {
          success: true,
          skipped: true,
          reason: "Recently synced scheduled game",
        };
      }
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
    const timeRemaining = competition.status?.displayClock || null;

    // Extract possession data
    let possession = null;
    if (competition.situation?.possession) {
      const possessionTeamId = competition.situation.possession;
      if (possessionTeamId === homeTeam.team.id) {
        possession = homeTeam.team.abbreviation;
      } else if (possessionTeamId === awayTeam.team.id) {
        possession = awayTeam.team.abbreviation;
      }
    }

    // Detect halftime (quarter 2 with no time remaining)
    const isHalftime =
      quarter === 2 && (!timeRemaining || timeRemaining === "0:00");

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

    // Prepare new data for comparison
    const newGameData = {
      home_score: homeScore,
      away_score: awayScore,
      status: status,
      quarter: quarter,
      time_remaining: timeRemaining,
      possession: possession,
      halftime: isHalftime,
      tv: tvInfo,
    };

    // Check if data has actually changed
    if (!forceSync && !hasGameDataChanged(game, newGameData)) {
      console.log(`Game ${gameId} data unchanged, skipping database update`);
      // Still update last_synced timestamp to avoid repeated API calls
      await supabase
        .from("games")
        .update({ last_synced: new Date().toISOString() })
        .eq("id", gameId);

      return {
        success: true,
        skipped: true,
        reason: "No data changes detected",
      };
    }

    // Update game in database with new data and sync timestamp
    const { error: updateError } = await supabase
      .from("games")
      .update({
        ...newGameData,
        last_synced: new Date().toISOString(),
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

    return { success: true, homeScore, awayScore, status, updated: true };
  } catch (error) {
    console.error(`Error syncing game ${gameId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Sync all games for a specific week and season type with smart caching
async function syncWeekScores(
  week: number,
  seasonType: string,
  season: number = 2025,
  forceSync: boolean = false
) {
  try {
    console.log(
      `Syncing scores for ${seasonType} week ${week} (season ${season}) with smart caching`
    );

    // Get all games for the week including last_synced field
    const { data: games, error: gamesError } = await supabase
      .from("games")
      .select("id, home_team, away_team, espn_id, status, last_synced")
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

    // Filter games that need syncing based on smart caching rules
    const now = new Date();
    const gamesToSync = games.filter((game) => {
      if (forceSync) return true;

      // Always sync games that have never been synced
      if (!game.last_synced) return true;

      const lastSyncTime = new Date(game.last_synced);
      const timeSinceLastSync = now.getTime() - lastSyncTime.getTime();
      const fiveMinutes = 5 * 60 * 1000;
      const thirtyMinutes = 30 * 60 * 1000;

      // Always sync in-progress games (they change frequently)
      if (game.status === "in_progress") return true;

      // Sync completed games if they haven't been synced in the last 30 minutes
      // (in case of score corrections)
      if (game.status === "completed" && timeSinceLastSync > thirtyMinutes)
        return true;

      // Sync scheduled games if they haven't been synced in the last 5 minutes
      if (game.status === "scheduled" && timeSinceLastSync > fiveMinutes)
        return true;

      return false;
    });

    console.log(
      `Found ${games.length} games, ${gamesToSync.length} need syncing`
    );

    if (gamesToSync.length === 0) {
      console.log(`All games for ${seasonType} week ${week} are up to date`);
      return {
        success: true,
        gamesProcessed: games.length,
        skipped: games.length,
        successful: 0,
        failed: 0,
      };
    }

    // Process each game that needs syncing
    const results = [];
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (const game of gamesToSync) {
      const result = await syncGameScore(game.id, forceSync);
      results.push({ gameId: game.id, ...result });

      if (result.success) {
        if (result.skipped) {
          skippedCount++;
        } else {
          successCount++;
        }
      } else {
        errorCount++;
      }

      // Add small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log(
      `Smart sync completed: ${successCount} updated, ${skippedCount} skipped, ${errorCount} failed`
    );

    return {
      success: true,
      gamesProcessed: games.length,
      gamesSynced: gamesToSync.length,
      successful: successCount,
      skipped: skippedCount,
      failed: errorCount,
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

// Main cron job handler
export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Starting automated score sync...");

    const currentWeek = getCurrentWeek();
    const currentSeason = 2025;

    console.log(
      `Syncing scores for week ${currentWeek}, season ${currentSeason}`
    );

    // Sync current week and previous week (in case of late updates)
    const weeksToSync = [currentWeek];
    if (currentWeek > 1) {
      weeksToSync.push(currentWeek - 1);
    }

    const results = {
      timestamp: new Date().toISOString(),
      currentWeek,
      season: currentSeason,
      weeksProcessed: [] as any[],
    };

    // Process each week
    for (const week of weeksToSync) {
      console.log(`Processing week ${week}...`);

      const weekResults = {
        week,
        preseason: await syncWeekScores(
          week,
          "preseason",
          currentSeason,
          false
        ),
        regular: await syncWeekScores(week, "regular", currentSeason, false),
      };

      results.weeksProcessed.push(weekResults);
    }

    // Calculate totals
    const totalGames = results.weeksProcessed.reduce(
      (sum, week) =>
        sum +
        (week.preseason.gamesProcessed || 0) +
        (week.regular.gamesProcessed || 0),
      0
    );
    const totalSuccessful = results.weeksProcessed.reduce(
      (sum, week) =>
        sum + (week.preseason.successful || 0) + (week.regular.successful || 0),
      0
    );
    const totalSkipped = results.weeksProcessed.reduce(
      (sum, week) =>
        sum + (week.preseason.skipped || 0) + (week.regular.skipped || 0),
      0
    );
    const totalFailed = results.weeksProcessed.reduce(
      (sum, week) =>
        sum + (week.preseason.failed || 0) + (week.regular.failed || 0),
      0
    );

    console.log(
      `Smart automated score sync completed: ${totalSuccessful} updated, ${totalSkipped} skipped, ${totalFailed} failed`
    );

    return NextResponse.json({
      success: true,
      message: `Smart score sync completed: ${totalSuccessful} updated, ${totalSkipped} skipped, ${totalFailed} failed`,
      summary: {
        totalGames,
        totalSuccessful,
        totalSkipped,
        totalFailed,
        weeksProcessed: weeksToSync.length,
      },
      results,
    });
  } catch (error) {
    console.error("Cron job error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
