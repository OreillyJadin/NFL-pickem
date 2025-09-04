# Database Schema Update Guide

## Step 1: Update Database Schema in Supabase

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project: `whvxcoganvbrriqpynre`
3. Go to **SQL Editor** in the left sidebar
4. Copy and paste the following SQL and run it:

```sql
-- Add new columns to games table
ALTER TABLE public.games
ADD COLUMN IF NOT EXISTS season INTEGER DEFAULT 2025,
ADD COLUMN IF NOT EXISTS season_type TEXT DEFAULT 'regular' CHECK (season_type IN ('preseason', 'regular', 'playoffs')),
ADD COLUMN IF NOT EXISTS espn_id TEXT DEFAULT NULL;

-- Add is_admin column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Update existing games to have season and season_type
UPDATE public.games
SET season = 2025, season_type = 'regular'
WHERE season IS NULL OR season_type IS NULL;
```

## Step 2: Set Your Admin Status

After updating the schema, set yourself as admin:

```sql
-- Replace 'oreillyjadin24@gmail.com' with your actual email
UPDATE public.profiles
SET is_admin = TRUE
WHERE email = 'oreillyjadin24@gmail.com';
```

## Step 3: Sync Real NFL Data

After updating the schema, run:

```bash
node sync-real-nfl-data.js
```

This will sync:

- Preseason weeks 1-4 (completed games for testing)
- Regular season weeks 1-8 (real NFL schedule)

## Step 4: Test the Application

1. Go to http://localhost:3001
2. Sign in with your admin email
3. You should see the Admin link in navigation
4. Go to Admin page and sync data
5. Go to Dashboard and select different weeks/seasons

## What You'll See

- **Preseason Games**: All completed, locked for picks (good for testing past results)
- **Regular Season Week 1**: Real NFL games with actual scores and results
- **Regular Season Weeks 2-8**: Real NFL schedule (some may be locked based on current time)
- **Week Selector**: Choose between preseason and regular season
- **Real-time Locking**: Games lock automatically when kickoff time passes
