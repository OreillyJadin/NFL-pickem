import { supabase } from "@/config/supabase";
import { FantasyPlayerModel } from "@/models/FantasyPlayerModel";
import { FantasyStatsModel } from "@/models/FantasyStatsModel";
import { FantasyTeamModel } from "@/models/FantasyTeamModel";
import { FantasyPlayerStats, FantasyPosition } from "@/types/database";
import { calculateAllFormats } from "./fantasy-scoring";

/**
 * Fantasy Sync Service
 * Handles syncing player data and stats from ESPN API
 */

// ESPN API endpoints
const ESPN_BASE_URL = "https://site.api.espn.com/apis/site/v2/sports/football/nfl";

// Position mapping from ESPN to our format
const ESPN_POSITION_MAP: Record<string, FantasyPosition> = {
  QB: "QB",
  RB: "RB",
  WR: "WR",
  TE: "TE",
  K: "K",
  PK: "K",
  "D/ST": "DST",
  DEF: "DST",
};

// NFL Team abbreviation mapping
const TEAM_ABBREV_MAP: Record<string, string> = {
  "Arizona Cardinals": "ARI",
  "Atlanta Falcons": "ATL",
  "Baltimore Ravens": "BAL",
  "Buffalo Bills": "BUF",
  "Carolina Panthers": "CAR",
  "Chicago Bears": "CHI",
  "Cincinnati Bengals": "CIN",
  "Cleveland Browns": "CLE",
  "Dallas Cowboys": "DAL",
  "Denver Broncos": "DEN",
  "Detroit Lions": "DET",
  "Green Bay Packers": "GB",
  "Houston Texans": "HOU",
  "Indianapolis Colts": "IND",
  "Jacksonville Jaguars": "JAX",
  "Kansas City Chiefs": "KC",
  "Las Vegas Raiders": "LV",
  "Los Angeles Chargers": "LAC",
  "Los Angeles Rams": "LAR",
  "Miami Dolphins": "MIA",
  "Minnesota Vikings": "MIN",
  "New England Patriots": "NE",
  "New Orleans Saints": "NO",
  "New York Giants": "NYG",
  "New York Jets": "NYJ",
  "Philadelphia Eagles": "PHI",
  "Pittsburgh Steelers": "PIT",
  "San Francisco 49ers": "SF",
  "Seattle Seahawks": "SEA",
  "Tampa Bay Buccaneers": "TB",
  "Tennessee Titans": "TEN",
  "Washington Commanders": "WAS",
};

/**
 * Fetch game summary data from ESPN (includes player stats)
 */
async function fetchGameSummary(espnGameId: string) {
  try {
    const response = await fetch(`${ESPN_BASE_URL}/summary?event=${espnGameId}`);
    if (!response.ok) {
      throw new Error(`ESPN API error: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching ESPN game summary ${espnGameId}:`, error);
    throw error;
  }
}

/**
 * Fetch team roster from ESPN
 */
async function fetchTeamRoster(teamAbbrev: string) {
  try {
    // ESPN uses team IDs, we need to map abbreviations
    const teamIdMap: Record<string, string> = {
      ARI: "22", ATL: "1", BAL: "33", BUF: "2", CAR: "29", CHI: "3",
      CIN: "4", CLE: "5", DAL: "6", DEN: "7", DET: "8", GB: "9",
      HOU: "34", IND: "11", JAX: "30", KC: "12", LV: "13", LAC: "24",
      LAR: "14", MIA: "15", MIN: "16", NE: "17", NO: "18", NYG: "19",
      NYJ: "20", PHI: "21", PIT: "23", SF: "25", SEA: "26", TB: "27",
      TEN: "10", WAS: "28",
    };

    const teamId = teamIdMap[teamAbbrev];
    if (!teamId) {
      console.warn(`Unknown team abbreviation: ${teamAbbrev}`);
      return null;
    }

    const response = await fetch(`${ESPN_BASE_URL}/teams/${teamId}/roster`);
    if (!response.ok) {
      throw new Error(`ESPN API error: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching roster for ${teamAbbrev}:`, error);
    throw error;
  }
}

/**
 * Sync players from playoff teams
 */
export async function syncPlayoffPlayers(): Promise<{
  success: boolean;
  playersAdded: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let playersAdded = 0;

  try {
    const playoffTeams = await FantasyPlayerModel.getPlayoffTeams();
    console.log(`Syncing players from ${playoffTeams.length} playoff teams...`);

    for (const teamAbbrev of playoffTeams) {
      try {
        const rosterData = await fetchTeamRoster(teamAbbrev);
        if (!rosterData?.athletes) continue;

        const players = [];

        for (const group of rosterData.athletes) {
          for (const athlete of group.items || []) {
            // Get position from each player's data, not the group
            const posAbbrev = athlete.position?.abbreviation || "";
            const position = ESPN_POSITION_MAP[posAbbrev] || null;
            
            // Only include fantasy-relevant positions
            if (!position) continue;

            players.push({
              espn_id: athlete.id,
              name: athlete.fullName || athlete.displayName,
              team: teamAbbrev,
              position,
              headshot_url: athlete.headshot?.href || null,
            });
          }
        }

        // Also add the team defense
        players.push({
          espn_id: `DST_${teamAbbrev}`,
          name: `${teamAbbrev} Defense`,
          team: teamAbbrev,
          position: "DST" as FantasyPosition,
          headshot_url: null,
        });

        if (players.length > 0) {
          await FantasyPlayerModel.bulkUpsert(players);
          playersAdded += players.length;
          console.log(`Added ${players.length} players from ${teamAbbrev}`);
        }

        // Rate limiting
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error) {
        const errorMessage = error instanceof Error 
          ? error.message 
          : JSON.stringify(error);
        const msg = `Error syncing ${teamAbbrev}: ${errorMessage}`;
        console.error(msg);
        errors.push(msg);
      }
    }

    return { success: true, playersAdded, errors };
  } catch (error) {
    console.error("Error in syncPlayoffPlayers:", error);
    return {
      success: false,
      playersAdded,
      errors: [...errors, String(error)],
    };
  }
}

/**
 * Parse player stats from ESPN boxscore data
 */
function parsePlayerStats(
  playerData: any,
  teamAbbrev: string
): Partial<FantasyPlayerStats> {
  const stats: Partial<FantasyPlayerStats> = {
    passing_yards: 0,
    passing_tds: 0,
    interceptions: 0,
    rushing_yards: 0,
    rushing_tds: 0,
    receptions: 0,
    receiving_yards: 0,
    receiving_tds: 0,
    fumbles_lost: 0,
    two_point_conversions: 0,
  };

  // Parse each stat category
  for (const category of playerData.statistics || []) {
    const statNames = category.names || [];
    const statValues = category.stats || [];

    statNames.forEach((name: string, index: number) => {
      const value = parseFloat(statValues[index]) || 0;

      switch (name.toLowerCase()) {
        case "c/att":
          // Completions/Attempts - parse completions
          const parts = statValues[index]?.split("/") || [];
          break;
        case "yds":
          // Context matters - check category name
          if (category.name === "passing") {
            stats.passing_yards = value;
          } else if (category.name === "rushing") {
            stats.rushing_yards = value;
          } else if (category.name === "receiving") {
            stats.receiving_yards = value;
          }
          break;
        case "td":
          if (category.name === "passing") {
            stats.passing_tds = value;
          } else if (category.name === "rushing") {
            stats.rushing_tds = value;
          } else if (category.name === "receiving") {
            stats.receiving_tds = value;
          }
          break;
        case "int":
          stats.interceptions = value;
          break;
        case "rec":
          stats.receptions = value;
          break;
        case "fum":
          stats.fumbles_lost = value;
          break;
      }
    });
  }

  return stats;
}

/**
 * Sync player stats for a specific game
 */
export async function syncGamePlayerStats(
  espnGameId: string,
  week: number,
  season: number
): Promise<{
  success: boolean;
  playersUpdated: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let playersUpdated = 0;

  try {
    console.log(`Syncing stats for game ${espnGameId}...`);
    const gameData = await fetchGameSummary(espnGameId);

    if (!gameData?.boxscore?.players) {
      return { success: true, playersUpdated: 0, errors: [] };
    }

    for (const teamData of gameData.boxscore.players) {
      const teamInfo = teamData.team;
      const teamAbbrev =
        TEAM_ABBREV_MAP[teamInfo?.displayName] || teamInfo?.abbreviation;

      for (const category of teamData.statistics || []) {
        for (const athlete of category.athletes || []) {
          try {
            // Find player in our database
            const player = await FantasyPlayerModel.findByEspnId(athlete.athlete?.id);
            if (!player) continue;

            // Parse stats
            const rawStats = parsePlayerStats(athlete, teamAbbrev);

            // Calculate fantasy points in all formats
            const points = calculateAllFormats(rawStats);

            // Upsert stats
            await FantasyStatsModel.upsert({
              player_id: player.id,
              week,
              season,
              game_id: espnGameId,
              ...rawStats,
              points_ppr: points.ppr,
              points_half_ppr: points.half_ppr,
              points_standard: points.standard,
            } as Omit<FantasyPlayerStats, "id" | "last_updated">);

            playersUpdated++;
          } catch (error) {
            errors.push(`Error updating ${athlete.athlete?.displayName}: ${error}`);
          }
        }
      }
    }

    return { success: true, playersUpdated, errors };
  } catch (error) {
    console.error(`Error syncing game ${espnGameId}:`, error);
    return {
      success: false,
      playersUpdated,
      errors: [...errors, String(error)],
    };
  }
}

/**
 * Sync stats for all playoff games in a week
 */
export async function syncWeeklyStats(
  week: number,
  season: number
): Promise<{
  success: boolean;
  gamesProcessed: number;
  playersUpdated: number;
  errors: string[];
}> {
  let gamesProcessed = 0;
  let totalPlayersUpdated = 0;
  const allErrors: string[] = [];

  try {
    // Get playoff games for this week from our database
    const { data: games, error: gamesError } = await supabase
      .from("games")
      .select("espn_id")
      .eq("week", week)
      .eq("season", season)
      .eq("season_type", "playoffs")
      .not("espn_id", "is", null);

    if (gamesError) throw gamesError;
    if (!games || games.length === 0) {
      console.log(`No playoff games found for week ${week}`);
      return {
        success: true,
        gamesProcessed: 0,
        playersUpdated: 0,
        errors: [],
      };
    }

    console.log(`Found ${games.length} playoff games for week ${week}`);

    for (const game of games) {
      const result = await syncGamePlayerStats(game.espn_id!, week, season);
      gamesProcessed++;
      totalPlayersUpdated += result.playersUpdated;
      allErrors.push(...result.errors);

      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // After syncing stats, update roster slot points for all locked teams
    await updateAllTeamPoints(season);

    return {
      success: true,
      gamesProcessed,
      playersUpdated: totalPlayersUpdated,
      errors: allErrors,
    };
  } catch (error) {
    console.error(`Error syncing weekly stats:`, error);
    return {
      success: false,
      gamesProcessed,
      playersUpdated: totalPlayersUpdated,
      errors: [...allErrors, String(error)],
    };
  }
}

/**
 * Update points for all locked fantasy teams
 */
async function updateAllTeamPoints(season: number): Promise<void> {
  try {
    const teams = await FantasyTeamModel.findLockedTeams(season);

    for (const team of teams) {
      // Get total points for each player in the roster across all playoff weeks
      for (const slot of team.roster) {
        if (!slot.player_id) continue;

        const totalPoints = await FantasyStatsModel.getPlayerTotalPoints(
          slot.player_id,
          season
        );

        await FantasyTeamModel.updateSlotPoints(slot.id, {
          points_ppr: totalPoints.ppr,
          points_half_ppr: totalPoints.half_ppr,
          points_standard: totalPoints.standard,
        });
      }

      // Recalculate team totals
      await FantasyTeamModel.recalculateTotalPoints(team.id);
    }

    console.log(`Updated points for ${teams.length} teams`);
  } catch (error) {
    console.error("Error updating team points:", error);
  }
}
