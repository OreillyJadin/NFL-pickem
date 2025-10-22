import { GameModel } from "@/models/GameModel";
import { PickModel } from "@/models/PickModel";

export class ScoringController {
  /**
   * Update scoring for a specific game
   * This imports and uses the existing scoring service
   */
  static async updateGameScoring(gameId: string) {
    // Import the scoring service dynamically to avoid circular dependencies
    const { updateSoloPickStatus } = await import("@/services/scoring");
    return await updateSoloPickStatus(gameId);
  }

  /**
   * Find and fix incorrect scoring across all completed games
   */
  static async fixIncorrectScoring() {
    // Import scoring service
    const { updateSoloPickStatus } = await import("@/services/scoring");

    try {
      // Get all completed games
      const completedGames = await GameModel.findCompleted(2025);

      let gamesChecked = 0;
      let gamesFixed = 0;
      let totalPicksFixed = 0;
      const problemGames: Array<{
        gameId: string;
        week: number;
        matchup: string;
        incorrectPicks: number;
        issues: string[];
      }> = [];

      for (const game of completedGames) {
        gamesChecked++;

        // Skip games with no winner (ties)
        if (
          game.home_score === null ||
          game.away_score === null ||
          game.home_score === game.away_score
        ) {
          continue;
        }

        // Get all picks for this game
        const picks = await PickModel.findByGame(game.id);

        // Determine winner
        const winner =
          (game.home_score || 0) > (game.away_score || 0)
            ? game.home_team
            : game.away_team;

        // Check for incorrect scoring
        const incorrectWinningPicks = picks.filter(
          (pick) => pick.picked_team === winner && pick.pick_points === 0
        );

        const incorrectLosingLocks = picks.filter(
          (pick) =>
            pick.picked_team !== winner &&
            pick.is_lock &&
            pick.pick_points === 0
        );

        const totalIncorrectPicks =
          incorrectWinningPicks.length + incorrectLosingLocks.length;

        if (totalIncorrectPicks > 0) {
          const issueTypes: string[] = [];

          if (incorrectWinningPicks.length > 0) {
            issueTypes.push(
              `${incorrectWinningPicks.length} winning picks with 0 points`
            );
          }

          if (incorrectLosingLocks.length > 0) {
            issueTypes.push(
              `${incorrectLosingLocks.length} losing locks with 0 points (should be -2)`
            );
          }

          console.log(
            `❌ Found incorrect scoring in game ${game.id} (Week ${
              game.week
            }): ${issueTypes.join(", ")}`
          );

          problemGames.push({
            gameId: game.id,
            week: game.week,
            matchup: `${game.away_team} @ ${game.home_team}`,
            incorrectPicks: totalIncorrectPicks,
            issues: issueTypes,
          });

          // Fix the scoring for this game
          const result = await updateSoloPickStatus(game.id);
          if (result.success) {
            gamesFixed++;
            totalPicksFixed += totalIncorrectPicks;
            console.log(`✅ Fixed scoring for game ${game.id}`);
          } else {
            console.error(
              `Failed to fix game ${game.id}:`,
              "error" in result ? result.error : "Unknown error"
            );
          }
        }
      }

      return {
        gamesChecked,
        gamesFixed,
        picksFixed: totalPicksFixed,
        problemGames,
      };
    } catch (error) {
      console.error("Error in fixIncorrectScoring:", error);
      throw error;
    }
  }

  /**
   * Validate scoring for a specific game
   */
  static async validateGameScoring(gameId: string): Promise<{
    isValid: boolean;
    issues: string[];
  }> {
    const game = await GameModel.findById(gameId);
    if (!game) {
      return { isValid: false, issues: ["Game not found"] };
    }

    if (game.status !== "completed") {
      return { isValid: true, issues: [] };
    }

    const picks = await PickModel.findByGame(gameId);
    const issues: string[] = [];

    // Check for tie
    if (game.home_score === game.away_score) {
      // All picks should have 0 points in a tie
      const incorrectTiePicks = picks.filter((pick) => pick.pick_points !== 0);
      if (incorrectTiePicks.length > 0) {
        issues.push(
          `${incorrectTiePicks.length} picks have non-zero points in a tie game`
        );
      }
      return { isValid: issues.length === 0, issues };
    }

    // Determine winner
    const winner =
      (game.home_score || 0) > (game.away_score || 0)
        ? game.home_team
        : game.away_team;

    // Check winning picks
    const winningPicks = picks.filter((pick) => pick.picked_team === winner);
    const incorrectWinningPicks = winningPicks.filter(
      (pick) => (pick.pick_points || 0) <= 0
    );
    if (incorrectWinningPicks.length > 0) {
      issues.push(
        `${incorrectWinningPicks.length} winning picks have 0 or negative points`
      );
    }

    // Check losing locks
    const losingLocks = picks.filter(
      (pick) => pick.picked_team !== winner && pick.is_lock
    );
    const incorrectLosingLocks = losingLocks.filter(
      (pick) => pick.pick_points !== -2
    );
    if (incorrectLosingLocks.length > 0) {
      issues.push(
        `${incorrectLosingLocks.length} losing locks don't have -2 points`
      );
    }

    return { isValid: issues.length === 0, issues };
  }
}
