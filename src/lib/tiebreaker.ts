/**
 * Utility functions for consistent tiebreaker logic across the application.
 *
 * TIEBREAKER SYSTEM:
 * 1. Points (descending) - Higher points win
 * 2. Win Percentage (descending) - Higher win percentage wins
 * 3. Wins (descending) - More wins wins
 * 4. Lowest Losses (ascending) - Fewer losses wins
 */

export interface UserStats {
  points: number;
  correct: number;
  total: number;
}

export interface LeaderboardEntry {
  user_id: string;
  username: string;
  email: string;
  total_picks: number;
  correct_picks: number;
  incorrect_picks: number;
  total_points: number;
  current_streak: number;
  weekly_points: number;
}

/**
 * Sorts users by the tiebreaker system for awards processing.
 * @param users Array of [userId, stats] tuples
 * @returns Sorted array with highest ranked users first
 */
export function sortUsersByTiebreaker(
  users: [string, UserStats][]
): [string, UserStats][] {
  return users.sort((a, b) => {
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
}

/**
 * Sorts leaderboard entries by the tiebreaker system.
 * @param a First leaderboard entry
 * @param b Second leaderboard entry
 * @returns Comparison result for sorting
 */
export function sortLeaderboardByTiebreaker(
  a: LeaderboardEntry,
  b: LeaderboardEntry
): number {
  // 1. Points (descending)
  if (b.total_points !== a.total_points) {
    return b.total_points - a.total_points;
  }

  // 2. Win percentage (descending)
  const aWinPercentage =
    a.total_picks > 0 ? a.correct_picks / a.total_picks : 0;
  const bWinPercentage =
    b.total_picks > 0 ? b.correct_picks / b.total_picks : 0;
  if (bWinPercentage !== aWinPercentage) {
    return bWinPercentage - aWinPercentage;
  }

  // 3. Wins (descending)
  if (b.correct_picks !== a.correct_picks) {
    return b.correct_picks - a.correct_picks;
  }

  // 4. Lowest losses (ascending)
  return a.incorrect_picks - b.incorrect_picks;
}

/**
 * Validates that the tiebreaker system is working correctly.
 * @param sortedUsers Array of sorted users
 * @param week Week number for logging
 * @returns true if validation passes, false if errors found
 */
export function validateTiebreakerLogic(
  sortedUsers: [string, UserStats][],
  week: number
): boolean {
  let hasErrors = false;

  for (let i = 0; i < sortedUsers.length - 1; i++) {
    const current = sortedUsers[i];
    const next = sortedUsers[i + 1];

    // Check if ranking is correct based on tiebreaker rules
    if (current[1].points === next[1].points) {
      const currentWinPct =
        current[1].total > 0 ? current[1].correct / current[1].total : 0;
      const nextWinPct =
        next[1].total > 0 ? next[1].correct / next[1].total : 0;

      if (currentWinPct < nextWinPct) {
        console.error(
          `❌ TIEBREAKER ERROR Week ${week}: User ${current[0]} ranked above ${next[0]} but has lower win percentage!`
        );
        console.error(
          `  ${current[0]}: ${current[1].points}pts, ${currentWinPct.toFixed(
            4
          )} win%`
        );
        console.error(
          `  ${next[0]}: ${next[1].points}pts, ${nextWinPct.toFixed(4)} win%`
        );
        hasErrors = true;
      }
    }
  }

  return !hasErrors;
}

/**
 * Logs detailed tiebreaker analysis for debugging.
 * @param sortedUsers Array of sorted users
 * @param week Week number for logging
 */
export function logTiebreakerAnalysis(
  sortedUsers: [string, UserStats][],
  week: number
): void {
  console.log(`🏆 Week ${week} Awards Processing - Tiebreaker Analysis:`);
  sortedUsers.forEach(([userId, stats], index) => {
    const winPercentage =
      stats.total > 0
        ? ((stats.correct / stats.total) * 100).toFixed(2)
        : "0.00";
    console.log(
      `  ${index + 1}. User ${userId}: ${stats.points}pts, ${stats.correct}-${
        stats.total - stats.correct
      } (${winPercentage}%)`
    );
  });
}
