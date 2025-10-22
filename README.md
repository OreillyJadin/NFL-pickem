# 🏈 NFL Picks App

A full-stack web application for NFL pick'em pools. Users predict game winners each week, compete on a leaderboard, and earn awards for their performance.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables (see below)
cp .env.example .env.local

# Run development server
npm run dev

# Open http://localhost:3000
```

## 📋 Prerequisites

- Node.js 18+ installed
- Supabase account (free tier works)
- Basic knowledge of React/Next.js

## ⚙️ Environment Setup

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Cron Job Security
CRON_SECRET=your_random_secret_string
```

### Getting Supabase Keys

1. Go to [supabase.com](https://supabase.com) and create a project
2. Navigate to Project Settings → API
3. Copy the Project URL and anon/public key
4. Copy the service_role key (keep this secret!)

## 🗄️ Database Setup

Run these SQL commands in your Supabase SQL editor:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  bio TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create games table
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  week INTEGER NOT NULL,
  season INTEGER NOT NULL,
  season_type TEXT NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  home_score INTEGER,
  away_score INTEGER,
  status TEXT NOT NULL DEFAULT 'scheduled',
  game_time TIMESTAMP NOT NULL,
  espn_id TEXT,
  tv TEXT,
  quarter INTEGER,
  time_remaining TEXT,
  possession TEXT,
  halftime BOOLEAN,
  last_synced TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create picks table
CREATE TABLE picks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  picked_team TEXT NOT NULL,
  is_lock BOOLEAN DEFAULT FALSE,
  pick_points INTEGER DEFAULT 0,
  bonus_points INTEGER DEFAULT 0,
  solo_pick BOOLEAN DEFAULT FALSE,
  solo_lock BOOLEAN DEFAULT FALSE,
  super_bonus BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, game_id)
);

-- Create awards table
CREATE TABLE awards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  week INTEGER NOT NULL,
  season INTEGER NOT NULL,
  season_type TEXT NOT NULL,
  award_type TEXT NOT NULL,
  points INTEGER NOT NULL,
  record TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create feedback table
CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  user_agent TEXT,
  ip_address TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Add RLS policies (see ARCHITECTURE.md for details)
```

## 📚 Documentation

- **[PROJECT_GUIDE.md](./PROJECT_GUIDE.md)** - Complete guide for new developers
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Technical architecture details

## 🏗️ Project Structure

```
src/
├── types/              TypeScript type definitions
│   ├── database.ts       Database table types
│   └── api.ts            API request/response types
│
├── config/             Configuration files
│   └── supabase.ts       Supabase client setup
│
├── models/             Database operations (CRUD)
│   ├── GameModel.ts      Games table operations
│   ├── PickModel.ts      Picks table operations
│   ├── UserModel.ts      Users table operations
│   ├── FeedbackModel.ts  Feedback operations
│   └── AwardModel.ts     Awards operations
│
├── controllers/        Business logic & validation
│   ├── GameController.ts
│   ├── PickController.ts
│   ├── UserController.ts
│   ├── ScoringController.ts
│   ├── AwardController.ts
│   └── FeedbackController.ts
│
├── services/           Utility functions
│   ├── scoring.ts        Main scoring logic
│   ├── game-sync.ts      ESPN API integration
│   ├── auto-awards.ts    Award processing
│   ├── storage.ts        File uploads
│   └── ...
│
├── app/                Next.js pages & routes
│   ├── page.tsx          Landing page
│   ├── dashboard/        User dashboard
│   ├── leaderboard/      Standings
│   ├── profile/          User profiles
│   └── api/              API routes
│
└── components/         React components
    ├── auth/             Login/register forms
    ├── ui/               Reusable UI components
    └── ...
```

## 🎮 Features

### For Users
- ✅ Pick winners for each NFL game
- ✅ Lock up to 3 picks per week for bonus points
- ✅ View real-time standings on leaderboard
- ✅ Earn weekly awards (Top Scorer, Perfect Week, etc.)
- ✅ Track pick history and stats

### For Admins
- ✅ Automatic score syncing from ESPN
- ✅ Automated scoring calculations
- ✅ Error detection and fixing
- ✅ Weekly award processing

## 🔄 Automated Jobs

The app runs several cron jobs to keep data synced:

1. **Score Sync** - Every 5 minutes during game days
   - Fetches latest scores from ESPN API
   - Updates game status and scores

2. **Fix Scoring** - Every 15 minutes
   - Checks for scoring errors
   - Automatically fixes issues

3. **Process Awards** - Weekly
   - Calculates top performers
   - Awards badges

## 🎯 Scoring System

**Base Points:**
- Correct pick: +1 point
- Incorrect pick: 0 points
- Correct lock: +2 points (bonus)
- Incorrect lock: -2 points (penalty)

**Bonus Points:**
- Solo Pick: +1 (only person to pick that team)
- Solo Lock: +1 (only person to lock that team)
- Super Bonus: +1 (solo pick + solo lock)

**Example:**
- You lock the Rams
- Rams win
- You're the only one who picked/locked the Rams
- Points: 2 (lock) + 1 (solo pick) + 1 (solo lock) + 1 (super bonus) = **5 points!**

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run dev          # Start dev server
npm run build        # Build for production
npm start            # Run production server

# Code Quality
npm run lint         # Run ESLint
npm test             # Run tests
```

### Making Changes

1. **Add a feature:**
   - Define types in `src/types/`
   - Create model in `src/models/`
   - Create controller in `src/controllers/`
   - Add API route in `src/app/api/`
   - Build UI in `src/app/` or `src/components/`

2. **Test locally:**
   ```bash
   npm run dev
   # Test in browser
   # Check for errors in console
   ```

3. **Build to verify:**
   ```bash
   npm run build
   # Should complete without errors
   ```

## 🚢 Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy!

Vercel will automatically:
- Build on every push
- Provide preview URLs
- Set up cron jobs

### Environment Variables in Vercel

Add these in Vercel Dashboard → Settings → Environment Variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET`

### Setting Up Cron Jobs

In Vercel, configure cron jobs with these endpoints:
- `/api/cron/sync-scores` - Every 5 minutes
- `/api/cron/fix-scoring` - Every 15 minutes

Add the cron secret as a header:
```
Authorization: Bearer ${CRON_SECRET}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📖 Learn More

### Next.js
- [Next.js Documentation](https://nextjs.org/docs)
- [Learn Next.js](https://nextjs.org/learn)

### Supabase
- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth](https://supabase.com/docs/guides/auth)

### React
- [React Documentation](https://react.dev)
- [React Hooks](https://react.dev/reference/react)

## 🐛 Troubleshooting

### Build Errors

**"Cannot find module"**
- Run `npm install` to install dependencies
- Check import paths use `@/` alias

**TypeScript errors**
- Run `npm run build` to see all errors
- Check types in `src/types/`

### Database Errors

**"relation does not exist"**
- Run database setup SQL
- Check table names match exactly

**"RLS policy violation"**
- Check RLS policies in Supabase
- Verify user is authenticated

### Scoring Issues

**Picks not being scored**
- Check game status is "completed"
- Run `/api/cron/fix-scoring` manually
- Check logs in Vercel dashboard

## 📝 License

This project is private and proprietary.

## 👥 Team

- **Developer 1** - Initial work
- **Developer 2** - You! Welcome aboard 🎉

## 🙏 Acknowledgments

- ESPN API for game data
- Supabase for backend infrastructure
- Vercel for hosting
- Next.js team for the amazing framework

---

**Questions?** Check [PROJECT_GUIDE.md](./PROJECT_GUIDE.md) or ask your teammate!

Happy coding! 🏈
