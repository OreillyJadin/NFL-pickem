# Database Setup - Step by Step

## Quick Fix for Permission Error

The error "must be owner of table users" occurs because Supabase manages the `auth.users` table. Here's how to fix it:

### Step 1: Use the Simplified Schema

1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/whvxcoganvbrriqpynre
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `supabase-schema-simple.sql`
4. Click **Run**

This will create:

- ✅ `profiles` table
- ✅ `games` table
- ✅ `picks` table
- ✅ Row Level Security policies

### Step 2: Test the App

1. Your app is running at http://localhost:3001
2. Try registering a new user
3. The profile will be created automatically in the code

### Step 3: Sync Mock Data

1. Go to http://localhost:3001/admin
2. Click "Sync Week 1 Games"
3. Check your Supabase dashboard to see the games

## What's Different?

- **No trigger on auth.users**: We create profiles manually in the signup code
- **Same functionality**: Everything works the same way
- **No permission issues**: Uses only tables you can create

## Verification

After running the schema, you should see these tables in your Supabase dashboard:

- `profiles` (3 columns: id, username, email, created_at)
- `games` (8 columns: id, week, home_team, away_team, game_time, home_score, away_score, status, created_at)
- `picks` (5 columns: id, user_id, game_id, picked_team, created_at)

The app will work exactly the same, just without the database trigger!
