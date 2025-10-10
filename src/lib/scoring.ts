import { Pick, Game } from "./supabase";
import { supabase } from "./supabase";
import {
  calculatePickScore,
  calculateSoloStatusForPick,
  determineWinner,
} from "./scoring-engine";
import { validateGameForScoring } from "./scoring-validator";

export interface PickResult {
  isCorrect: boolean;
  points: number;
  bonus: number; // Track bonus points separately
}

// Calculate and update solo pick/lock status for a game
// This function ALWAYS scores picks regardless of week number
export async function updateSoloPickStatus(
  gameId: string,
  retryCount: number = 0
) {
  const MAX_RETRIES = 3;

  try {
    // Get the game details
    const { data: game, error: gameError } = await supabase
      .from("games")
      .select("*")
      .eq("id", gameId)
      .single();

    if (gameError || !game) {
      console.error("Error fetching game:", gameError);
      throw new Error(`Failed to fetch game: ${gameError?.message}`);
    }

    // Only process games that are in_progress or completed
    if (game.status !== "in_progress" && game.status !== "completed") {
      console.log(
        `Game ${gameId} is ${game.status}, skipping scoring (only score in_progress or completed games)`
      );
      return { success: true, skipped: true, reason: "Game not started" };
    }

    // Get all picks for this game
    const { data: allPicks, error: picksError } = await supabase
      .from("picks")
      .select("*")
      .eq("game_id", gameId);

    if (picksError || !allPicks) {
      console.error("Error fetching picks:", picksError);
      throw new Error(`Failed to fetch picks: ${picksError?.message}`);
    }

    if (allPicks.length === 0) {
      console.log(`No picks found for game ${gameId}`);
      return { success: true, skipped: true, reason: "No picks" };
    }

    // Group picks by team for solo pick/lock calculation
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

    // Update each pick with solo status and points
    let successCount = 0;
    let errorCount = 0;

    for (const pick of allPicks) {
      const teamPicks = picksByTeam[pick.picked_team] || [];
      const teamLocks = locksByTeam[pick.picked_team] || [];

      const isSoloPick = teamPicks.length === 1;
      const isSoloLock = pick.is_lock && teamLocks.length === 1;
      const isSuperBonus = isSoloPick && isSoloLock && pick.is_lock;

      // Calculate bonus points and total points
      let bonusPoints = 0;
      let totalPoints = 0;

      // Only calculate final points if game is valid for scoring
      const validation = validateGameForScoring(game);
      if (!validation.canScore) {
        console.log(
          `Pick ${pick.id}: Game ${gameId} not ready for scoring (${validation.reason})`
        );
      } else {
        const winner = determineWinner(game);
        if (!winner) {
          // tie or unresolved
          totalPoints = 0;
          bonusPoints = 0;
          console.log(
            `Pick ${pick.id}: TIE or unresolved (${game.home_score}-${game.away_score}), 0 points`
          );
        } else {
          const isCorrect = pick.picked_team === winner;
          const solo = { isSoloPick, isSoloLock };
          const score = calculatePickScore({
            isCorrect,
            isLock: !!pick.is_lock,
            week: game.week,
            soloStatus: solo,
          });
          bonusPoints = score.bonusPoints;
          totalPoints = score.totalPoints;

          console.log(
            `Pick ${pick.id}: ${score.breakdown} (winner=${winner}, pick=${pick.picked_team})`
          );
        }
      }

      // Update the pick in database with retry logic
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
        console.error(`Error updating pick ${pick.id}:`, error);
        errorCount++;
      } else {
        successCount++;
      }
    }

    const result = {
      success: true,
      gameId,
      week: game.week,
      totalPicks: allPicks.length,
      successCount,
      errorCount,
    };

    console.log(
      `Updated picks for game ${gameId} (Week ${game.week}): ${successCount} successful, ${errorCount} failed`
    );

    return result;
  } catch (error) {
    console.error(
      `Error updating solo pick status (attempt ${
        retryCount + 1
      }/${MAX_RETRIES}):`,
      error
    );

    // Retry logic for transient errors
    if (retryCount < MAX_RETRIES) {
      console.log(`Retrying in 1 second...`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return updateSoloPickStatus(gameId, retryCount + 1);
    }

    // After max retries, log the error but don't crash
    console.error(
      `Failed to update solo pick status for game ${gameId} after ${MAX_RETRIES} attempts`
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      gameId,
    };
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

  // Check if game is a tie - void all picks (0 points for everyone)
  const isTie = game.home_score === game.away_score;
  if (isTie) {
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
