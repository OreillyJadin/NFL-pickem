import { Pick, Game } from "./supabase";
import { supabase } from "./supabase";

export interface PickResult {
  isCorrect: boolean;
  points: number;
  bonus: number; // Track bonus points separately
}

async function calculateBonusPoints(
  pick: Pick,
  game: Game,
  allPicks: Pick[]
): Promise<number> {
  // Only apply bonus points from Week 3 onwards
  if (game.week <= 2) return 0;

  const winner =
    game.home_score! > game.away_score! ? game.home_team : game.away_team;

  // Get all picks for this game
  const gamePicks = allPicks.filter((p) => p.game_id === game.id);

  // Get all correct picks for this game
  const correctPicks = gamePicks.filter((p) => p.picked_team === winner);

  // Get all correct locks for this game
  const correctLocks = correctPicks.filter((p) => p.is_lock);

  // Get all locks for this game (correct or not)
  const totalLocks = gamePicks.filter((p) => p.is_lock);

  let bonus = 0;
  let soloPick = false;
  let soloLock = false;
  let superBonus = false;

  // Check for solo pick and solo lock
  if (correctPicks.length === 1 && correctPicks[0].user_id === pick.user_id) {
    soloPick = true;
  }
  if (correctLocks.length === 1 && correctLocks[0].user_id === pick.user_id) {
    soloLock = true;
  }

  // Calculate bonus points
  if (soloPick && soloLock && pick.is_lock) {
    superBonus = true;
    bonus = 5;
  } else if (soloLock && pick.is_lock) {
    bonus = 2;
  } else if (soloPick) {
    bonus = 2;
  }

  // Update the pick in the database with bonus information
  try {
    const { error } = await supabase
      .from("picks")
      .update({
        solo_pick: soloPick,
        solo_lock: soloLock,
        super_bonus: superBonus,
        bonus_points: bonus,
      })
      .eq("id", pick.id);

    if (error) {
      console.error("Error updating pick bonus fields:", error);
    }
  } catch (error) {
    console.error("Error updating pick bonus fields:", error);
  }

  return bonus;
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
