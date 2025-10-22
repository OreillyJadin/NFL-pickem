import { GameModel } from "@/models/GameModel";
import { Game } from "@/types/database";

export class GameController {
  /**
   * Get all games for a specific week, sorted by status and time
   */
  static async getWeekGames(
    week: number,
    season: number = 2025,
    seasonType: "preseason" | "regular" | "playoffs" = "regular"
  ): Promise<Game[]> {
    const games = await GameModel.findByWeek(week, season, seasonType);

    // Sort games: in_progress > scheduled > completed, then by game time
    return games.sort((a, b) => {
      const getStatusPriority = (status: string) => {
        switch (status) {
          case "in_progress":
            return 1;
          case "scheduled":
            return 2;
          case "completed":
            return 3;
          default:
            return 4;
        }
      };

      const statusDiff =
        getStatusPriority(a.status) - getStatusPriority(b.status);
      if (statusDiff !== 0) {
        return statusDiff;
      }

      return new Date(a.game_time).getTime() - new Date(b.game_time).getTime();
    });
  }

  /**
   * Get a single game by ID
   */
  static async getGame(gameId: string): Promise<Game | null> {
    return await GameModel.findById(gameId);
  }

  /**
   * Get all completed games for a season
   */
  static async getCompletedGames(season: number = 2025): Promise<Game[]> {
    return await GameModel.findCompleted(season);
  }

  /**
   * Get available weeks for a season
   */
  static async getAvailableWeeks(
    season: number = 2025
  ): Promise<Array<{ week: number; season_type: string; season: number }>> {
    return await GameModel.getAvailableWeeks(season);
  }

  /**
   * Check if a game has started
   */
  static hasGameStarted(game: Game): boolean {
    const now = new Date();
    const gameStart = new Date(game.game_time);
    return now >= gameStart;
  }

  /**
   * Get games that need syncing
   */
  static async getGamesNeedingSync(
    minutesSinceLastSync: number = 5
  ): Promise<Game[]> {
    return await GameModel.findNeedingSync(minutesSinceLastSync);
  }

  /**
   * Determine the winner of a game
   */
  static determineWinner(game: Game): string | null {
    if (game.status !== "completed") {
      return null;
    }

    if (
      game.home_score === undefined ||
      game.away_score === undefined ||
      game.home_score === null ||
      game.away_score === null
    ) {
      return null;
    }

    if (game.home_score === game.away_score) {
      return "TIE";
    }

    return game.home_score > game.away_score ? game.home_team : game.away_team;
  }

  /**
   * Format game time for display
   */
  static formatGameTime(gameTime: string): string {
    const date = new Date(gameTime);
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) {
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    }

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }
}
