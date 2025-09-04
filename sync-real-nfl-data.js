// Script to sync real NFL data from ESPN API
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://whvxcoganvbrriqpynre.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indodnhjb2dhbnZicnJpcXB5bnJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4NTUzMDUsImV4cCI6MjA3MjQzMTMwNX0.ACLWT5e3OmsgoWD6mWu33EmhMTznW2IQI9qKYAurlh8";

const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchNFLGames(season, week, seasonType) {
  try {
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

async function syncNFLGames(season, week, seasonType) {
  try {
    console.log(`🔄 Syncing ${season} Week ${week} (${seasonType})...`);

    const nflData = await fetchNFLGames(season, week, seasonType);

    if (!nflData.events || nflData.events.length === 0) {
      console.log(
        `❌ No games found for ${season} Week ${week} (${seasonType})`
      );
      return { success: false, message: "No games found" };
    }

    const gamesToInsert = nflData.events.map((event) => {
      const competition = event.competitions[0];
      const homeTeam = competition.competitors.find(
        (c) => c.homeAway === "home"
      );
      const awayTeam = competition.competitors.find(
        (c) => c.homeAway === "away"
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

    console.log(
      `✅ Synced ${gamesToInsert.length} games for ${season} Week ${week} (${seasonType})`
    );
    return {
      success: true,
      message: `Synced ${gamesToInsert.length} games for ${season} Week ${week} (${seasonType})`,
      gamesCount: gamesToInsert.length,
    };
  } catch (error) {
    console.error(
      `❌ Error syncing ${season} Week ${week} (${seasonType}):`,
      error
    );
    return {
      success: false,
      message: `Error syncing games: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
}

async function syncAllData() {
  console.log("🏈 Starting NFL data sync for 2025...\n");

  // Sync preseason games (weeks 1-3)
  console.log("📅 Syncing Preseason Games...");
  for (let week = 1; week <= 3; week++) {
    await syncNFLGames(2025, week, "preseason");
    // Add delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log("\n📅 Syncing Regular Season Games (Weeks 1-8)...");
  for (let week = 1; week <= 8; week++) {
    await syncNFLGames(2025, week, "regular");
    // Add delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log("\n✅ NFL data sync complete!");

  // Show summary
  const { data: games, error } = await supabase
    .from("games")
    .select("week, season_type, status")
    .order("season_type", { ascending: true })
    .order("week", { ascending: true });

  if (!error && games) {
    console.log("\n📊 Summary:");
    const summary = games.reduce((acc, game) => {
      const key = `${game.season_type} Week ${game.week}`;
      if (!acc[key]) {
        acc[key] = { total: 0, completed: 0 };
      }
      acc[key].total++;
      if (game.status === "completed") {
        acc[key].completed++;
      }
      return acc;
    }, {});

    Object.entries(summary).forEach(([week, stats]) => {
      console.log(
        `  ${week}: ${stats.completed}/${stats.total} games completed`
      );
    });
  }
}

syncAllData().catch(console.error);
