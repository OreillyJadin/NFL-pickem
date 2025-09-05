import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
      throw new Error("Game has no ESPN ID");
    }

    // Fetch current data from ESPN
    const espnData = await fetchESPNGameData(game.espn_id);

    if (!espnData.competitions || espnData.competitions.length === 0) {
      throw new Error("No competition data from ESPN");
    }

    const competition = espnData.competitions[0];
    const homeTeam = competition.competitors.find(
      (c: any) => c.homeAway === "home"
    );
    const awayTeam = competition.competitors.find(
      (c: any) => c.homeAway === "away"
    );

    // Determine new status
    let newStatus = "scheduled";
    if (espnData.status.type.name === "STATUS_FINAL") {
      newStatus = "completed";
    } else if (espnData.status.type.name === "STATUS_IN_PROGRESS") {
      newStatus = "in_progress";
    }

    // Get scores
    const homeScore = homeTeam.score ? parseInt(homeTeam.score) : null;
    const awayScore = awayTeam.score ? parseInt(awayTeam.score) : null;

    // Update the game
    const { error: updateError } = await supabase
      .from("games")
      .update({
        home_score: homeScore,
        away_score: awayScore,
        status: newStatus,
      })
      .eq("id", gameId);

    if (updateError) {
      throw updateError;
    }

    return {
      success: true,
      message: `Game updated: ${game.home_team} vs ${game.away_team} (${homeScore}-${awayScore})`,
      status: newStatus,
      homeScore,
      awayScore,
    };
  } catch (error) {
    console.error("Error syncing game score:", error);
    return {
      success: false,
      message: `Error: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
}

// Sync all games for a specific week/season
async function syncAllGames(season: number, week: number, seasonType: string) {
  try {
    // Get all games for the specified week
    const { data: games, error: gamesError } = await supabase
      .from("games")
      .select("*")
      .eq("season", season)
      .eq("week", week)
      .eq("season_type", seasonType)
      .not("espn_id", "is", null);

    if (gamesError) {
      throw gamesError;
    }

    const results = [];

    for (const game of games) {
      const result = await syncGameScore(game.id);
      results.push({
        gameId: game.id,
        homeTeam: game.home_team,
        awayTeam: game.away_team,
        ...result,
      });

      // Add delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    return {
      success: true,
      message: `Synced ${games.length} games for ${season} Week ${week} (${seasonType})`,
      results,
    };
  } catch (error) {
    console.error("Error syncing all games:", error);
    return {
      success: false,
      message: `Error: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, gameId, season, week, seasonType } = body;

    // Verify admin access
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "No authorization header" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    let result;

    if (action === "sync_game" && gameId) {
      result = await syncGameScore(gameId);
    } else if (action === "sync_week" && season && week && seasonType) {
      result = await syncAllGames(season, week, seasonType);
    } else {
      return NextResponse.json(
        { error: "Invalid parameters" },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
