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
