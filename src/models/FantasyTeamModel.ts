import { supabase, supabaseAdmin } from "@/config/supabase";
import {
  FantasyTeam,
  FantasyRosterSlot,
  FantasyTeamWithRoster,
  CreateFantasyTeamInput,
  UpdateFantasyTeamInput,
  RosterSlotType,
  ScoringFormat,
} from "@/types/database";

// All 9 roster slot types in order
export const ROSTER_SLOTS: RosterSlotType[] = [
  "QB",
  "RB1",
  "RB2",
  "WR1",
  "WR2",
  "TE",
  "FLEX",
  "DST",
  "K",
];

/**
 * FantasyTeamModel - Database operations for fantasy teams
 * Handles CRUD operations for fantasy_teams and fantasy_roster_slots tables
 */
export class FantasyTeamModel {
  /**
   * Find team by user ID and season
   */
  static async findByUserAndSeason(
    userId: string,
    season: number
  ): Promise<FantasyTeam | null> {
    const { data, error } = await supabase
      .from("fantasy_teams")
      .select("*")
      .eq("user_id", userId)
      .eq("season", season)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data;
  }

  /**
   * Find team by ID
   */
  static async findById(id: string): Promise<FantasyTeam | null> {
    const { data, error } = await supabase
      .from("fantasy_teams")
      .select("*")
      .eq("id", id)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data;
  }

  /**
   * Find team with full roster and player details
   */
  static async findWithRoster(teamId: string): Promise<FantasyTeamWithRoster | null> {
    const { data: team, error: teamError } = await supabase
      .from("fantasy_teams")
      .select(`
        *,
        user:profiles(id, username, email)
      `)
      .eq("id", teamId)
      .single();

    if (teamError && teamError.code !== "PGRST116") throw teamError;
    if (!team) return null;

    const { data: roster, error: rosterError } = await supabase
      .from("fantasy_roster_slots")
      .select(`
        *,
        player:fantasy_players(*)
      `)
      .eq("fantasy_team_id", teamId)
      .order("slot_type");

    if (rosterError) throw rosterError;

    return {
      ...team,
      roster: roster || [],
    };
  }

  /**
   * Find team by user ID with roster
   */
  static async findByUserWithRoster(
    userId: string,
    season: number
  ): Promise<FantasyTeamWithRoster | null> {
    const team = await this.findByUserAndSeason(userId, season);
    if (!team) return null;
    return this.findWithRoster(team.id);
  }

  /**
   * Create a new fantasy team with empty roster slots
   * Uses admin client to bypass RLS for server-side operations
   */
  static async create(input: CreateFantasyTeamInput): Promise<FantasyTeam> {
    const { data: team, error: teamError } = await supabaseAdmin
      .from("fantasy_teams")
      .insert({
        user_id: input.user_id,
        season: input.season,
        scoring_format: input.scoring_format || "ppr",
      })
      .select()
      .single();

    if (teamError) throw teamError;

    // Create empty roster slots
    const rosterSlots = ROSTER_SLOTS.map((slot_type) => ({
      fantasy_team_id: team.id,
      slot_type,
      player_id: null,
      points_ppr: 0,
      points_half_ppr: 0,
      points_standard: 0,
    }));

    const { error: slotError } = await supabaseAdmin
      .from("fantasy_roster_slots")
      .insert(rosterSlots);

    if (slotError) throw slotError;

    return team;
  }

  /**
   * Update a fantasy team
   * Uses admin client to bypass RLS for server-side operations
   */
  static async update(
    teamId: string,
    updates: UpdateFantasyTeamInput
  ): Promise<FantasyTeam> {
    const { data, error } = await supabaseAdmin
      .from("fantasy_teams")
      .update(updates)
      .eq("id", teamId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update scoring format preference
   */
  static async updateScoringFormat(
    teamId: string,
    format: ScoringFormat
  ): Promise<FantasyTeam> {
    return this.update(teamId, { scoring_format: format });
  }

  /**
   * Lock a team (no more roster changes allowed)
   */
  static async lockTeam(teamId: string): Promise<FantasyTeam> {
    return this.update(teamId, {
      is_locked: true,
      locked_at: new Date().toISOString(),
    });
  }

  /**
   * Get all locked teams for a season (for leaderboard)
   */
  static async findLockedTeams(season: number): Promise<FantasyTeamWithRoster[]> {
    const { data: teams, error: teamsError } = await supabase
      .from("fantasy_teams")
      .select(`
        *,
        user:profiles(id, username, email)
      `)
      .eq("season", season)
      .eq("is_locked", true)
      .order("total_points_ppr", { ascending: false });

    if (teamsError) throw teamsError;
    if (!teams || teams.length === 0) return [];

    // Get all rosters for these teams
    const teamIds = teams.map((t) => t.id);
    const { data: allRosters, error: rosterError } = await supabase
      .from("fantasy_roster_slots")
      .select(`
        *,
        player:fantasy_players(*)
      `)
      .in("fantasy_team_id", teamIds);

    if (rosterError) throw rosterError;

    // Group rosters by team
    const rostersByTeam = (allRosters || []).reduce((acc, slot) => {
      if (!acc[slot.fantasy_team_id]) {
        acc[slot.fantasy_team_id] = [];
      }
      acc[slot.fantasy_team_id].push(slot);
      return acc;
    }, {} as Record<string, FantasyRosterSlot[]>);

    return teams.map((team) => ({
      ...team,
      roster: rostersByTeam[team.id] || [],
    }));
  }

  /**
   * Set a player in a roster slot
   * Uses admin client to bypass RLS for server-side operations
   */
  static async setRosterSlot(
    teamId: string,
    slotType: RosterSlotType,
    playerId: string | null
  ): Promise<FantasyRosterSlot> {
    const { data, error } = await supabaseAdmin
      .from("fantasy_roster_slots")
      .update({ player_id: playerId })
      .eq("fantasy_team_id", teamId)
      .eq("slot_type", slotType)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get roster for a team
   */
  static async getRoster(teamId: string): Promise<FantasyRosterSlot[]> {
    const { data, error } = await supabase
      .from("fantasy_roster_slots")
      .select(`
        *,
        player:fantasy_players(*)
      `)
      .eq("fantasy_team_id", teamId)
      .order("slot_type");

    if (error) throw error;
    return data || [];
  }

  /**
   * Check if roster is complete (all slots filled)
   */
  static async isRosterComplete(teamId: string): Promise<boolean> {
    const roster = await this.getRoster(teamId);
    return roster.every((slot) => slot.player_id !== null);
  }

  /**
   * Update roster slot points
   * Uses admin client to bypass RLS for server-side operations
   */
  static async updateSlotPoints(
    slotId: string,
    points: {
      points_ppr: number;
      points_half_ppr: number;
      points_standard: number;
    }
  ): Promise<void> {
    const { error } = await supabaseAdmin
      .from("fantasy_roster_slots")
      .update(points)
      .eq("id", slotId);

    if (error) throw error;
  }

  /**
   * Recalculate and update team total points from roster
   */
  static async recalculateTotalPoints(teamId: string): Promise<FantasyTeam> {
    const roster = await this.getRoster(teamId);

    const totals = roster.reduce(
      (acc, slot) => ({
        total_points_ppr: acc.total_points_ppr + (slot.points_ppr || 0),
        total_points_half_ppr: acc.total_points_half_ppr + (slot.points_half_ppr || 0),
        total_points_standard: acc.total_points_standard + (slot.points_standard || 0),
      }),
      { total_points_ppr: 0, total_points_half_ppr: 0, total_points_standard: 0 }
    );

    return this.update(teamId, totals);
  }

  /**
   * Delete a fantasy team
   * Uses admin client to bypass RLS for server-side operations
   */
  static async delete(teamId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from("fantasy_teams")
      .delete()
      .eq("id", teamId);

    if (error) throw error;
  }
}
