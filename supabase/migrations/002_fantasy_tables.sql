-- Fantasy Football Tables Migration
-- Version: 0.9.0
-- Description: Add fantasy football feature tables for playoffs

-- ============================================
-- 1. Fantasy Players Table
-- Stores NFL players available for fantasy selection
-- ============================================
CREATE TABLE IF NOT EXISTS fantasy_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  espn_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  team TEXT NOT NULL,           -- NFL team abbreviation (KC, PHI, etc.)
  position TEXT NOT NULL,       -- QB, RB, WR, TE, K, DST
  headshot_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for searching players by position and team
CREATE INDEX IF NOT EXISTS idx_fantasy_players_position ON fantasy_players(position);
CREATE INDEX IF NOT EXISTS idx_fantasy_players_team ON fantasy_players(team);

-- ============================================
-- 2. Fantasy Teams Table
-- Stores user's fantasy roster configuration
-- ============================================
CREATE TABLE IF NOT EXISTS fantasy_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  season INTEGER NOT NULL,
  scoring_format TEXT NOT NULL DEFAULT 'ppr', -- User's preferred format: 'ppr', 'half_ppr', 'standard'
  is_locked BOOLEAN DEFAULT FALSE,
  locked_at TIMESTAMPTZ,
  -- Store totals in all 3 formats for instant leaderboard switching
  total_points_ppr DECIMAL(10,2) DEFAULT 0,
  total_points_half_ppr DECIMAL(10,2) DEFAULT 0,
  total_points_standard DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, season)
);

-- Index for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_fantasy_teams_season ON fantasy_teams(season);
CREATE INDEX IF NOT EXISTS idx_fantasy_teams_locked ON fantasy_teams(is_locked) WHERE is_locked = TRUE;

-- ============================================
-- 3. Fantasy Roster Slots Table
-- Individual roster positions for each team
-- ============================================
CREATE TABLE IF NOT EXISTS fantasy_roster_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fantasy_team_id UUID REFERENCES fantasy_teams(id) ON DELETE CASCADE NOT NULL,
  slot_type TEXT NOT NULL,      -- 'QB', 'RB1', 'RB2', 'WR1', 'WR2', 'TE', 'FLEX', 'DST', 'K'
  player_id UUID REFERENCES fantasy_players(id) ON DELETE SET NULL,
  -- Store all 3 point formats for instant client-side switching
  points_ppr DECIMAL(10,2) DEFAULT 0,
  points_half_ppr DECIMAL(10,2) DEFAULT 0,
  points_standard DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(fantasy_team_id, slot_type)
);

-- Index for quick roster lookups
CREATE INDEX IF NOT EXISTS idx_fantasy_roster_team ON fantasy_roster_slots(fantasy_team_id);

-- ============================================
-- 4. Fantasy Player Stats Table
-- Weekly player stats for point calculation
-- ============================================
CREATE TABLE IF NOT EXISTS fantasy_player_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES fantasy_players(id) ON DELETE CASCADE NOT NULL,
  week INTEGER NOT NULL,
  season INTEGER NOT NULL,
  game_id TEXT,                 -- ESPN game ID for reference
  
  -- Passing stats
  passing_yards INTEGER DEFAULT 0,
  passing_tds INTEGER DEFAULT 0,
  interceptions INTEGER DEFAULT 0,
  
  -- Rushing stats
  rushing_yards INTEGER DEFAULT 0,
  rushing_tds INTEGER DEFAULT 0,
  
  -- Receiving stats
  receptions INTEGER DEFAULT 0,
  receiving_yards INTEGER DEFAULT 0,
  receiving_tds INTEGER DEFAULT 0,
  
  -- Other offensive stats
  fumbles_lost INTEGER DEFAULT 0,
  two_point_conversions INTEGER DEFAULT 0,
  
  -- Defense/Special Teams stats
  dst_points_allowed INTEGER,
  dst_sacks INTEGER DEFAULT 0,
  dst_interceptions INTEGER DEFAULT 0,
  dst_fumble_recoveries INTEGER DEFAULT 0,
  dst_safeties INTEGER DEFAULT 0,
  dst_tds INTEGER DEFAULT 0,
  dst_blocked_kicks INTEGER DEFAULT 0,
  
  -- Kicker stats
  fg_made_0_39 INTEGER DEFAULT 0,
  fg_made_40_49 INTEGER DEFAULT 0,
  fg_made_50_plus INTEGER DEFAULT 0,
  fg_missed INTEGER DEFAULT 0,
  xp_made INTEGER DEFAULT 0,
  xp_missed INTEGER DEFAULT 0,
  
  -- Calculated points (cached for each format)
  points_ppr DECIMAL(10,2) DEFAULT 0,
  points_half_ppr DECIMAL(10,2) DEFAULT 0,
  points_standard DECIMAL(10,2) DEFAULT 0,
  
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(player_id, week, season)
);

-- Index for stats lookups
CREATE INDEX IF NOT EXISTS idx_fantasy_stats_week_season ON fantasy_player_stats(week, season);
CREATE INDEX IF NOT EXISTS idx_fantasy_stats_player ON fantasy_player_stats(player_id);

-- ============================================
-- Row Level Security Policies
-- ============================================

-- Enable RLS on all fantasy tables
ALTER TABLE fantasy_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE fantasy_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE fantasy_roster_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE fantasy_player_stats ENABLE ROW LEVEL SECURITY;

-- Fantasy Players: Everyone can read, only service role can insert/update
CREATE POLICY "Anyone can view fantasy players"
  ON fantasy_players FOR SELECT
  USING (true);

-- Fantasy Teams: Users can manage their own teams, everyone can view locked teams
CREATE POLICY "Users can view all fantasy teams"
  ON fantasy_teams FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own fantasy team"
  ON fantasy_teams FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own unlocked fantasy team"
  ON fantasy_teams FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own unlocked fantasy team"
  ON fantasy_teams FOR DELETE
  USING (auth.uid() = user_id AND is_locked = FALSE);

-- Fantasy Roster Slots: Users can manage slots for their own teams
CREATE POLICY "Anyone can view roster slots"
  ON fantasy_roster_slots FOR SELECT
  USING (true);

CREATE POLICY "Users can insert roster slots for their own team"
  ON fantasy_roster_slots FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM fantasy_teams 
      WHERE fantasy_teams.id = fantasy_team_id 
      AND fantasy_teams.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update roster slots for their own unlocked team"
  ON fantasy_roster_slots FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM fantasy_teams 
      WHERE fantasy_teams.id = fantasy_team_id 
      AND fantasy_teams.user_id = auth.uid()
      AND fantasy_teams.is_locked = FALSE
    )
  );

-- Fantasy Player Stats: Everyone can read, only service role can insert/update
CREATE POLICY "Anyone can view fantasy player stats"
  ON fantasy_player_stats FOR SELECT
  USING (true);
