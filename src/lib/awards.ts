import { supabase } from "./supabase";
import { Award } from "./supabase";

export const AWARD_TYPES = {
  top_scorer: {
    emoji: "🏆",
    name: "1st Place",
    description: "Weekly Winner",
  },
  second_scorer: {
    emoji: "🥈",
    name: "2nd Place",
    description: "Runner Up",
  },
  third_scorer: {
    emoji: "🥉",
    name: "3rd Place",
    description: "Third Place",
  },
  lowest_scorer: {
    emoji: "🥶",
    name: "Lowest Score",
    description: "Last Place",
  },
  perfect_week: {
    emoji: "💯",
    name: "Perfect Week",
    description: "All Correct",
  },
  cold_week: {
    emoji: "🧊",
    name: "Cold Week",
    description: "All Wrong",
  },
} as const;

export async function createAward(
  userId: string,
  week: number,
  season: number,
  seasonType: string,
  awardType: keyof typeof AWARD_TYPES,
  points: number,
  record: string
) {
  try {
    const { data, error } = await supabase
      .from("awards")
      .insert({
        user_id: userId,
        week,
        season,
        season_type: seasonType,
        award_type: awardType,
        points,
        record,
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getUserAwards(userId: string) {
  try {
    const { data, error } = await supabase
      .from("awards")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    return { data: [], error };
  }
}

export async function processWeeklyAwards(
  week: number,
  season: number,
  seasonType: string
) {
  try {
    // Get all picks for the week
    const { data: picks, error: picksError } = await supabase
      .from("picks")
      .select(
        `
        *,
        game:games!inner(
          home_team,
          away_team,
          home_score,
          away_score,
          status,
          week,
          season,
          season_type
        )
      `
      )
      .eq("game.week", week)
      .eq("game.season", season)
      .eq("game.season_type", seasonType);

    if (picksError) throw picksError;

    // Get all games for the week
    const { data: games, error: gamesError } = await supabase
      .from("games")
      .select("*")
      .eq("week", week)
      .eq("season", season)
      .eq("season_type", seasonType);

    if (gamesError) throw gamesError;

    if (!picks || !games) return { data: [], error: null };

    // Calculate awards
    const userStats: {
      [userId: string]: { points: number; correct: number; total: number };
    } = {};

    picks.forEach((pick) => {
      const game = pick.game;
      if (
        !game ||
        game.status !== "completed" ||
        game.home_score === null ||
        game.away_score === null
      )
        return;

      if (!userStats[pick.user_id]) {
        userStats[pick.user_id] = { points: 0, correct: 0, total: 0 };
      }

      userStats[pick.user_id].total++;

      const winner =
        game.home_score > game.away_score ? game.home_team : game.away_team;
      const isCorrect = pick.picked_team === winner;

      if (isCorrect) {
        userStats[pick.user_id].correct++;
        userStats[pick.user_id].points += pick.is_lock ? 2 : 1;
      } else {
        userStats[pick.user_id].points += pick.is_lock ? -2 : 0;
      }
    });

    // Find award winners
    const users = Object.entries(userStats);
    const awards: {
      userId: string;
      awardType: keyof typeof AWARD_TYPES;
      points: number;
      record: string;
    }[] = [];

    if (users.length > 0) {
      // Sort users by the same logic as leaderboard: points, win%, wins, lowest losses
      const sortedUsers = users.sort((a, b) => {
        // 1. Points (descending)
        if (b[1].points !== a[1].points) {
          return b[1].points - a[1].points;
        }

        // 2. Win percentage (descending)
        const aWinPercentage = a[1].total > 0 ? a[1].correct / a[1].total : 0;
        const bWinPercentage = b[1].total > 0 ? b[1].correct / b[1].total : 0;
        if (bWinPercentage !== aWinPercentage) {
          return bWinPercentage - aWinPercentage;
        }

        // 3. Wins (descending)
        if (b[1].correct !== a[1].correct) {
          return b[1].correct - a[1].correct;
        }

        // 4. Lowest losses (ascending)
        return a[1].total - a[1].correct - (b[1].total - b[1].correct);
      });

      // Top Scorer (1st place)
      if (sortedUsers.length >= 1) {
        const topScorer = sortedUsers[0];
        awards.push({
          userId: topScorer[0],
          awardType: "top_scorer",
          points: topScorer[1].points,
          record: `${topScorer[1].correct}-${
            topScorer[1].total - topScorer[1].correct
          }`,
        });
      }

      // Second Place
      if (sortedUsers.length >= 2) {
        const secondScorer = sortedUsers[1];
        awards.push({
          userId: secondScorer[0],
          awardType: "second_scorer",
          points: secondScorer[1].points,
          record: `${secondScorer[1].correct}-${
            secondScorer[1].total - secondScorer[1].correct
          }`,
        });
      }

      // Third Place
      if (sortedUsers.length >= 3) {
        const thirdScorer = sortedUsers[2];
        awards.push({
          userId: thirdScorer[0],
          awardType: "third_scorer",
          points: thirdScorer[1].points,
          record: `${thirdScorer[1].correct}-${
            thirdScorer[1].total - thirdScorer[1].correct
          }`,
        });
      }

      // Lowest Scorer
      const lowestScorer = users.reduce((min, current) =>
        current[1].points < min[1].points ? current : min
      );
      awards.push({
        userId: lowestScorer[0],
        awardType: "lowest_scorer",
        points: lowestScorer[1].points,
        record: `${lowestScorer[1].correct}-${
          lowestScorer[1].total - lowestScorer[1].correct
        }`,
      });

      // Perfect Week (all picks correct)
      users.forEach(([userId, stats]) => {
        if (stats.correct === stats.total && stats.total > 0) {
          awards.push({
            userId,
            awardType: "perfect_week",
            points: stats.points,
            record: `${stats.correct}-${stats.total - stats.correct}`,
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
            record: `${stats.correct}-${stats.total - stats.correct}`,
          });
        }
      });
    }

    // Create awards in database
    const createdAwards = [];
    for (const award of awards) {
      const { data, error } = await createAward(
        award.userId,
        week,
        season,
        seasonType,
        award.awardType,
        award.points,
        award.record
      );

      if (error) {
        console.error(`Error creating award for user ${award.userId}:`, error);
      } else {
        createdAwards.push(data);
      }
    }

    return { data: createdAwards, error: null };
  } catch (error) {
    return { data: [], error };
  }
}

export function getAwardDisplay(award: Award) {
  const awardInfo = AWARD_TYPES[award.award_type];
  return {
    emoji: awardInfo.emoji,
    name: `${awardInfo.name} [Week ${award.week}]`,
    description: awardInfo.description,
    points: award.points,
    week: award.week,
    seasonType: award.season_type,
    record: award.record || "0-0",
  };
}
