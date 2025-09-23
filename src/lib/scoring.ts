import { Pick, Game } from "./supabase";
import { supabase } from "./supabase";

export interface PickResult {
  isCorrect: boolean;
  points: number;
  bonus: number; // Track bonus points separately
}

// Calculate and update solo pick/lock status for a game
export async function updateSoloPickStatus(gameId: string) {
  try {
    // Get the game details
    const { data: game, error: gameError } = await supabase
      .from("games")
      .select("*")
      .eq("id", gameId)
      .single();

    if (gameError || !game) {
      console.error("Error fetching game:", gameError);
      return;
    }

    // Only process for Week 3+ games that are in_progress or completed
    if (
      game.week <= 2 ||
      (game.status !== "in_progress" && game.status !== "completed")
    ) {
      return;
    }

    // Get all picks for this game
    const { data: allPicks, error: picksError } = await supabase
      .from("picks")
      .select("*")
      .eq("game_id", gameId);

    if (picksError || !allPicks) {
      console.error("Error fetching picks:", picksError);
      return;
    }

    // Group picks by team
    const picksByTeam: { [team: string]: Pick[] } = {};
    const locksByTeam: { [team: string]: Pick[] } = {};

    allPicks.forEach((pick) => {
      if (!picksByTeam[pick.picked_team]) {
        picksByTeam[pick.picked_team] = [];
      }
      picksByTeam[pick.picked_team].push(pick);

      if (pick.is_lock) {
        if (!locksByTeam[pick.picked_team]) {
          locksByTeam[pick.picked_team] = [];
        }
        locksByTeam[pick.picked_team].push(pick);
      }
    });

    // Update each pick with solo status
    for (const pick of allPicks) {
      const teamPicks = picksByTeam[pick.picked_team] || [];
      const teamLocks = locksByTeam[pick.picked_team] || [];

      const isSoloPick = teamPicks.length === 1;
      const isSoloLock = pick.is_lock && teamLocks.length === 1;
      const isSuperBonus = isSoloPick && isSoloLock && pick.is_lock;

      // Calculate bonus points and total points only if game is completed
      let bonusPoints = 0;
      let totalPoints = 0;
      if (
        game.status === "completed" &&
        game.home_score !== null &&
        game.away_score !== null
      ) {
        const winner =
          game.home_score > game.away_score ? game.home_team : game.away_team;
        const isCorrect = pick.picked_team === winner;

        // Calculate base points
        let basePoints = 0;
        if (isCorrect) {
          basePoints = pick.is_lock ? 2 : 1;
        } else {
          basePoints = pick.is_lock ? -2 : 0;
        }

        // Calculate bonus points (only if correct and Week 3+)
        if (isCorrect && game.week >= 3) {
          if (isSuperBonus) {
            bonusPoints = 5;
          } else if (isSoloLock) {
            bonusPoints = 2;
          } else if (isSoloPick) {
            bonusPoints = 2;
          }
        }

        // Calculate total points
        totalPoints = basePoints + bonusPoints;
      }

      // Update the pick in database
      const { error } = await supabase
        .from("picks")
        .update({
          solo_pick: isSoloPick,
          solo_lock: isSoloLock,
          super_bonus: isSuperBonus,
          bonus_points: bonusPoints,
          pick_points: totalPoints,
        })
        .eq("id", pick.id);

      if (error) {
        console.error("Error updating pick bonus status:", error);
      }
    }

    console.log(`Updated solo pick/lock status for game ${gameId}`);
  } catch (error) {
    console.error("Error updating solo pick status:", error);
  }
}

async function calculateBonusPoints(
  pick: Pick,
  game: Game,
  allPicks: Pick[]
): Promise<number> {
  // Only apply bonus points from Week 3 onwards and if game is completed
  if (game.week <= 2 || game.status !== "completed") {
    return 0;
  }

  // Calculate bonus points based on solo status flags (only if correct)
  if (pick.super_bonus) {
    return 5;
  } else if (pick.solo_lock) {
    return 2;
  } else if (pick.solo_pick) {
    return 2;
  }

  return 0;
}

export async function calculatePickPoints(
  pick: Pick,
  game: Game,
  allPicks: Pick[] = []
): Promise<PickResult> {
  if (game.status !== "completed" || !game.home_score || !game.away_score) {
    return { isCorrect: false, points: 0, bonus: 0 };
  }

  const winner =
    game.home_score > game.away_score ? game.home_team : game.away_team;
  const isCorrect = pick.picked_team === winner;

  // Solo pick status should be updated when games change status, not during point calculation
  // This avoids performance issues during leaderboard calculations

  if (isCorrect) {
    const basePoints = pick.is_lock ? 2 : 1;
    const bonus = await calculateBonusPoints(pick, game, allPicks);
    return { isCorrect: true, points: basePoints + bonus, bonus };
  } else {
    return { isCorrect: false, points: pick.is_lock ? -2 : 0, bonus: 0 };
  }
}

export async function calculateUserStats(picks: Pick[], games: Game[]) {
  let totalPicks = 0;
  let correctPicks = 0;
  let incorrectPicks = 0;
  let totalPoints = 0;
  let currentStreak = 0;
  let maxStreak = 0;
  let tempStreak = 0;

  // Sort picks by game time to calculate streaks correctly
  const picksWithGames = picks
    .map((pick) => ({
      pick,
      game: games.find((game) => game.id === pick.game_id),
    }))
    .filter((item) => item.game)
    .sort(
      (a, b) =>
        new Date(a.game!.game_time).getTime() -
        new Date(b.game!.game_time).getTime()
    );

  // Process picks sequentially to maintain order
  for (const { pick, game } of picksWithGames) {
    if (!game) continue;

    totalPicks++;
    const result = await calculatePickPoints(pick, game, picks);

    if (result.isCorrect) {
      correctPicks++;
      totalPoints += result.points;
      tempStreak++;
      maxStreak = Math.max(maxStreak, tempStreak);
    } else {
      incorrectPicks++;
      totalPoints += result.points;
      tempStreak = 0;
    }
  }

  // Current streak is the streak from the most recent games
  currentStreak = tempStreak;

  return {
    totalPicks,
    correctPicks,
    incorrectPicks,
    totalPoints,
    currentStreak,
    maxStreak,
    winPercentage:
      totalPicks > 0 ? Math.round((correctPicks / totalPicks) * 100) : 0,
  };
}

export async function calculateWeeklyAwards(
  picks: Pick[],
  games: Game[],
  week: number,
  seasonType: string
) {
  const userStats: {
    [userId: string]: { points: number; correct: number; total: number };
  } = {};

  // Calculate stats for each user
  // Process picks sequentially
  for (const pick of picks) {
    const game = games.find((g) => g.id === pick.game_id);
    if (!game || game.week !== week || game.season_type !== seasonType)
      continue;

    if (!userStats[pick.user_id]) {
      userStats[pick.user_id] = { points: 0, correct: 0, total: 0 };
    }

    userStats[pick.user_id].total++;
    const result = await calculatePickPoints(pick, game, picks);
    userStats[pick.user_id].points += result.points;
    if (result.isCorrect) {
      userStats[pick.user_id].correct++;
    }
  }

  // Find award winners
  const users = Object.entries(userStats);
  const awards: { userId: string; awardType: string; points: number }[] = [];

  if (users.length > 0) {
    // Top Scorer
    const topScorer = users.reduce((max, current) =>
      current[1].points > max[1].points ? current : max
    );
    awards.push({
      userId: topScorer[0],
      awardType: "top_scorer",
      points: topScorer[1].points,
    });

    // Lowest Scorer
    const lowestScorer = users.reduce((min, current) =>
      current[1].points < min[1].points ? current : min
    );
    awards.push({
      userId: lowestScorer[0],
      awardType: "lowest_scorer",
      points: lowestScorer[1].points,
    });

    // Perfect Week (all picks correct)
    users.forEach(([userId, stats]) => {
      if (stats.correct === stats.total && stats.total > 0) {
        awards.push({
          userId,
          awardType: "perfect_week",
          points: stats.points,
        });
      }
    });

    // Cold Week (all picks wrong)
    users.forEach(([userId, stats]) => {
      if (stats.correct === 0 && stats.total > 0) {
        awards.push({
          userId,
          awardType: "cold_week",
          points: stats.points,
        });
      }
    });
  }

  return awards;
}
