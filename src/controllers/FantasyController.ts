import { FantasyPlayerModel } from "@/models/FantasyPlayerModel";
import { FantasyTeamModel, ROSTER_SLOTS } from "@/models/FantasyTeamModel";
import { FantasyStatsModel } from "@/models/FantasyStatsModel";
import {
  FantasyTeam,
  FantasyTeamWithRoster,
  FantasyPlayer,
  FantasyLeaderboardEntry,
  ScoringFormat,
  RosterSlotType,
  FantasyPosition,
} from "@/types/database";
import { getPointsByFormat } from "@/services/fantasy-scoring";

// Current playoff season
const CURRENT_SEASON = 2025;

/**
 * FantasyController - Business logic for fantasy football feature
 * Handles team management, roster operations, and leaderboard
 */
export class FantasyController {
  /**
   * Get or create a fantasy team for a user
   */
  static async getOrCreateTeam(
    userId: string,
    season: number = CURRENT_SEASON
  ): Promise<FantasyTeamWithRoster> {
    // Check if team exists
    let team = await FantasyTeamModel.findByUserWithRoster(userId, season);

    if (!team) {
      // Create new team with default PPR format
      const newTeam = await FantasyTeamModel.create({
        user_id: userId,
        season,
        scoring_format: "ppr",
      });

      team = await FantasyTeamModel.findWithRoster(newTeam.id);
      if (!team) {
        throw new Error("Failed to create fantasy team");
      }
    }

    return team;
  }

  /**
   * Get a team by ID with full roster
   */
  static async getTeam(teamId: string): Promise<FantasyTeamWithRoster | null> {
    return FantasyTeamModel.findWithRoster(teamId);
  }

  /**
   * Get a user's team for a season
   */
  static async getUserTeam(
    userId: string,
    season: number = CURRENT_SEASON
  ): Promise<FantasyTeamWithRoster | null> {
    return FantasyTeamModel.findByUserWithRoster(userId, season);
  }

  /**
   * Update user's preferred scoring format
   */
  static async updateScoringFormat(
    teamId: string,
    userId: string,
    format: ScoringFormat
  ): Promise<FantasyTeam> {
    // Verify ownership
    const team = await FantasyTeamModel.findById(teamId);
    if (!team) {
      throw new Error("Team not found");
    }
    if (team.user_id !== userId) {
      throw new Error("You can only update your own team");
    }

    return FantasyTeamModel.updateScoringFormat(teamId, format);
  }

  /**
   * Set a player in a roster slot
   */
  static async setRosterPlayer(
    teamId: string,
    userId: string,
    slotType: RosterSlotType,
    playerId: string
  ): Promise<FantasyTeamWithRoster> {
    // Verify ownership
    const team = await FantasyTeamModel.findById(teamId);
    if (!team) {
      throw new Error("Team not found");
    }
    if (team.user_id !== userId) {
      throw new Error("You can only update your own team");
    }
    if (team.is_locked) {
      throw new Error("Team is locked and cannot be modified");
    }

    // Verify player exists
    const player = await FantasyPlayerModel.findById(playerId);
    if (!player) {
      throw new Error("Player not found");
    }

    // Verify player is eligible for this slot
    const eligiblePositions = this.getEligiblePositions(slotType);
    if (!eligiblePositions.includes(player.position)) {
      throw new Error(
        `${player.position} is not eligible for ${slotType} slot`
      );
    }

    // Check player isn't already in another slot on this team
    const roster = await FantasyTeamModel.getRoster(teamId);
    const existingSlot = roster.find(
      (s) => s.player_id === playerId && s.slot_type !== slotType
    );
    if (existingSlot) {
      throw new Error(`${player.name} is already in your ${existingSlot.slot_type} slot`);
    }

    // Set the player in the slot
    await FantasyTeamModel.setRosterSlot(teamId, slotType, playerId);

    // Return updated team
    const updatedTeam = await FantasyTeamModel.findWithRoster(teamId);
    if (!updatedTeam) {
      throw new Error("Failed to get updated team");
    }

    return updatedTeam;
  }

  /**
   * Remove a player from a roster slot
   */
  static async removeRosterPlayer(
    teamId: string,
    userId: string,
    slotType: RosterSlotType
  ): Promise<FantasyTeamWithRoster> {
    // Verify ownership
    const team = await FantasyTeamModel.findById(teamId);
    if (!team) {
      throw new Error("Team not found");
    }
    if (team.user_id !== userId) {
      throw new Error("You can only update your own team");
    }
    if (team.is_locked) {
      throw new Error("Team is locked and cannot be modified");
    }

    // Clear the slot
    await FantasyTeamModel.setRosterSlot(teamId, slotType, null);

    // Return updated team
    const updatedTeam = await FantasyTeamModel.findWithRoster(teamId);
    if (!updatedTeam) {
      throw new Error("Failed to get updated team");
    }

    return updatedTeam;
  }

  /**
   * Lock a team (no more changes allowed)
   */
  static async lockTeam(
    teamId: string,
    userId: string
  ): Promise<FantasyTeamWithRoster> {
    // Verify ownership
    const team = await FantasyTeamModel.findById(teamId);
    if (!team) {
      throw new Error("Team not found");
    }
    if (team.user_id !== userId) {
      throw new Error("You can only lock your own team");
    }
    if (team.is_locked) {
      throw new Error("Team is already locked");
    }

    // Verify roster is complete
    const isComplete = await FantasyTeamModel.isRosterComplete(teamId);
    if (!isComplete) {
      throw new Error("Cannot lock team - roster is incomplete");
    }

    // Lock the team
    await FantasyTeamModel.lockTeam(teamId);

    // Return updated team
    const updatedTeam = await FantasyTeamModel.findWithRoster(teamId);
    if (!updatedTeam) {
      throw new Error("Failed to get updated team");
    }

    return updatedTeam;
  }

  /**
   * Get fantasy leaderboard for a season
   * Returns all locked teams with points in all formats
   */
  static async getLeaderboard(
    season: number = CURRENT_SEASON
  ): Promise<FantasyLeaderboardEntry[]> {
    const teams = await FantasyTeamModel.findLockedTeams(season);

    return teams.map((team, index) => ({
      team,
      user: team.user!,
      rank: index + 1, // Default rank by PPR
    }));
  }

  /**
   * Get leaderboard sorted by a specific format
   */
  static async getLeaderboardByFormat(
    season: number = CURRENT_SEASON,
    format: ScoringFormat = "ppr"
  ): Promise<FantasyLeaderboardEntry[]> {
    const teams = await FantasyTeamModel.findLockedTeams(season);

    // Sort by the selected format
    const sorted = teams.sort((a, b) => {
      const aPoints = getPointsByFormat(
        {
          points_ppr: a.total_points_ppr,
          points_half_ppr: a.total_points_half_ppr,
          points_standard: a.total_points_standard,
        },
        format
      );
      const bPoints = getPointsByFormat(
        {
          points_ppr: b.total_points_ppr,
          points_half_ppr: b.total_points_half_ppr,
          points_standard: b.total_points_standard,
        },
        format
      );
      return bPoints - aPoints;
    });

    return sorted.map((team, index) => ({
      team,
      user: team.user!,
      rank: index + 1,
    }));
  }

  /**
   * Get available players for a roster slot
   */
  static async getAvailablePlayers(
    slotType: RosterSlotType,
    searchQuery?: string
  ): Promise<FantasyPlayer[]> {
    if (searchQuery && searchQuery.length >= 2) {
      const players = await FantasyPlayerModel.searchByName(searchQuery);
      // Filter by eligible positions
      const eligiblePositions = this.getEligiblePositions(slotType);
      return players.filter((p) => eligiblePositions.includes(p.position));
    }

    return FantasyPlayerModel.findEligibleForSlot(slotType);
  }

  /**
   * Get all fantasy players (for browsing)
   */
  static async getAllPlayers(): Promise<FantasyPlayer[]> {
    return FantasyPlayerModel.findPlayoffPlayers();
  }

  /**
   * Get players by position
   */
  static async getPlayersByPosition(
    position: FantasyPosition
  ): Promise<FantasyPlayer[]> {
    return FantasyPlayerModel.findByPosition(position);
  }

  /**
   * Get a player's total fantasy points for the season
   */
  static async getPlayerSeasonPoints(
    playerId: string,
    season: number = CURRENT_SEASON
  ): Promise<{ ppr: number; half_ppr: number; standard: number }> {
    return FantasyStatsModel.getPlayerTotalPoints(playerId, season);
  }

  /**
   * Helper: Get eligible positions for a roster slot
   */
  private static getEligiblePositions(slotType: RosterSlotType): FantasyPosition[] {
    switch (slotType) {
      case "QB":
        return ["QB"];
      case "RB1":
      case "RB2":
        return ["RB"];
      case "WR1":
      case "WR2":
        return ["WR"];
      case "TE":
        return ["TE"];
      case "FLEX":
        return ["RB", "WR", "TE"];
      case "K":
        return ["K"];
      case "DST":
        return ["DST"];
      default:
        return [];
    }
  }

  /**
   * Helper: Get all roster slot types
   */
  static getRosterSlots(): RosterSlotType[] {
    return ROSTER_SLOTS;
  }

  /**
   * Helper: Get display name for a roster slot
   */
  static getSlotDisplayName(slotType: RosterSlotType): string {
    switch (slotType) {
      case "QB":
        return "Quarterback";
      case "RB1":
        return "Running Back 1";
      case "RB2":
        return "Running Back 2";
      case "WR1":
        return "Wide Receiver 1";
      case "WR2":
        return "Wide Receiver 2";
      case "TE":
        return "Tight End";
      case "FLEX":
        return "Flex (RB/WR/TE)";
      case "K":
        return "Kicker";
      case "DST":
        return "Defense/ST";
      default:
        return slotType;
    }
  }

  /**
   * Helper: Check if roster is complete
   */
  static async isRosterComplete(teamId: string): Promise<boolean> {
    return FantasyTeamModel.isRosterComplete(teamId);
  }
}
