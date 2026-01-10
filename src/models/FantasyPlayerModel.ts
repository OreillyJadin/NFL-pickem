import { supabase, supabaseAdmin } from "@/config/supabase";
import { FantasyPlayer, FantasyPosition } from "@/types/database";

/**
 * FantasyPlayerModel - Database operations for fantasy players
 * Handles CRUD operations for the fantasy_players table
 */
export class FantasyPlayerModel {
  /**
   * Find all fantasy players
   */
  static async findAll(): Promise<FantasyPlayer[]> {
    const { data, error } = await supabase
      .from("fantasy_players")
      .select("*")
      .order("name");

    if (error) throw error;
    return data || [];
  }

  /**
   * Find players by position
   */
  static async findByPosition(position: FantasyPosition): Promise<FantasyPlayer[]> {
    const { data, error } = await supabase
      .from("fantasy_players")
      .select("*")
      .eq("position", position)
      .order("name");

    if (error) throw error;
    return data || [];
  }

  /**
   * Find players by team
   */
  static async findByTeam(team: string): Promise<FantasyPlayer[]> {
    const { data, error } = await supabase
      .from("fantasy_players")
      .select("*")
      .eq("team", team)
      .order("position", { ascending: true })
      .order("name");

    if (error) throw error;
    return data || [];
  }

  /**
   * Find player by ID
   */
  static async findById(id: string): Promise<FantasyPlayer | null> {
    const { data, error } = await supabase
      .from("fantasy_players")
      .select("*")
      .eq("id", id)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data;
  }

  /**
   * Find player by ESPN ID
   */
  static async findByEspnId(espnId: string): Promise<FantasyPlayer | null> {
    const { data, error } = await supabase
      .from("fantasy_players")
      .select("*")
      .eq("espn_id", espnId)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data;
  }

  /**
   * Search players by name
   */
  static async searchByName(query: string): Promise<FantasyPlayer[]> {
    const { data, error } = await supabase
      .from("fantasy_players")
      .select("*")
      .ilike("name", `%${query}%`)
      .order("name")
      .limit(50);

    if (error) throw error;
    return data || [];
  }

  /**
   * Find players eligible for a roster slot
   * FLEX can be RB, WR, or TE
   */
  static async findEligibleForSlot(slotType: string): Promise<FantasyPlayer[]> {
    let positions: FantasyPosition[];

    switch (slotType) {
      case "QB":
        positions = ["QB"];
        break;
      case "RB1":
      case "RB2":
        positions = ["RB"];
        break;
      case "WR1":
      case "WR2":
        positions = ["WR"];
        break;
      case "TE":
        positions = ["TE"];
        break;
      case "FLEX":
        positions = ["RB", "WR", "TE"];
        break;
      case "K":
        positions = ["K"];
        break;
      case "DST":
        positions = ["DST"];
        break;
      default:
        positions = ["QB", "RB", "WR", "TE", "K", "DST"];
    }

    const { data, error } = await supabase
      .from("fantasy_players")
      .select("*")
      .in("position", positions)
      .order("name");

    if (error) throw error;
    return data || [];
  }

  /**
   * Create or update a player (upsert by ESPN ID)
   * Uses admin client to bypass RLS
   */
  static async upsert(player: Omit<FantasyPlayer, "id" | "created_at">): Promise<FantasyPlayer> {
    const { data, error } = await supabaseAdmin
      .from("fantasy_players")
      .upsert(player, { onConflict: "espn_id" })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Bulk upsert players
   * Uses admin client to bypass RLS
   */
  static async bulkUpsert(
    players: Omit<FantasyPlayer, "id" | "created_at">[]
  ): Promise<FantasyPlayer[]> {
    const { data, error } = await supabaseAdmin
      .from("fantasy_players")
      .upsert(players, { onConflict: "espn_id" })
      .select();

    if (error) throw error;
    return data || [];
  }

  /**
   * Get all playoff teams (teams currently in playoffs)
   * This would be updated based on the current playoff bracket
   */
  static async getPlayoffTeams(): Promise<string[]> {
    // For 2025-2026 playoffs, these are the teams
    // This should ideally come from the games table or a config
    return [
      "BUF", "HOU", "LAC", "PIT", "DEN", "JAX", "NE", // AFC
      "PHI", "LAR", "GB", "SF", "SEA", "CAR", "CHI"   // NFC
    ];
  }

  /**
   * Find all players from playoff teams
   */
  static async findPlayoffPlayers(): Promise<FantasyPlayer[]> {
    const playoffTeams = await this.getPlayoffTeams();
    
    const { data, error } = await supabase
      .from("fantasy_players")
      .select("*")
      .in("team", playoffTeams)
      .order("position")
      .order("name");

    if (error) throw error;
    return data || [];
  }
}
