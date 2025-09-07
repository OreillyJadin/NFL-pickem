# NFL Pick'em

A full-stack web application for NFL weekly pick'em games with real-time scoring and user management.

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **Deployment**: Vercel (frontend), Supabase (backend)
- **Analytics**: Vercel Analytics

## Database Schema

### Core Tables

**profiles**

- `id` (UUID, PK) - References auth.users
- `username` (TEXT, UNIQUE) - User's chosen username
- `email` (TEXT, UNIQUE) - User's email address
- `bio` (TEXT) - User's bio/description
- `profile_pic_url` (TEXT) - Profile picture data URL
- `is_admin` (BOOLEAN) - Admin privileges
- `created_at` (TIMESTAMP)

**games**

- `id` (UUID, PK) - Unique game identifier
- `week` (INTEGER) - Week number (1-18)
- `preseason` (BOOLEAN) - Preseason vs regular season
- `home_team` (TEXT) - Home team name
- `away_team` (TEXT) - Away team name
- `game_date` (TIMESTAMP) - Game start time
- `home_score` (INTEGER) - Home team score
- `away_score` (INTEGER) - Away team score
- `status` (TEXT) - scheduled/in_progress/completed
- `quarter` (INTEGER) - Current quarter (for live games)
- `espn_id` (TEXT) - ESPN API identifier
- `created_at` (TIMESTAMP)

**picks**

- `id` (UUID, PK) - Unique pick identifier
- `user_id` (UUID, FK) - References auth.users
- `game_id` (UUID, FK) - References games
- `picked_team` (TEXT) - Team user picked
- `is_lock` (BOOLEAN) - Lock pick (+2/-2 points)
- `created_at` (TIMESTAMP)

**awards**

- `id` (UUID, PK) - Unique award identifier
- `user_id` (UUID, FK) - References auth.users
- `award_type` (TEXT) - Type of award earned
- `week` (INTEGER) - Week award was earned
- `description` (TEXT) - Award description
- `created_at` (TIMESTAMP)

**user_scores**

- `id` (UUID, PK) - Unique score identifier
- `user_id` (UUID, FK) - References auth.users
- `week` (INTEGER) - Week number
- `preseason` (BOOLEAN) - Preseason vs regular season
- `total_picks` (INTEGER) - Total picks made
- `correct_picks` (INTEGER) - Correct picks
- `incorrect_picks` (INTEGER) - Incorrect picks
- `total_points` (INTEGER) - Total points earned
- `lock_picks` (INTEGER) - Number of lock picks used
- `lock_wins` (INTEGER) - Correct lock picks
- `lock_losses` (INTEGER) - Incorrect lock picks
- `created_at` (TIMESTAMP)

### Database Functions

- `get_game_winner(game_id)` - Determines winner of a game
- `update_user_scores(user_id, week, preseason)` - Calculates user scores
- `sync_all_game_scores()` - Syncs all games with ESPN API
- `update_game_score(game_id, home_score, away_score, status, quarter)` - Updates individual game

### Triggers

- `on_game_completed` - Updates user scores when game status changes to completed
- `on_pick_created` - Validates pick creation and lock limits

## Project Structure

```
src/
├── app/
│   ├── dashboard/           # Main dashboard with games and picks
│   ├── leaderboard/         # Weekly and season standings
│   ├── profile/             # User profile and stats
│   ├── api/
│   │   └── cron/           # Automated score syncing
│   ├── layout.tsx          # Root layout with providers
│   └── page.tsx            # Landing page with auth
├── components/
│   ├── auth/               # Login/Register forms
│   ├── ui/                 # Reusable UI components
│   ├── Navigation.tsx      # Main navigation
│   ├── ProfileEditModal.tsx # Profile editing modal
│   └── TutorialModal.tsx   # App tutorial
├── contexts/
│   └── AuthContext.tsx     # Authentication state management
└── lib/
    ├── supabase.ts         # Supabase client config
    ├── game-sync.ts        # ESPN API integration
    ├── scoring.ts          # Scoring calculations
    ├── awards.ts           # Award system
    └── team-colors.ts      # NFL team color schemes
```

## Key Features

### Authentication & Profiles

- Email/password authentication via Supabase Auth
- Unique username validation with real-time checking
- Profile management (username, bio, profile picture)
- Password reset functionality

### Game Management

- Real-time NFL schedule from ESPN API
- Live score updates every 15 minutes
- Game status tracking (scheduled/in_progress/completed)
- Quarter-by-quarter updates for live games

### Pick System

- Make picks for upcoming games
- Lock picks system (up to 3 per week, +2/-2 points)
- Pick switching until game starts
- Visual lock indicators on dashboard

### Scoring & Leaderboards

- Point system: Normal picks (+1/0), Lock picks (+2/-2)
- Weekly and season-long leaderboards
- Win percentage calculations
- Real-time score updates

### Awards System

- Weekly awards: Top Scorer, Lowest Scorer, Perfect Week, Cold Week
- Permanent trophy wall on user profiles
- Award history tracking

### Mobile Optimization

- Responsive design for iPhone users
- Tutorial for "Add to Home Screen"
- Mobile-friendly UI components
- Touch-optimized interactions

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
CRON_SECRET=your_cron_secret
```

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## Deployment

- **Frontend**: Deployed on Vercel with automatic GitHub integration
- **Backend**: Supabase handles database, auth, and real-time features
- **Cron Jobs**: Disabled (requires Vercel Pro) - Manual sync available
