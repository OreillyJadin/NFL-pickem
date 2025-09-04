import { supabase } from "./supabase";

export async function checkAdminAccess(): Promise<boolean> {
  try {
    // Get current session
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return false;
    }

    // Call server-side API to verify admin status
    const response = await fetch("/api/admin/check", {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (!response.ok) {
      return false;
    }

    const { isAdmin } = await response.json();
    return isAdmin;
  } catch (error) {
    console.error("Error checking admin access:", error);
    return false;
  }
}

// NFL API integration
export async function fetchNFLGames(
  season: number,
  week: number,
  seasonType: "preseason" | "regular" = "regular"
) {
  try {
    // Using ESPN API (free, no key required)
    const response = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${season}&week=${week}&seasontype=${
        seasonType === "preseason" ? 1 : 2
      }`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching NFL games:", error);
    throw error;
  }
}

export async function syncNFLGames(
  season: number,
  week: number,
  seasonType: "preseason" | "regular" = "regular"
) {
  try {
    const nflData = await fetchNFLGames(season, week, seasonType);

    if (!nflData.events || nflData.events.length === 0) {
      console.log(`No games found for ${season} Week ${week} (${seasonType})`);
      return { success: false, message: "No games found" };
    }

    const gamesToInsert = nflData.events.map((event: any) => {
      const competition = event.competitions[0];
      const homeTeam = competition.competitors.find(
        (c: any) => c.homeAway === "home"
      );
      const awayTeam = competition.competitors.find(
        (c: any) => c.homeAway === "away"
      );

      // Map ESPN status to our status
      let status = "scheduled";
      if (event.status.type.name === "STATUS_FINAL") {
        status = "completed";
      } else if (event.status.type.name === "STATUS_IN_PROGRESS") {
        status = "in_progress";
      }

      return {
        week: week,
        season: season,
        season_type: seasonType,
        home_team: homeTeam.team.displayName,
        away_team: awayTeam.team.displayName,
        game_time: event.date,
        home_score: homeTeam.score ? parseInt(homeTeam.score) : null,
        away_score: awayTeam.score ? parseInt(awayTeam.score) : null,
        status: status,
        espn_id: event.id,
      };
    });

    // First, delete existing games for this week/season/type to avoid duplicates
    await supabase
      .from("games")
      .delete()
      .eq("week", week)
      .eq("season", season)
      .eq("season_type", seasonType);

    const { data, error } = await supabase.from("games").insert(gamesToInsert);

    if (error) {
      throw error;
    }

    return {
      success: true,
      message: `Synced ${gamesToInsert.length} games for ${season} Week ${week} (${seasonType})`,
      gamesCount: gamesToInsert.length,
    };
  } catch (error) {
    console.error("Error syncing NFL games:", error);
    return {
      success: false,
      message: `Error syncing games: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
}

export async function syncPreseasonGames(season: number = 2025) {
  const results = [];

  for (let week = 1; week <= 3; week++) {
    try {
      const result = await syncNFLGames(season, week, "preseason");
      results.push({ week, ...result });

      // Add delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      results.push({
        week,
        success: false,
        message: `Error syncing week ${week}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      });
    }
  }

  return results;
}

export async function syncRegularSeasonGames(
  season: number = 2025,
  startWeek: number = 1,
  endWeek: number = 8
) {
  const results = [];

  for (let week = startWeek; week <= endWeek; week++) {
    try {
      const result = await syncNFLGames(season, week, "regular");
      results.push({ week, ...result });

      // Add delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      results.push({
        week,
        success: false,
        message: `Error syncing week ${week}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      });
    }
  }

  return results;
}
