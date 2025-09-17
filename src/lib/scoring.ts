import { Pick, Game } from "./supabase";

export interface PickResult {
  isCorrect: boolean;
  points: number;
}

export function calculatePickPoints(pick: Pick, game: Game): PickResult {
  if (game.status !== "completed" || !game.home_score || !game.away_score) {
    return { isCorrect: false, points: 0 };
  }

  const winner =
    game.home_score > game.away_score ? game.home_team : game.away_team;
  const isCorrect = pick.picked_team === winner;

  if (isCorrect) {
    return { isCorrect: true, points: pick.is_lock ? 2 : 1 };
  } else {
    return { isCorrect: false, points: pick.is_lock ? -2 : 0 };
  }
}

export function calculateUserStats(picks: Pick[], games: Game[]) {
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

  picksWithGames.forEach(({ pick, game }) => {
    if (!game) return;

    totalPicks++;
    const result = calculatePickPoints(pick, game);

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
  });

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

export function calculateWeeklyAwards(
  picks: Pick[],
  games: Game[],
  week: number,
  seasonType: string
) {
  const userStats: {
    [userId: string]: { points: number; correct: number; total: number };
  } = {};

  // Calculate stats for each user
  picks.forEach((pick) => {
    const game = games.find((g) => g.id === pick.game_id);
    if (!game || game.week !== week || game.season_type !== seasonType) return;

    if (!userStats[pick.user_id]) {
      userStats[pick.user_id] = { points: 0, correct: 0, total: 0 };
    }

    userStats[pick.user_id].total++;
    const result = calculatePickPoints(pick, game);
    userStats[pick.user_id].points += result.points;
    if (result.isCorrect) {
      userStats[pick.user_id].correct++;
    }
  });

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
