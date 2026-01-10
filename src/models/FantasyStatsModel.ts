import { supabase, supabaseAdmin } from "@/config/supabase";
import { FantasyPlayerStats } from "@/types/database";

/**
 * FantasyStatsModel - Database operations for fantasy player stats
 * Handles CRUD operations for the fantasy_player_stats table
 */
export class FantasyStatsModel {
  /**
   * Find stats for a player in a specific week
   */
  static async findByPlayerWeek(
    playerId: string,
    week: number,
    season: number
  ): Promise<FantasyPlayerStats | null> {
    const { data, error } = await supabase
      .from("fantasy_player_stats")
      .select("*")
      .eq("player_id", playerId)
      .eq("week", week)
      .eq("season", season)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data;
  }

  /**
   * Find all stats for a week
   */
  static async findByWeek(
    week: number,
    season: number
  ): Promise<FantasyPlayerStats[]> {
    const { data, error } = await supabase
      .from("fantasy_player_stats")
      .select("*")
      .eq("week", week)
      .eq("season", season);

    if (error) throw error;
    return data || [];
  }

  /**
   * Find all stats for a player across all weeks
   */
  static async findByPlayer(
    playerId: string,
    season: number
  ): Promise<FantasyPlayerStats[]> {
    const { data, error } = await supabase
      .from("fantasy_player_stats")
      .select("*")
      .eq("player_id", playerId)
      .eq("season", season)
      .order("week");

    if (error) throw error;
    return data || [];
  }

  /**
   * Get total points for a player across all playoff weeks
   */
  static async getPlayerTotalPoints(
    playerId: string,
    season: number
  ): Promise<{ ppr: number; half_ppr: number; standard: number }> {
    const stats = await this.findByPlayer(playerId, season);

    return stats.reduce(
      (acc, stat) => ({
        ppr: acc.ppr + (stat.points_ppr || 0),
        half_ppr: acc.half_ppr + (stat.points_half_ppr || 0),
        standard: acc.standard + (stat.points_standard || 0),
      }),
      { ppr: 0, half_ppr: 0, standard: 0 }
    );
  }

  /**
   * Create or update player stats for a week (upsert)
   * Uses admin client to bypass RLS for server-side operations
   */
  static async upsert(
    stats: Omit<FantasyPlayerStats, "id" | "last_updated">
  ): Promise<FantasyPlayerStats> {
    const { data, error } = await supabaseAdmin
      .from("fantasy_player_stats")
      .upsert(
        {
          ...stats,
          last_updated: new Date().toISOString(),
        },
        { onConflict: "player_id,week,season" }
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Bulk upsert stats for multiple players
   * Uses admin client to bypass RLS for server-side operations
   */
  static async bulkUpsert(
    statsArray: Omit<FantasyPlayerStats, "id" | "last_updated">[]
  ): Promise<FantasyPlayerStats[]> {
    const now = new Date().toISOString();
    const statsWithTimestamp = statsArray.map((s) => ({
      ...s,
      last_updated: now,
    }));

    const { data, error } = await supabaseAdmin
      .from("fantasy_player_stats")
      .upsert(statsWithTimestamp, { onConflict: "player_id,week,season" })
      .select();

    if (error) throw error;
    return data || [];
  }

  /**
   * Update calculated points for a stat record
   * Uses admin client to bypass RLS for server-side operations
   */
  static async updatePoints(
    statId: string,
    points: {
      points_ppr: number;
      points_half_ppr: number;
      points_standard: number;
    }
  ): Promise<void> {
    const { error } = await supabaseAdmin
      .from("fantasy_player_stats")
      .update({
        ...points,
        last_updated: new Date().toISOString(),
      })
      .eq("id", statId);

    if (error) throw error;
  }

  /**
   * Get top performers for a week by format
   */
  static async getTopPerformers(
    week: number,
    season: number,
    format: "ppr" | "half_ppr" | "standard",
    limit: number = 10
  ): Promise<FantasyPlayerStats[]> {
    const pointsColumn = `points_${format}`;

    const { data, error } = await supabase
      .from("fantasy_player_stats")
      .select(`
        *,
        player:fantasy_players(*)
      `)
      .eq("week", week)
      .eq("season", season)
      .order(pointsColumn, { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  /**
   * Delete all stats for a week (useful for re-syncing)
   * Uses admin client to bypass RLS for server-side operations
   */
  static async deleteByWeek(week: number, season: number): Promise<void> {
    const { error } = await supabaseAdmin
      .from("fantasy_player_stats")
      .delete()
      .eq("week", week)
      .eq("season", season);

    if (error) throw error;
  }
}
