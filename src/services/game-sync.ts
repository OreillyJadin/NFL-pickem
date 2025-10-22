import { supabase } from "@/config/supabase";
import { updateSoloPickStatus } from "./scoring";

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
export async function syncGameScore(
  gameId: string,
  forceSync: boolean = false
) {
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
        tvInfo = broadcastNames
          .map((name: string) => (name === "Prime Video" ? "Prime" : name))
          .join(", ");
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

// Sync TV information for all games
export async function syncAllGamesTV() {
  try {
    console.log("🔄 Starting TV sync for all games...");

    // Get all games that have ESPN IDs
    const { data: games, error: gamesError } = await supabase
      .from("games")
      .select("id, home_team, away_team, espn_id, tv")
      .not("espn_id", "is", null);

    if (gamesError) {
      console.error("❌ Database query error:", gamesError);
      throw new Error(`Database query error: ${gamesError.message}`);
    }

    if (!games || games.length === 0) {
      console.log("ℹ️ No games with ESPN IDs found");
      return {
        success: true,
        message: "No games with ESPN IDs found",
        gamesProcessed: 0,
      };
    }

    console.log(`📊 Found ${games.length} games to sync TV info for`);

    let successCount = 0;
    let errorCount = 0;

    // Process each game
    for (const game of games) {
      try {
        const result = await syncGameScore(game.id);
        if (result.success) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch (error) {
        errorCount++;
      }

      // Add small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log(
      `TV sync completed: ${successCount} successful, ${errorCount} failed`
    );

    return {
      success: true,
      message: `Synced TV info for ${successCount} games successfully, ${errorCount} failed`,
      gamesProcessed: games.length,
      successful: successCount,
      failed: errorCount,
    };
  } catch (error) {
    console.error("Error syncing all games TV:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Sync all current games with smart caching
export async function syncAllCurrentGames(forceSync: boolean = false) {
  try {
    console.log("🔄 Starting smart sync of recent games...");

    // Get current date to determine which games to sync
    const now = new Date();
    const threeDaysAgo = new Date(now);
    threeDaysAgo.setDate(now.getDate() - 3);
    threeDaysAgo.setHours(0, 0, 0, 0);

    const oneDayFromNow = new Date(now);
    oneDayFromNow.setDate(now.getDate() + 1);
    oneDayFromNow.setHours(23, 59, 59, 999);

    console.log(
      `📅 Syncing games from ${threeDaysAgo.toDateString()} to ${oneDayFromNow.toDateString()}`
    );

    // Get games from the last 3 days to 1 day ahead that have ESPN IDs
    // Include last_synced field for smart caching
    const { data: games, error: gamesError } = await supabase
      .from("games")
      .select(
        "id, home_team, away_team, espn_id, status, game_time, last_synced"
      )
      .not("espn_id", "is", null)
      .gte("game_time", threeDaysAgo.toISOString())
      .lte("game_time", oneDayFromNow.toISOString());

    if (gamesError) {
      console.error("❌ Database query error:", gamesError);
      throw new Error(`Database query error: ${gamesError.message}`);
    }

    if (!games || games.length === 0) {
      console.log("ℹ️ No recent games found to sync");
      return {
        success: true,
        message: "No recent games found to sync",
        gamesProcessed: 0,
      };
    }

    // Filter games that need syncing based on smart caching rules
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
      `📊 Found ${games.length} recent games, ${gamesToSync.length} need syncing:`,
      gamesToSync.map(
        (g) =>
          `${g.away_team} @ ${g.home_team} (${new Date(
            g.game_time
          ).toLocaleDateString()}) - ${g.status}`
      )
    );

    if (gamesToSync.length === 0) {
      console.log("✅ All games are up to date, no sync needed");
      return {
        success: true,
        message: "All games are up to date, no sync needed",
        gamesProcessed: games.length,
        skipped: games.length,
        successful: 0,
        failed: 0,
      };
    }

    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    // Process each game that needs syncing
    for (const game of gamesToSync) {
      try {
        const result = await syncGameScore(game.id, forceSync);
        if (result.success) {
          if (result.skipped) {
            skippedCount++;
          } else {
            successCount++;
          }
        } else {
          errorCount++;
        }
      } catch (error) {
        errorCount++;
        console.error(`Error processing game ${game.id}:`, error);
      }

      // Add small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    const totalProcessed = successCount + errorCount + skippedCount;
    console.log(
      `Smart sync completed: ${successCount} updated, ${skippedCount} skipped, ${errorCount} failed`
    );

    return {
      success: true,
      message: `Smart sync completed: ${successCount} updated, ${skippedCount} skipped, ${errorCount} failed`,
      gamesProcessed: games.length,
      gamesSynced: gamesToSync.length,
      successful: successCount,
      skipped: skippedCount,
      failed: errorCount,
    };
  } catch (error) {
    console.error("Error syncing all games:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
