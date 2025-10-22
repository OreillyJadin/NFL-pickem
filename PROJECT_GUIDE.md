# NFL Picks App - Project Guide

Welcome to the NFL Picks App! This guide will help you understand the project structure and how everything works together.

## 📖 What is This App?

A football picks application where users:
- Pick winners for NFL games each week
- Can "lock" up to 3 picks per week for bonus points
- Earn points based on correct predictions
- Compete on a leaderboard with other players
- Earn awards for weekly performance

## 🏗️ Architecture

This app follows an **MVC (Model-View-Controller)** architecture:

```
📦 src/
├── 📁 types/           Type definitions (TypeScript interfaces)
├── 📁 config/          Configuration (Supabase connection)
├── 📁 models/          Database operations (CRUD)
├── 📁 controllers/     Business logic & validation
├── 📁 services/        Utility functions (scoring, game sync)
├── 📁 app/             Pages & API routes (Next.js)
└── 📁 components/      UI components (React)
```

### The Three Layers

**1. Models (Database Layer)**
- Handle all database operations
- Pure CRUD functions
- Example: `GameModel.findByWeek()` fetches games from database

**2. Controllers (Business Logic Layer)**
- Orchestrate complex operations
- Handle validation and business rules
- Example: `PickController.createPick()` validates game hasn't started before creating pick

**3. Services (Utility Layer)**
- Reusable utility functions
- Complex operations like scoring calculations
- Example: `updateSoloPickStatus()` calculates and updates pick points

## 🎮 How It Works

### User Flow

1. **User logs in** → Authentication via Supabase
2. **Views dashboard** → Sees current week's games
3. **Makes picks** → Chooses winning team for each game
4. **Uses locks** → Can lock up to 3 picks for bonus points (or penalty if wrong)
5. **Games complete** → Automated scoring runs
6. **Views leaderboard** → Sees standings and awards

### Scoring System

**Base Points:**
- Correct pick: **+1 point**
- Incorrect pick: **0 points**
- Correct lock: **+2 points**
- Incorrect lock: **-2 points**

**Bonus Points:**
- Solo Pick (only one who picked that team): **+1 bonus**
- Solo Lock (only one who locked that team): **+1 bonus**
- Super Bonus (solo pick + solo lock): **+1 bonus** (total +3)

### Automated Systems

**Cron Jobs (run automatically):**
1. `sync-scores` - Syncs game scores from ESPN every 5 minutes
2. `fix-scoring` - Checks for and fixes any scoring errors
3. `process-awards` - Awards weekly badges (Top Scorer, Perfect Week, etc.)

## 📂 Directory Guide

### `/src/types`
TypeScript type definitions for the entire app.

- `database.ts` - Database tables (User, Game, Pick, Award, Feedback)
- `api.ts` - API request/response types

### `/src/config`
Configuration files.

- `supabase.ts` - Supabase client connection

### `/src/models`
Database operations - each model handles one table.

- `GameModel.ts` - Games table operations
- `PickModel.ts` - Picks table operations
- `UserModel.ts` - User profiles table operations
- `FeedbackModel.ts` - Feedback table operations
- `AwardModel.ts` - Awards table operations

### `/src/controllers`
Business logic - coordinates models and services.

- `GameController.ts` - Game operations (fetch, sort, sync)
- `PickController.ts` - Pick operations (create with validation)
- `UserController.ts` - User operations (profile updates)
- `ScoringController.ts` - Scoring operations (calculate, fix)
- `AwardController.ts` - Award operations (process weekly awards)
- `FeedbackController.ts` - Feedback operations

### `/src/services`
Utility services - complex operations.

- `scoring.ts` - Main scoring logic
- `scoring-engine.ts` - Point calculation formulas
- `game-sync.ts` - ESPN API integration for live scores
- `auto-awards.ts` - Weekly award processing
- `storage.ts` - File upload handling
- `team-colors.ts` - NFL team colors for UI
- `tiebreaker.ts` - Leaderboard tiebreaker logic

### `/src/app`
Next.js pages and API routes.

**Pages:**
- `/` - Landing page
- `/dashboard` - Main user dashboard (make picks)
- `/leaderboard` - Standings and rankings
- `/profile` - User profile and pick history

**API Routes:**
- `/api/feedback` - Submit user feedback
- `/api/cron/sync-scores` - Sync game scores
- `/api/cron/fix-scoring` - Fix scoring issues
- `/api/process-awards` - Process weekly awards

### `/src/components`
React components for UI.

- `auth/` - Login and registration forms
- `ui/` - Reusable UI components (buttons, cards, etc.)
- `Navigation.tsx` - Site navigation
- `FeedbackModal.tsx` - User feedback form
- `ProfileEditModal.tsx` - Profile editing

## 🔌 Database Schema

**Tables:**
- `profiles` - User information
- `games` - NFL games (synced from ESPN)
- `picks` - User picks for games
- `awards` - Weekly achievement badges
- `feedback` - User feedback submissions

## 🚀 Getting Started

### Running Locally

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run production server
npm start
```

### Environment Variables

Create a `.env.local` file:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
CRON_SECRET=your_cron_secret
```

## 💡 Common Tasks

### Adding a New Feature

1. **Define types** in `src/types/database.ts`
2. **Create model** in `src/models/` for database operations
3. **Create controller** in `src/controllers/` for business logic
4. **Create API route** in `src/app/api/` if needed
5. **Add UI components** in `src/components/` or pages

### Example: Adding a "Comment" feature

```typescript
// 1. Add type
export interface Comment {
  id: string;
  pick_id: string;
  user_id: string;
  text: string;
  created_at: string;
}

// 2. Create model
export class CommentModel {
  static async findByPick(pickId: string): Promise<Comment[]> {
    // Database query
  }
}

// 3. Create controller
export class CommentController {
  static async createComment(pickId: string, text: string) {
    // Validation + create
  }
}

// 4. Create API route
export async function POST(request: NextRequest) {
  const result = await CommentController.createComment(...);
  return NextResponse.json(result);
}
```

## 🐛 Debugging

### Common Issues

**Build errors?**
- Check TypeScript types are correct
- Run `npm run build` to see full error

**Database errors?**
- Check Supabase connection in `.env.local`
- Verify table permissions in Supabase dashboard

**Scoring not working?**
- Check `/api/cron/fix-scoring` logs
- Verify game status is "completed"
- Check pick_points are being calculated

### Helpful Commands

```bash
# Check for TypeScript errors
npm run build

# Check for linting issues
npm run lint

# Run tests
npm test
```

## 📝 Code Style

### Import Order
```typescript
// 1. External packages
import { NextRequest } from "next/server";

// 2. Types
import { Game, Pick } from "@/types/database";

// 3. Models
import { GameModel } from "@/models";

// 4. Controllers
import { GameController } from "@/controllers";

// 5. Services
import { syncGameScore } from "@/services/game-sync";
```

### Naming Conventions
- **Models:** `GameModel.ts` - PascalCase + "Model"
- **Controllers:** `GameController.ts` - PascalCase + "Controller"
- **Services:** `game-sync.ts` - kebab-case
- **Types:** `database.ts` - kebab-case
- **Components:** `GameCard.tsx` - PascalCase

## 🤝 Contributing

When making changes:

1. Create a new branch for your feature
2. Write clear commit messages
3. Test locally before pushing
4. Update this documentation if adding major features

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [React Documentation](https://react.dev)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)

## ❓ Questions?

If you're stuck:
1. Check this guide first
2. Look at similar existing code
3. Check the inline comments in the code
4. Ask your team member!

Happy coding! 🏈

