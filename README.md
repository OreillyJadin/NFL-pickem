# NFL Pick'em Web App

A web application for NFL weekly pick'em where users can log in, view the NFL schedule, make picks for each game before kickoff, and track their records.

## Features

- **Authentication**: Supabase Auth with email/password
- **Schedule & Picks**: Display weekly NFL schedule with pick functionality
- **Game Locking**: Picks are locked once games start
- **User Dashboard**: View upcoming games and make picks
- **Profile Stats**: Track wins, losses, and win percentage
- **Responsive Design**: Mobile-friendly interface

## Tech Stack

- **Frontend**: Next.js 15 + React 19, Tailwind CSS
- **Backend/DB/Auth**: Supabase (PostgreSQL + Auth)
- **UI Components**: shadcn/ui
- **Deployment**: Vercel (frontend), Supabase (backend)

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
git clone <your-repo-url>
cd my-supabase-app
npm install
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Settings > API to get your project URL and anon key
3. Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 3. Set up Database Schema

Run the SQL commands from `supabase-schema.sql` in your Supabase SQL editor:

```sql
-- Enable Row Level Security
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create games table
CREATE TABLE IF NOT EXISTS public.games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  week INTEGER NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  game_time TIMESTAMP WITH TIME ZONE NOT NULL,
  home_score INTEGER DEFAULT NULL,
  away_score INTEGER DEFAULT NULL,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create picks table
CREATE TABLE IF NOT EXISTS public.picks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  game_id UUID REFERENCES public.games(id) ON DELETE CASCADE NOT NULL,
  picked_team TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, game_id)
);

-- Row Level Security Policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Anyone can view games" ON public.games
  FOR SELECT USING (true);

CREATE POLICY "Users can view their own picks" ON public.picks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own picks" ON public.picks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own picks" ON public.picks
  FOR UPDATE USING (auth.uid() = user_id);

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email)
  VALUES (NEW.id, NEW.email, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Project Structure

```
src/
├── app/
│   ├── dashboard/          # Dashboard page with games and picks
│   ├── profile/            # User profile and stats
│   ├── layout.tsx          # Root layout with AuthProvider
│   └── page.tsx            # Landing page with auth forms
├── components/
│   ├── auth/               # Authentication components
│   ├── ui/                 # shadcn/ui components
│   └── Navigation.tsx      # Navigation component
├── contexts/
│   └── AuthContext.tsx     # Authentication context
└── lib/
    └── supabase.ts         # Supabase client configuration
```

## Features Overview

### Authentication

- Email/password registration and login
- Automatic profile creation on signup
- Protected routes with authentication checks

### Dashboard

- Display weekly NFL schedule
- Make picks for upcoming games
- Visual indication of locked games
- Real-time pick status updates

### Profile

- User statistics (total picks, correct/incorrect, win percentage)
- Pick history with results
- Responsive stats cards

### Game Management

- Mock NFL schedule data (Week 1)
- Game locking based on kickoff time
- Pick validation and storage

## Future Enhancements

- [ ] ESPN API integration for real schedule data
- [ ] Leaderboard functionality
- [ ] Multiple weeks support
- [ ] Real-time score updates
- [ ] Push notifications for game starts
- [ ] Social features (friends, groups)

## Deployment

### Frontend (Vercel)

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Backend (Supabase)

- Database and authentication are already hosted on Supabase
- No additional deployment needed

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
