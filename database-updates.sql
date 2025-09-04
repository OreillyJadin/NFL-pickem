-- Add lock picks support and awards system

-- Add is_lock column to picks table
ALTER TABLE public.picks
ADD COLUMN IF NOT EXISTS is_lock BOOLEAN DEFAULT FALSE;

-- Create awards table
CREATE TABLE IF NOT EXISTS public.awards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  week INTEGER NOT NULL,
  season INTEGER NOT NULL,
  season_type TEXT NOT NULL CHECK (season_type IN ('preseason', 'regular', 'playoffs')),
  award_type TEXT NOT NULL CHECK (award_type IN ('top_scorer', 'lowest_scorer', 'perfect_week', 'cold_week')),
  points INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, week, season, season_type, award_type)
);

-- Row Level Security for awards
CREATE POLICY "Users can view their own awards" ON public.awards
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view all awards for leaderboard" ON public.awards
  FOR SELECT USING (true);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_awards_user_season ON public.awards(user_id, season, season_type);
CREATE INDEX IF NOT EXISTS idx_awards_week_season ON public.awards(week, season, season_type);
