import { supabase } from "@/config/supabase";
import { Game, UpdateGameInput } from "@/types/database";

export class GameModel {
  /**
   * Find a game by ID
   */
  static async findById(id: string): Promise<Game | null> {
    const { data, error } = await supabase
      .from("games")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching game by ID:", error);
      return null;
    }

    return data as Game;
  }

  /**
   * Find all games for a specific week
   */
  static async findByWeek(
    week: number,
    season: number = 2025,
    seasonType: "preseason" | "regular" | "playoffs" = "regular"
  ): Promise<Game[]> {
    const { data, error } = await supabase
      .from("games")
      .select("*")
      .eq("week", week)
      .eq("season", season)
      .eq("season_type", seasonType)
      .order("game_time", { ascending: true });

    if (error) {
      console.error("Error fetching games by week:", error);
      return [];
    }

    return data as Game[];
  }

  /**
   * Find all completed games for a season
   */
  static async findCompleted(season: number = 2025): Promise<Game[]> {
    const { data, error } = await supabase
      .from("games")
      .select("*")
      .eq("season", season)
      .eq("status", "completed")
      .order("week", { ascending: true });

    if (error) {
      console.error("Error fetching completed games:", error);
      return [];
    }

    return data as Game[];
  }

  /**
   * Find all games (with optional filters)
   */
  static async findAll(filters?: {
    season?: number;
    status?: Game["status"];
    seasonType?: Game["season_type"];
  }): Promise<Game[]> {
    let query = supabase.from("games").select("*");

    if (filters?.season) {
      query = query.eq("season", filters.season);
    }
    if (filters?.status) {
      query = query.eq("status", filters.status);
    }
    if (filters?.seasonType) {
      query = query.eq("season_type", filters.seasonType);
    }

    const { data, error } = await query.order("game_time", { ascending: true });

    if (error) {
      console.error("Error fetching games:", error);
      return [];
    }

    return data as Game[];
  }

  /**
   * Update a game
   */
  static async update(id: string, data: UpdateGameInput): Promise<Game | null> {
    const { data: updatedGame, error } = await supabase
      .from("games")
      .update(data)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating game:", error);
      return null;
    }

    return updatedGame as Game;
  }

  /**
   * Get all unique weeks for a season
   */
  static async getAvailableWeeks(
    season: number = 2025
  ): Promise<Array<{ week: number; season_type: string; season: number }>> {
    const { data, error } = await supabase
      .from("games")
      .select("week, season_type, season")
      .eq("season", season)
      .order("season_type", { ascending: true })
      .order("week", { ascending: true });

    if (error) {
      console.error("Error fetching available weeks:", error);
      return [];
    }

    // Remove duplicates
    const uniqueWeeks = data.reduce((acc: any[], curr) => {
      const exists = acc.find(
        (item) =>
          item.week === curr.week &&
          item.season_type === curr.season_type &&
          item.season === curr.season
      );
      if (!exists) {
        acc.push(curr);
      }
      return acc;
    }, []);

    return uniqueWeeks;
  }

  /**
   * Find games that need syncing (completed or in progress, not synced recently)
   */
  static async findNeedingSync(
    minutesSinceLastSync: number = 5
  ): Promise<Game[]> {
    const cutoffTime = new Date(
      Date.now() - minutesSinceLastSync * 60 * 1000
    ).toISOString();

    const { data, error } = await supabase
      .from("games")
      .select("*")
      .in("status", ["in_progress", "completed"])
      .or(`last_synced.is.null,last_synced.lt.${cutoffTime}`)
      .order("game_time", { ascending: true });

    if (error) {
      console.error("Error fetching games needing sync:", error);
      return [];
    }

    return data as Game[];
  }
}
