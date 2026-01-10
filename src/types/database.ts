// Database type definitions
export interface User {
  id: string;
  email: string;
  username: string;
  bio?: string;
  created_at: string;
  is_admin?: boolean;
}

export interface Game {
  id: string;
  week: number;
  season: number;
  season_type: "preseason" | "regular" | "playoffs";
  home_team: string;
  away_team: string;
  game_time: string;
  home_score?: number;
  away_score?: number;
  status: "scheduled" | "in_progress" | "completed";
  espn_id?: string;
  tv?: string;
  quarter?: number; // 1-4 for regular quarters, 5+ for overtime (5=1OT, 6=2OT, etc.)
  time_remaining?: string;
  possession?: string;
  halftime?: boolean;
  created_at: string;
  last_synced?: string;
}

export interface Pick {
  id: string;
  user_id: string;
  game_id: string;
  picked_team: string;
  is_lock: boolean;
  created_at: string;
  solo_pick?: boolean;
  solo_lock?: boolean;
  super_bonus?: boolean;
  bonus_points?: number;
  pick_points?: number;
}

export interface Award {
  id: string;
  user_id: string;
  week: number;
  season: number;
  season_type: string;
  award_type:
    | "top_scorer"
    | "second_scorer"
    | "third_scorer"
    | "lowest_scorer"
    | "perfect_week"
    | "cold_week";
  points: number;
  record?: string;
  created_at: string;
}

export interface Feedback {
  id: string;
  user_id?: string | null;
  type: "bug" | "suggestion" | "general";
  message: string;
  user_agent?: string;
  ip_address?: string;
  created_at: string;
}

// Input types for creating records
export interface CreatePickInput {
  user_id: string;
  game_id: string;
  picked_team: string;
  is_lock: boolean;
}

export interface CreateFeedbackInput {
  user_id?: string | null;
  type: "bug" | "suggestion" | "general";
  message: string;
  user_agent?: string;
  ip_address?: string;
  created_at?: string;
}

export interface CreateAwardInput {
  user_id: string;
  week: number;
  season: number;
  season_type: string;
  award_type: Award["award_type"];
  points: number;
  record?: string;
}

export interface UpdateUserInput {
  username?: string;
  bio?: string;
}

export interface UpdateGameInput {
  home_score?: number;
  away_score?: number;
  status?: Game["status"];
  quarter?: number;
  time_remaining?: string;
  possession?: string;
  halftime?: boolean;
  tv?: string;
  last_synced?: string;
}

export interface UpdatePickInput {
  picked_team?: string;
  is_lock?: boolean;
  solo_pick?: boolean;
  solo_lock?: boolean;
  super_bonus?: boolean;
  bonus_points?: number;
  pick_points?: number;
}

// ============================================
// Fantasy Football Types
// ============================================

export type ScoringFormat = "ppr" | "half_ppr" | "standard";

export type FantasyPosition = "QB" | "RB" | "WR" | "TE" | "K" | "DST";

export type RosterSlotType =
  | "QB"
  | "RB1"
  | "RB2"
  | "WR1"
  | "WR2"
  | "TE"
  | "FLEX"
  | "DST"
  | "K";

export interface FantasyPlayer {
  id: string;
  espn_id: string;
  name: string;
  team: string;
  position: FantasyPosition;
  headshot_url?: string;
  created_at: string;
}

export interface FantasyTeam {
  id: string;
  user_id: string;
  season: number;
  scoring_format: ScoringFormat;
  is_locked: boolean;
  locked_at?: string;
  total_points_ppr: number;
  total_points_half_ppr: number;
  total_points_standard: number;
  created_at: string;
}

export interface FantasyRosterSlot {
  id: string;
  fantasy_team_id: string;
  slot_type: RosterSlotType;
  player_id?: string;
  points_ppr: number;
  points_half_ppr: number;
  points_standard: number;
  created_at: string;
  // Joined data
  player?: FantasyPlayer;
}

export interface FantasyPlayerStats {
  id: string;
  player_id: string;
  week: number;
  season: number;
  game_id?: string;
  // Passing stats
  passing_yards: number;
  passing_tds: number;
  interceptions: number;
  // Rushing stats
  rushing_yards: number;
  rushing_tds: number;
  // Receiving stats
  receptions: number;
  receiving_yards: number;
  receiving_tds: number;
  // Other
  fumbles_lost: number;
  two_point_conversions: number;
  // Defense stats
  dst_points_allowed?: number;
  dst_sacks: number;
  dst_interceptions: number;
  dst_fumble_recoveries: number;
  dst_safeties: number;
  dst_tds: number;
  dst_blocked_kicks: number;
  // Kicker stats
  fg_made_0_39: number;
  fg_made_40_49: number;
  fg_made_50_plus: number;
  fg_missed: number;
  xp_made: number;
  xp_missed: number;
  // Calculated points
  points_ppr: number;
  points_half_ppr: number;
  points_standard: number;
  last_updated: string;
}

// Fantasy Input Types
export interface CreateFantasyTeamInput {
  user_id: string;
  season: number;
  scoring_format?: ScoringFormat;
}

export interface UpdateFantasyTeamInput {
  scoring_format?: ScoringFormat;
  is_locked?: boolean;
  locked_at?: string;
  total_points_ppr?: number;
  total_points_half_ppr?: number;
  total_points_standard?: number;
}

export interface SetRosterSlotInput {
  fantasy_team_id: string;
  slot_type: RosterSlotType;
  player_id: string;
}

export interface FantasyTeamWithRoster extends FantasyTeam {
  roster: FantasyRosterSlot[];
  user?: User;
}

export interface FantasyLeaderboardEntry {
  team: FantasyTeam;
  user: User;
  rank?: number;
}
