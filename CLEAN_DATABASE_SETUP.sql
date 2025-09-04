-- =============================================
-- NFL PICK'EM APP - COMPLETE DATABASE SETUP
-- =============================================
-- 
-- This script sets up the entire database schema for your NFL Pick'em app.
-- It's safe to run multiple times - all commands use "IF NOT EXISTS" or "IF EXISTS".
--
-- WHAT THIS SCRIPT DOES:
-- 1. Creates all necessary tables (profiles, games, picks, awards, audit_log)
-- 2. Sets up Row Level Security (RLS) policies for data protection
-- 3. Creates admin-specific policies for your account
-- 4. Adds performance indexes
-- 5. Sets up auto-profile creation when users sign up
-- 6. Makes your account (oreillyjadin24@gmail.com) an admin
--
-- HOW TO USE:
-- 1. Copy this entire script
-- 2. Paste it into your Supabase SQL Editor
-- 3. Click "Run" - it will execute all commands safely
-- 4. Check the results - you should see "Success" for all commands
--
-- =============================================

-- =============================================
-- 1. CREATE TABLES
-- =============================================
-- These tables store all the data for your app

-- Profiles table - stores user information
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,  -- This column determines admin access
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Games table - stores NFL game information
CREATE TABLE IF NOT EXISTS public.games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  week INTEGER NOT NULL,                    -- Week number (1-18)
  season INTEGER DEFAULT 2025,              -- Season year
  season_type TEXT DEFAULT 'regular' CHECK (season_type IN ('preseason', 'regular', 'playoffs')),
  home_team TEXT NOT NULL,                  -- Home team name
  away_team TEXT NOT NULL,                  -- Away team name
  game_time TIMESTAMP WITH TIME ZONE NOT NULL,  -- When the game starts
  home_score INTEGER DEFAULT NULL,          -- Home team's score (NULL until game ends)
  away_score INTEGER DEFAULT NULL,          -- Away team's score (NULL until game ends)
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed')),
  espn_id TEXT DEFAULT NULL,                -- ESPN's game ID for syncing
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Picks table - stores user picks for each game
CREATE TABLE IF NOT EXISTS public.picks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  game_id UUID REFERENCES public.games(id) ON DELETE CASCADE NOT NULL,
  picked_team TEXT NOT NULL,                -- Which team the user picked
  is_lock BOOLEAN DEFAULT FALSE,            -- Whether this is a lock pick (+2/-2 points)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, game_id)                  -- Users can only pick once per game
);

-- Awards table - stores weekly awards and trophies
CREATE TABLE IF NOT EXISTS public.awards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  week INTEGER NOT NULL,                    -- Which week the award was earned
  season INTEGER NOT NULL,                  -- Which season
  season_type TEXT NOT NULL CHECK (season_type IN ('preseason', 'regular', 'playoffs')),
  award_type TEXT NOT NULL CHECK (award_type IN ('top_scorer', 'lowest_scorer', 'perfect_week', 'cold_week')),
  points INTEGER NOT NULL,                  -- Points earned for this award
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, week, season, season_type, award_type)  -- No duplicate awards
);

-- Audit log table - tracks admin actions for security
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,                     -- What action was performed
  details JSONB,                            -- Additional details about the action
  ip_address TEXT,                          -- IP address of the user
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 2. ROW LEVEL SECURITY POLICIES
-- =============================================
-- These policies control who can access what data
-- RLS = Row Level Security = Database-level access control

-- PROFILES POLICIES
-- Users can only see and modify their own profile
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- GAMES POLICIES
-- Everyone can view games (needed for the schedule)
DROP POLICY IF EXISTS "Anyone can view games" ON public.games;
CREATE POLICY "Anyone can view games" ON public.games
  FOR SELECT USING (true);

-- PICKS POLICIES
-- Users can only see and modify their own picks
DROP POLICY IF EXISTS "Users can view their own picks" ON public.picks;
CREATE POLICY "Users can view their own picks" ON public.picks
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own picks" ON public.picks;
CREATE POLICY "Users can insert their own picks" ON public.picks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own picks" ON public.picks;
CREATE POLICY "Users can update their own picks" ON public.picks
  FOR UPDATE USING (auth.uid() = user_id);

-- AWARDS POLICIES
-- Users can see their own awards
DROP POLICY IF EXISTS "Users can view their own awards" ON public.awards;
CREATE POLICY "Users can view their own awards" ON public.awards
  FOR SELECT USING (auth.uid() = user_id);

-- Everyone can see awards for the leaderboard
DROP POLICY IF EXISTS "Users can view all awards for leaderboard" ON public.awards;
CREATE POLICY "Users can view all awards for leaderboard" ON public.awards
  FOR SELECT USING (true);

-- =============================================
-- 3. ADMIN POLICIES (SECURITY)
-- =============================================
-- These policies give admin users special privileges
-- Only users with is_admin = TRUE can access these

-- ADMIN PICKS POLICIES
-- Admins can view, update, and insert picks for any user
DROP POLICY IF EXISTS "Admins can view all picks" ON public.picks;
CREATE POLICY "Admins can view all picks" ON public.picks
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

DROP POLICY IF EXISTS "Admins can update any picks" ON public.picks;
CREATE POLICY "Admins can update any picks" ON public.picks
  FOR UPDATE USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

DROP POLICY IF EXISTS "Admins can insert picks for any user" ON public.picks;
CREATE POLICY "Admins can insert picks for any user" ON public.picks
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- ADMIN PROFILES POLICIES
-- Admins can view all user profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- ADMIN GAMES POLICIES
-- Admins can modify games (for syncing NFL data)
DROP POLICY IF EXISTS "Admins can modify games" ON public.games;
CREATE POLICY "Admins can modify games" ON public.games
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- ADMIN AWARDS POLICIES
-- Admins can manage awards (for processing weekly awards)
DROP POLICY IF EXISTS "Admins can manage awards" ON public.awards;
CREATE POLICY "Admins can manage awards" ON public.awards
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- ADMIN AUDIT LOG POLICIES
-- Only admins can view the audit log
DROP POLICY IF EXISTS "Admins can view audit log" ON public.admin_audit_log;
CREATE POLICY "Admins can view audit log" ON public.admin_audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- =============================================
-- 4. PERFORMANCE INDEXES
-- =============================================
-- These indexes make database queries faster
-- Think of them as a "table of contents" for your data

-- Index for finding admin users quickly
CREATE INDEX IF NOT EXISTS idx_profiles_admin ON public.profiles(is_admin);

-- Indexes for awards queries (leaderboard, user awards)
CREATE INDEX IF NOT EXISTS idx_awards_user_season ON public.awards(user_id, season, season_type);
CREATE INDEX IF NOT EXISTS idx_awards_week_season ON public.awards(week, season, season_type);

-- Indexes for audit log queries
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON public.admin_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON public.admin_audit_log(created_at);

-- =============================================
-- 5. SET YOUR ACCOUNT AS ADMIN
-- =============================================
-- This makes your account (oreillyjadin24@gmail.com) an admin
-- You can change this email to any other admin email

UPDATE public.profiles
SET is_admin = TRUE
WHERE email = 'oreillyjadin24@gmail.com';

-- =============================================
-- 6. AUTO-PROFILE CREATION
-- =============================================
-- This automatically creates a profile when a new user signs up
-- Without this, users would have to manually create profiles

-- Function that runs when a new user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create a profile for the new user
  INSERT INTO public.profiles (id, username, email)
  VALUES (NEW.id, NEW.email, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger that calls the function when a user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- 7. VERIFICATION QUERIES
-- =============================================
-- Run these to verify everything was created correctly

-- Check if all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'games', 'picks', 'awards', 'admin_audit_log');

-- Check if your account is admin
SELECT username, email, is_admin 
FROM public.profiles 
WHERE email = 'oreillyjadin24@gmail.com';

-- Check if policies were created
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;

-- =============================================
-- SUCCESS! 🎉
-- =============================================
-- If you see this message and no errors above, your database is set up correctly!
-- You can now:
-- 1. Run your Next.js app (npm run dev)
-- 2. Sign up with your admin email
-- 3. Access the admin panel at /admin
-- 4. Start using your NFL Pick'em app!