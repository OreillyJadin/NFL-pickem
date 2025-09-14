import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://whvxcoganvbrriqpynre.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indodnhjb2dhbnZicnJpcXB5bnJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4NTUzMDUsImV4cCI6MjA3MjQzMTMwNX0.ACLWT5e3OmsgoWD6mWu33EmhMTznW2IQI9qKYAurlh8";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
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
  quarter?: number;
  time_remaining?: string;
  possession?: string;
  created_at: string;
}

export interface Pick {
  id: string;
  user_id: string;
  game_id: string;
  picked_team: string;
  is_lock: boolean;
  created_at: string;
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
