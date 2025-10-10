-- ================================
-- ROLLBACK RLS POLICIES
-- Keep the triggers (lock limit & timing) but remove RLS
-- ================================

-- ================================
-- DROP ALL RLS POLICIES
-- ================================

-- Picks table policies
DROP POLICY IF EXISTS "Users can view own picks anytime" ON picks;
DROP POLICY IF EXISTS "Users can view others picks for started games" ON picks;
DROP POLICY IF EXISTS "Users can insert own picks" ON picks;
DROP POLICY IF EXISTS "Users can update own picks" ON picks;
DROP POLICY IF EXISTS "Users can delete own picks" ON picks;

-- Profiles table policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Games table policies
DROP POLICY IF EXISTS "Games are viewable by everyone" ON games;
DROP POLICY IF EXISTS "Only service role can modify games" ON games;

-- Awards table policies
DROP POLICY IF EXISTS "Awards are viewable by everyone" ON awards;
DROP POLICY IF EXISTS "Only service role can manage awards" ON awards;

-- ================================
-- DISABLE RLS ON ALL TABLES
-- ================================

ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE games DISABLE ROW LEVEL SECURITY;
ALTER TABLE picks DISABLE ROW LEVEL SECURITY;
ALTER TABLE awards DISABLE ROW LEVEL SECURITY;

-- ================================
-- VERIFICATION
-- ================================

-- Note: The following triggers are STILL ACTIVE (and working fine):
-- ✅ enforce_lock_limit (prevents > 3 locks per week)
-- ✅ enforce_pick_timing (prevents picks after game starts)

COMMENT ON TABLE picks IS 'RLS disabled. Protected by triggers: lock limit and timing checks';
COMMENT ON TABLE profiles IS 'RLS disabled. Public access restored';
COMMENT ON TABLE games IS 'RLS disabled. Public access restored';
COMMENT ON TABLE awards IS 'RLS disabled. Public access restored';


