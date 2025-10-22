import { supabase } from "@/config/supabase";
import { Award } from "@/types/database";
import { calculatePickPoints } from "./scoring";
import {
  sortUsersByTiebreaker,
  validateTiebreakerLogic,
  logTiebreakerAnalysis,
} from "./tiebreaker";
import {
  Trophy,
  Medal,
  Award as AwardIcon,
  Snowflake,
  Target,
  Zap,
  TrendingDown,
} from "lucide-react";

export const AWARD_TYPES = {
  top_scorer: {
    icon: Trophy,
    name: "1st Place",
    description: "Weekly Winner",
  },
  second_scorer: {
    icon: Medal,
    name: "2nd Place",
    description: "Runner Up",
  },
  third_scorer: {
    icon: AwardIcon,
    name: "3rd Place",
    description: "Third Place",
  },
  lowest_scorer: {
    icon: Snowflake,
    name: "Lowest Score",
    description: "Last Place",
  },
  perfect_week: {
    icon: Target,
    name: "Perfect Week",
    description: "All Correct",
  },
  cold_week: {
    icon: Zap,
    name: "Cold Week",
    description: "All Wrong",
  },
  negative_points: {
    icon: TrendingDown,
    name: "Negative Points",
    description: "Scored Below Zero",
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

/**
 * Processes weekly awards for a given week, season, and season type.
 *
 * TIEBREAKER SYSTEM:
 * When players are tied in points, the following criteria are used in order:
 * 1. Points (descending) - Higher points win
 * 2. Win Percentage (descending) - Higher win percentage wins
 * 3. Wins (descending) - More wins wins
 * 4. Lowest Losses (ascending) - Fewer losses wins
 *
 * This ensures consistent ranking between leaderboard and awards.
 *
 * @param week - The week number (1-18)
 * @param season - The season year (e.g., 2025)
 * @param seasonType - The season type ("preseason" | "regular" | "playoffs")
 * @returns Promise with created awards data or error
 */
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

    // Process picks with proper bonus point calculation
    for (const pick of picks) {
      const game = pick.game;
      if (
        !game ||
        game.status !== "completed" ||
        game.home_score === null ||
        game.away_score === null
      )
        continue;

      if (!userStats[pick.user_id]) {
        userStats[pick.user_id] = { points: 0, correct: 0, total: 0 };
      }

      // Check if game is a tie first
      const isTie = game.home_score === game.away_score;

      if (isTie) {
        // For ties, don't count as total pick, don't count as correct or incorrect
        // Just add 0 points
        userStats[pick.user_id].points += 0;
      } else {
        // For non-tie games, count as total pick
        userStats[pick.user_id].total++;

        // Use the proper calculatePickPoints function to include bonus points
        const result = await calculatePickPoints(pick, game, picks);
        userStats[pick.user_id].points += result.points;

        if (result.isCorrect) {
          userStats[pick.user_id].correct++;
        }
      }
    }

    // Find award winners
    const users = Object.entries(userStats);
    const awards: {
      userId: string;
      awardType: keyof typeof AWARD_TYPES;
      points: number;
      record: string;
    }[] = [];

    if (users.length > 0) {
      // Sort users using the centralized tiebreaker logic
      const sortedUsers = sortUsersByTiebreaker(users);

      // Log tiebreaker details for debugging
      logTiebreakerAnalysis(sortedUsers, week);

      // Validate tiebreaker logic
      const isValid = validateTiebreakerLogic(sortedUsers, week);
      if (!isValid) {
        console.error(`❌ TIEBREAKER VALIDATION FAILED for Week ${week}!`);
      }

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

      // Negative Points (scored below zero)
      users.forEach(([userId, stats]) => {
        if (stats.points < 0 && stats.total > 0) {
          awards.push({
            userId,
            awardType: "negative_points",
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
    icon: awardInfo.icon,
    name: `${awardInfo.name} [Week ${award.week}]`,
    description: awardInfo.description,
    points: award.points,
    week: award.week,
    seasonType: award.season_type,
    record: award.record || "0-0",
  };
}
