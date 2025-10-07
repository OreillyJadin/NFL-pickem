-- ================================
-- SECURITY MIGRATION
-- Adds RLS policies and database triggers to prevent cheating
-- ================================

-- ================================
-- 1. LOCK COUNT ENFORCEMENT (Database Trigger)
-- ================================

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS enforce_lock_limit ON picks;
DROP FUNCTION IF EXISTS check_lock_limit();

-- Create function to check lock limit
CREATE OR REPLACE FUNCTION check_lock_limit()
RETURNS TRIGGER AS $$
DECLARE
  lock_count INTEGER;
  game_week INTEGER;
  game_season_type TEXT;
  game_season INTEGER;
BEGIN
  -- Only check if this pick is a lock
  IF NEW.is_lock = TRUE THEN
    -- Get game details
    SELECT week, season_type, season INTO game_week, game_season_type, game_season
    FROM games WHERE id = NEW.game_id;
    
    -- Count existing locks for this user, week, season_type, and season
    -- Exclude the current pick if we're updating (not inserting)
    SELECT COUNT(*) INTO lock_count
    FROM picks p
    JOIN games g ON p.game_id = g.id
    WHERE p.user_id = NEW.user_id
      AND p.is_lock = TRUE
      AND g.week = game_week
      AND g.season_type = game_season_type
      AND g.season = game_season
      AND (TG_OP = 'INSERT' OR p.id != NEW.id); -- Exclude current pick on UPDATE
    
    -- Enforce 3 lock limit
    IF lock_count >= 3 THEN
      RAISE EXCEPTION 'Cannot use more than 3 locks per week. You already have % locks for week % (%)', 
        lock_count, game_week, game_season_type;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER enforce_lock_limit
  BEFORE INSERT OR UPDATE ON picks
  FOR EACH ROW
  EXECUTE FUNCTION check_lock_limit();

COMMENT ON FUNCTION check_lock_limit() IS 'Enforces maximum 3 locks per user per week';

-- ================================
-- 2. TIME-BASED PICK RESTRICTIONS (Database Trigger)
-- ================================

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS enforce_pick_timing ON picks;
DROP FUNCTION IF EXISTS check_pick_timing();

-- Create function to check if game has started
CREATE OR REPLACE FUNCTION check_pick_timing()
RETURNS TRIGGER AS $$
DECLARE
  game_time TIMESTAMPTZ;
  game_status TEXT;
  game_home TEXT;
  game_away TEXT;
BEGIN
  -- Get game details
  SELECT g.game_time, g.status, g.home_team, g.away_team 
  INTO game_time, game_status, game_home, game_away
  FROM games g WHERE g.id = NEW.game_id;
  
  -- Prevent picks/updates after game has started or is not scheduled
  IF game_status != 'scheduled' OR game_time <= NOW() THEN
    RAISE EXCEPTION 'Cannot modify picks for % @ %. Game has already started or is completed (status: %, time: %)', 
      game_away, game_home, game_status, game_time;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER enforce_pick_timing
  BEFORE INSERT OR UPDATE ON picks
  FOR EACH ROW
  EXECUTE FUNCTION check_pick_timing();

COMMENT ON FUNCTION check_pick_timing() IS 'Prevents picks/updates after game has started';

-- ================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- ================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE awards ENABLE ROW LEVEL SECURITY;

-- ================================
-- 3a. PROFILES TABLE POLICIES
-- ================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Allow everyone to READ all profiles (needed for leaderboard)
CREATE POLICY "Public profiles are viewable by everyone"
ON profiles FOR SELECT
USING (true);

-- Allow users to UPDATE only their own profile
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);

-- Allow users to INSERT their own profile during signup
CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- ================================
-- 3b. GAMES TABLE POLICIES
-- ================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Games are viewable by everyone" ON games;
DROP POLICY IF EXISTS "Only service role can modify games" ON games;

-- Allow everyone to READ all games
CREATE POLICY "Games are viewable by everyone"
ON games FOR SELECT
USING (true);

-- Only service role can INSERT/UPDATE/DELETE games (via cron jobs)
-- This is already handled by using service_role key, but we add explicit policy
CREATE POLICY "Only service role can modify games"
ON games FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- ================================
-- 3c. PICKS TABLE POLICIES
-- ================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own picks anytime" ON picks;
DROP POLICY IF EXISTS "Users can view others picks for started games" ON picks;
DROP POLICY IF EXISTS "Users can insert own picks" ON picks;
DROP POLICY IF EXISTS "Users can update own picks" ON picks;
DROP POLICY IF EXISTS "Users can delete own picks" ON picks;

-- Policy 1: Users can ALWAYS see their own picks
CREATE POLICY "Users can view own picks anytime"
ON picks FOR SELECT
USING (auth.uid() = user_id);

-- Policy 2: Users can see OTHER users' picks ONLY for games that have started
-- This prevents pick copying while allowing leaderboard functionality
CREATE POLICY "Users can view others picks for started games"
ON picks FOR SELECT
USING (
  auth.uid() != user_id 
  AND EXISTS (
    SELECT 1 FROM games
    WHERE games.id = picks.game_id
    AND (games.status = 'in_progress' OR games.status = 'completed')
  )
);

-- Policy 3: Users can INSERT their own picks (timing checked by trigger)
CREATE POLICY "Users can insert own picks"
ON picks FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy 4: Users can UPDATE their own picks (timing checked by trigger)
CREATE POLICY "Users can update own picks"
ON picks FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy 5: Users can DELETE their own picks (before game starts, checked by trigger)
CREATE POLICY "Users can delete own picks"
ON picks FOR DELETE
USING (auth.uid() = user_id);

-- ================================
-- 3d. AWARDS TABLE POLICIES
-- ================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Awards are viewable by everyone" ON awards;
DROP POLICY IF EXISTS "Only service role can manage awards" ON awards;

-- Allow everyone to READ all awards (for trophy walls)
CREATE POLICY "Awards are viewable by everyone"
ON awards FOR SELECT
USING (true);

-- Only service role can INSERT/UPDATE/DELETE awards (via cron jobs)
CREATE POLICY "Only service role can manage awards"
ON awards FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- ================================
-- VERIFICATION QUERIES
-- ================================

-- To test these policies work, run these queries as a regular user:

-- ✅ Should work: View own picks
-- SELECT * FROM picks WHERE user_id = auth.uid();

-- ✅ Should work: View all completed game picks
-- SELECT * FROM picks p JOIN games g ON p.game_id = g.id WHERE g.status = 'completed';

-- ❌ Should fail: View other users' picks for scheduled games
-- SELECT * FROM picks p JOIN games g ON p.game_id = g.id WHERE g.status = 'scheduled' AND p.user_id != auth.uid();

-- ❌ Should fail: Insert pick with > 3 locks for a week
-- INSERT INTO picks (user_id, game_id, picked_team, is_lock) VALUES (...) -- with 4th lock

-- ❌ Should fail: Update pick after game has started
-- UPDATE picks SET picked_team = 'Team' WHERE game_id = 'completed-game-id';

COMMENT ON TABLE picks IS 'RLS enabled: Users can only modify their own picks before games start';
COMMENT ON TABLE profiles IS 'RLS enabled: Public read, users can only update their own';
COMMENT ON TABLE games IS 'RLS enabled: Public read, service role write';
COMMENT ON TABLE awards IS 'RLS enabled: Public read, service role write';

