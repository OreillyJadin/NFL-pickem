import { supabase } from "./supabase";

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
export async function syncGameScore(gameId: string) {
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
        time_remaining: timeRemaining,
        possession: possession,
        tv: tvInfo,
      })
      .eq("id", gameId);

    if (updateError) {
      throw new Error(`Database update error: ${updateError.message}`);
    }

    console.log(
      `Updated game ${gameId}: ${awayTeam.team.displayName} ${awayScore} - ${homeTeam.team.displayName} ${homeScore} (${status})`
    );

    return { success: true, homeScore, awayScore, status };
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

// Sync all current games
export async function syncAllCurrentGames() {
  try {
    console.log("🔄 Starting sync of recent games...");

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
    const { data: games, error: gamesError } = await supabase
      .from("games")
      .select("id, home_team, away_team, espn_id, status, game_time")
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

    console.log(
      `📊 Found ${games.length} recent games to sync:`,
      games.map(
        (g) =>
          `${g.away_team} @ ${g.home_team} (${new Date(
            g.game_time
          ).toLocaleDateString()})`
      )
    );

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
      `Sync completed: ${successCount} successful, ${errorCount} failed`
    );

    return {
      success: true,
      message: `Synced ${successCount} recent games successfully, ${errorCount} failed`,
      gamesProcessed: games.length,
      successful: successCount,
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
