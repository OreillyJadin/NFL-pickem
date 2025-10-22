import { supabase } from "@/config/supabase";
import { Pick, CreatePickInput, UpdatePickInput } from "@/types/database";

export class PickModel {
  /**
   * Find all picks for a user
   */
  static async findByUser(userId: string): Promise<Pick[]> {
    const { data, error } = await supabase
      .from("picks")
      .select("*")
      .eq("user_id", userId);

    if (error) {
      console.error("Error fetching picks by user:", error);
      return [];
    }

    return data as Pick[];
  }

  /**
   * Find all picks for a specific game
   */
  static async findByGame(gameId: string): Promise<Pick[]> {
    const { data, error } = await supabase
      .from("picks")
      .select("*")
      .eq("game_id", gameId);

    if (error) {
      console.error("Error fetching picks by game:", error);
      return [];
    }

    return data as Pick[];
  }

  /**
   * Find a specific pick by user and game
   */
  static async findByUserAndGame(
    userId: string,
    gameId: string
  ): Promise<Pick | null> {
    const { data, error } = await supabase
      .from("picks")
      .select("*")
      .eq("user_id", userId)
      .eq("game_id", gameId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No rows returned
        return null;
      }
      console.error("Error fetching pick by user and game:", error);
      return null;
    }

    return data as Pick;
  }

  /**
   * Find picks by user for a specific week
   */
  static async findByUserAndWeek(
    userId: string,
    week: number,
    season: number = 2025,
    seasonType: "preseason" | "regular" | "playoffs" = "regular"
  ): Promise<Pick[]> {
    const { data, error } = await supabase
      .from("picks")
      .select(
        `
        *,
        game:games!inner(
          week,
          season_type,
          season
        )
      `
      )
      .eq("user_id", userId)
      .eq("games.week", week)
      .eq("games.season_type", seasonType)
      .eq("games.season", season);

    if (error) {
      console.error("Error fetching picks by user and week:", error);
      return [];
    }

    return data as Pick[];
  }

  /**
   * Create a new pick
   */
  static async create(data: CreatePickInput): Promise<Pick | null> {
    const { data: newPick, error } = await supabase
      .from("picks")
      .insert(data)
      .select()
      .single();

    if (error) {
      console.error("Error creating pick:", error);
      throw error;
    }

    return newPick as Pick;
  }

  /**
   * Update an existing pick
   */
  static async update(id: string, data: UpdatePickInput): Promise<Pick | null> {
    const { data: updatedPick, error } = await supabase
      .from("picks")
      .update(data)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating pick:", error);
      throw error;
    }

    return updatedPick as Pick;
  }

  /**
   * Update pick points and scoring fields
   */
  static async updateScoring(
    id: string,
    points: number,
    bonusPoints: number = 0,
    soloPick: boolean = false,
    soloLock: boolean = false,
    superBonus: boolean = false
  ): Promise<Pick | null> {
    const { data: updatedPick, error } = await supabase
      .from("picks")
      .update({
        pick_points: points,
        bonus_points: bonusPoints,
        solo_pick: soloPick,
        solo_lock: soloLock,
        super_bonus: superBonus,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating pick scoring:", error);
      return null;
    }

    return updatedPick as Pick;
  }

  /**
   * Bulk update picks for a game (used in scoring)
   */
  static async bulkUpdateScoring(
    updates: Array<{
      id: string;
      pick_points: number;
      bonus_points: number;
      solo_pick: boolean;
      solo_lock: boolean;
      super_bonus: boolean;
    }>
  ): Promise<boolean> {
    try {
      // Supabase doesn't support bulk updates directly, so we do them sequentially
      for (const update of updates) {
        const { error } = await supabase
          .from("picks")
          .update({
            pick_points: update.pick_points,
            bonus_points: update.bonus_points,
            solo_pick: update.solo_pick,
            solo_lock: update.solo_lock,
            super_bonus: update.super_bonus,
          })
          .eq("id", update.id);

        if (error) {
          console.error(`Error updating pick ${update.id}:`, error);
          throw error;
        }
      }
      return true;
    } catch (error) {
      console.error("Error in bulk update:", error);
      return false;
    }
  }

  /**
   * Delete a pick
   */
  static async delete(id: string): Promise<boolean> {
    const { error } = await supabase.from("picks").delete().eq("id", id);

    if (error) {
      console.error("Error deleting pick:", error);
      return false;
    }

    return true;
  }

  /**
   * Count locks for a user in a specific week
   */
  static async countLocksForWeek(
    userId: string,
    week: number,
    season: number = 2025,
    seasonType: "preseason" | "regular" | "playoffs" = "regular"
  ): Promise<number> {
    const { data, error } = await supabase
      .from("picks")
      .select(
        `
        is_lock,
        game:games!inner(
          week,
          season_type,
          season
        )
      `
      )
      .eq("user_id", userId)
      .eq("games.week", week)
      .eq("games.season_type", seasonType)
      .eq("games.season", season)
      .eq("is_lock", true);

    if (error) {
      console.error("Error counting locks:", error);
      return 0;
    }

    return data?.length || 0;
  }
}
