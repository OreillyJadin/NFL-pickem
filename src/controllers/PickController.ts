import { PickModel } from "@/models/PickModel";
import { GameModel } from "@/models/GameModel";
import { Pick, Game } from "@/types/database";

export class PickController {
  /**
   * Create a new pick with validation
   */
  static async createPick(
    userId: string,
    gameId: string,
    team: string,
    isLock: boolean = false
  ): Promise<Pick> {
    // Validate game exists and hasn't started
    const game = await GameModel.findById(gameId);
    if (!game) {
      throw new Error("Game not found");
    }

    if (this.hasGameStarted(game)) {
      throw new Error("Cannot make picks for games that have already started");
    }

    // Check lock limit if this is a lock
    if (isLock) {
      const locksUsed = await PickModel.countLocksForWeek(
        userId,
        game.week,
        game.season,
        game.season_type
      );

      if (locksUsed >= 3) {
        throw new Error("You can only use 3 locks per week");
      }
    }

    // Check if pick already exists
    const existingPick = await PickModel.findByUserAndGame(userId, gameId);
    if (existingPick) {
      // Update existing pick
      const updatedPick = await PickModel.update(existingPick.id, {
        picked_team: team,
        is_lock: isLock,
      });
      if (!updatedPick) {
        throw new Error("Failed to update pick");
      }
      return updatedPick;
    }

    // Create new pick
    const newPick = await PickModel.create({
      user_id: userId,
      game_id: gameId,
      picked_team: team,
      is_lock: isLock,
    });

    if (!newPick) {
      throw new Error("Failed to create pick");
    }

    return newPick;
  }

  /**
   * Get all picks for a user
   */
  static async getUserPicks(userId: string): Promise<Pick[]> {
    return await PickModel.findByUser(userId);
  }

  /**
   * Get picks for a specific game
   */
  static async getGamePicks(gameId: string): Promise<Pick[]> {
    return await PickModel.findByGame(gameId);
  }

  /**
   * Get user's pick for a specific game
   */
  static async getUserPickForGame(
    userId: string,
    gameId: string
  ): Promise<Pick | null> {
    return await PickModel.findByUserAndGame(userId, gameId);
  }

  /**
   * Get user's picks for a specific week
   */
  static async getUserPicksForWeek(
    userId: string,
    week: number,
    season: number = 2025,
    seasonType: "preseason" | "regular" | "playoffs" = "regular"
  ): Promise<Pick[]> {
    return await PickModel.findByUserAndWeek(userId, week, season, seasonType);
  }

  /**
   * Toggle lock status for an existing pick
   */
  static async toggleLock(userId: string, gameId: string): Promise<Pick> {
    const pick = await PickModel.findByUserAndGame(userId, gameId);
    if (!pick) {
      throw new Error("Pick not found");
    }

    // Validate game hasn't started
    const game = await GameModel.findById(gameId);
    if (!game) {
      throw new Error("Game not found");
    }

    if (this.hasGameStarted(game)) {
      throw new Error(
        "Cannot modify picks for games that have already started"
      );
    }

    const newLockStatus = !pick.is_lock;

    // If locking, check lock limit
    if (newLockStatus) {
      const locksUsed = await PickModel.countLocksForWeek(
        userId,
        game.week,
        game.season,
        game.season_type
      );

      if (locksUsed >= 3) {
        throw new Error("You can only use 3 locks per week");
      }
    }

    const updatedPick = await PickModel.update(pick.id, {
      is_lock: newLockStatus,
    });

    if (!updatedPick) {
      throw new Error("Failed to update lock status");
    }

    return updatedPick;
  }

  /**
   * Count locks used for a specific week
   */
  static async countLocksForWeek(
    userId: string,
    week: number,
    season: number = 2025,
    seasonType: "preseason" | "regular" | "playoffs" = "regular"
  ): Promise<number> {
    return await PickModel.countLocksForWeek(userId, week, season, seasonType);
  }

  /**
   * Delete a pick
   */
  static async deletePick(userId: string, gameId: string): Promise<boolean> {
    const pick = await PickModel.findByUserAndGame(userId, gameId);
    if (!pick) {
      throw new Error("Pick not found");
    }

    // Validate game hasn't started
    const game = await GameModel.findById(gameId);
    if (!game) {
      throw new Error("Game not found");
    }

    if (this.hasGameStarted(game)) {
      throw new Error(
        "Cannot delete picks for games that have already started"
      );
    }

    return await PickModel.delete(pick.id);
  }

  /**
   * Helper: Check if game has started
   */
  private static hasGameStarted(game: Game): boolean {
    const now = new Date();
    const gameStart = new Date(game.game_time);
    return now >= gameStart;
  }

  /**
   * Helper: Count locks in an array of picks
   */
  private static countLocks(picks: Pick[]): number {
    return picks.filter((p) => p.is_lock).length;
  }

  /**
   * Get pick result (win/loss/pending)
   */
  static getPickResult(
    pick: Pick,
    game: Game
  ): "win" | "loss" | "tie" | "pending" {
    if (
      game.status !== "completed" ||
      game.home_score === null ||
      game.away_score === null
    ) {
      return "pending";
    }

    // Check for tie
    if (game.home_score === game.away_score) {
      return "tie";
    }

    // Determine winner
    const winner =
      game.home_score > game.away_score ? game.home_team : game.away_team;

    return pick.picked_team === winner ? "win" : "loss";
  }
}
