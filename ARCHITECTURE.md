# Technical Architecture

This document explains the technical architecture of the NFL Picks application for developers.

## 🏛️ Architecture Pattern

This application follows the **MVC (Model-View-Controller)** pattern adapted for Next.js:

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT (Browser)                      │
│                 React Components / Pages                 │
└───────────────────────┬─────────────────────────────────┘
                        │
                        │ HTTP Requests
                        ▼
┌─────────────────────────────────────────────────────────┐
│                  VIEW LAYER (Next.js)                    │
│            app/ - Pages & API Route Handlers             │
└───────────────────────┬─────────────────────────────────┘
                        │
                        │ Calls
                        ▼
┌─────────────────────────────────────────────────────────┐
│              CONTROLLER LAYER (Business Logic)           │
│    • Validation                                          │
│    • Business Rules                                      │
│    • Orchestration                                       │
└───────────────────────┬─────────────────────────────────┘
                        │
                ┌───────┴────────┐
                │                │
                ▼                ▼
┌───────────────────────┐  ┌──────────────────────┐
│   MODEL LAYER (CRUD)  │  │  SERVICE LAYER       │
│   • Database Ops      │  │  • Utilities         │
│   • Data Access       │  │  • Complex Logic     │
└───────────┬───────────┘  └──────────┬───────────┘
            │                         │
            └────────┬────────────────┘
                     │
                     ▼
            ┌─────────────────┐
            │    SUPABASE     │
            │   (Database)    │
            └─────────────────┘
```

## 📦 Layer Responsibilities

### 1. View Layer (`src/app/`)

**Responsibilities:**
- Render UI components
- Handle user interactions
- Route HTTP requests to controllers
- Format responses

**Should NOT:**
- Access database directly
- Contain business logic
- Perform complex calculations

**Example:**
```typescript
// ✅ Good - Delegates to controller
export async function POST(request: NextRequest) {
  const { gameId, team } = await request.json();
  const result = await PickController.createPick(userId, gameId, team);
  return NextResponse.json(result);
}

// ❌ Bad - Direct database access
export async function POST(request: NextRequest) {
  const { gameId, team } = await request.json();
  await supabase.from('picks').insert({ gameId, team });
  return NextResponse.json({ success: true });
}
```

### 2. Controller Layer (`src/controllers/`)

**Responsibilities:**
- Validate input data
- Enforce business rules
- Orchestrate operations across models/services
- Handle errors gracefully

**Should NOT:**
- Perform database operations directly
- Contain SQL queries
- Handle HTTP requests/responses

**Example:**
```typescript
// ✅ Good - Validation + orchestration
export class PickController {
  static async createPick(userId: string, gameId: string, team: string, isLock: boolean) {
    // Validate game hasn't started
    const game = await GameModel.findById(gameId);
    if (!game) throw new Error('Game not found');
    if (this.hasGameStarted(game)) throw new Error('Game already started');
    
    // Validate lock limit
    if (isLock) {
      const locksUsed = await PickModel.countLocksForWeek(userId, game.week);
      if (locksUsed >= 3) throw new Error('Lock limit exceeded');
    }
    
    // Create pick
    return await PickModel.create({ userId, gameId, team, isLock });
  }
}
```

### 3. Model Layer (`src/models/`)

**Responsibilities:**
- Execute database queries
- Basic CRUD operations
- Return typed data
- Handle database errors

**Should NOT:**
- Validate business rules
- Orchestrate multiple operations
- Contain UI logic

**Example:**
```typescript
// ✅ Good - Pure database operation
export class PickModel {
  static async create(data: CreatePickInput): Promise<Pick | null> {
    const { data: newPick, error } = await supabase
      .from('picks')
      .insert(data)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating pick:', error);
      throw error;
    }
    
    return newPick as Pick;
  }
}
```

### 4. Service Layer (`src/services/`)

**Responsibilities:**
- Complex utility functions
- Calculations and algorithms
- External API integrations
- Reusable business logic

**Should NOT:**
- Handle HTTP requests
- Access controllers
- Contain UI logic

**Example:**
```typescript
// ✅ Good - Reusable calculation logic
export async function updateSoloPickStatus(gameId: string) {
  const game = await GameModel.findById(gameId);
  const picks = await PickModel.findByGame(gameId);
  
  // Complex scoring calculations
  picks.forEach(pick => {
    const points = calculatePickScore(pick, game);
    PickModel.updateScoring(pick.id, points);
  });
}
```

## 🔄 Data Flow Examples

### Example 1: User Creates a Pick

```
1. User clicks "Pick Rams" button
   └─> POST /api/picks

2. API Route Handler (View)
   └─> PickController.createPick(userId, gameId, "Rams", false)

3. Pick Controller (Business Logic)
   ├─> GameModel.findById(gameId) - Get game
   ├─> Validate game hasn't started
   ├─> PickModel.countLocksForWeek(userId, week) - Check locks
   ├─> Validate lock limit
   └─> PickModel.create({ userId, gameId, team, isLock })

4. Pick Model (Database)
   └─> INSERT INTO picks ... RETURNING *

5. Response flows back up the chain
   └─> Controller → Route Handler → Client
```

### Example 2: Automated Scoring (Cron Job)

```
1. Cron triggers /api/cron/fix-scoring

2. API Route Handler
   └─> ScoringController.fixIncorrectScoring()

3. Scoring Controller
   ├─> GameModel.findCompleted(2025) - Get all completed games
   ├─> For each game:
   │   ├─> PickModel.findByGame(gameId)
   │   ├─> Validate scoring
   │   └─> If incorrect → updateSoloPickStatus() service
   └─> Return summary

4. Scoring Service
   ├─> calculatePickScore() - Calculate points
   └─> PickModel.updateScoring() - Save to database
```

## 🗄️ Database Design

### Core Tables

**profiles**
```sql
- id (uuid, primary key)
- email (text, unique)
- username (text, unique)
- bio (text, nullable)
- created_at (timestamp)
```

**games**
```sql
- id (uuid, primary key)
- week (integer)
- season (integer)
- season_type (text: 'preseason' | 'regular' | 'playoffs')
- home_team (text)
- away_team (text)
- home_score (integer, nullable)
- away_score (integer, nullable)
- status (text: 'scheduled' | 'in_progress' | 'completed')
- game_time (timestamp)
- espn_id (text)
```

**picks**
```sql
- id (uuid, primary key)
- user_id (uuid, foreign key → profiles)
- game_id (uuid, foreign key → games)
- picked_team (text)
- is_lock (boolean)
- pick_points (integer, nullable)
- bonus_points (integer, nullable)
- solo_pick (boolean)
- solo_lock (boolean)
- super_bonus (boolean)
- created_at (timestamp)
```

**awards**
```sql
- id (uuid, primary key)
- user_id (uuid, foreign key → profiles)
- week (integer)
- season (integer)
- award_type (text: 'top_scorer' | 'second_scorer' | ...)
- points (integer)
- created_at (timestamp)
```

### Database Triggers

**check_pick_timing()**
- Prevents users from changing picks after game starts
- Allows system updates for scoring fields
- Runs on UPDATE of picks table

## 🔐 Security

### Row Level Security (RLS)

All tables have RLS policies:

**profiles:**
- Users can read all profiles
- Users can only update their own profile

**picks:**
- Users can only see their own picks (except admins)
- Users can only create/update their own picks
- Cannot modify picks after game starts (enforced by trigger)

**games:**
- Everyone can read
- Only system can create/update (service role)

### API Security

**Public routes:**
- GET `/api/cron/*` - Protected by CRON_SECRET header

**Authenticated routes:**
- All other routes require valid Supabase session

## 🔄 Automated Jobs

### 1. Score Sync (`/api/cron/sync-scores`)
**Frequency:** Every 5 minutes  
**Purpose:** Fetch latest scores from ESPN API  
**Process:**
1. Find games that need syncing (in_progress or completed)
2. Fetch data from ESPN API
3. Update game scores in database
4. Trigger scoring if game just completed

### 2. Fix Scoring (`/api/cron/fix-scoring`)
**Frequency:** Every 15 minutes  
**Purpose:** Find and fix any scoring errors  
**Process:**
1. Get all completed games
2. Check for incorrect scoring patterns
3. Re-run scoring for problematic games
4. Log issues found

### 3. Process Awards (`/api/process-awards`)
**Frequency:** Manual / After each week  
**Purpose:** Award badges for weekly performance  
**Process:**
1. Find completed weeks
2. Calculate top scorers
3. Create award records
4. Avoid duplicate awards

## 📊 Performance Considerations

### Database Queries

**Optimization techniques:**
- Use `.select('specific, fields')` instead of `.select('*')`
- Add indexes on frequently queried fields (user_id, game_id, week)
- Use pagination for large result sets (`.range()`)
- Avoid N+1 queries by using joins

**Example:**
```typescript
// ❌ Bad - N+1 query problem
const picks = await PickModel.findByUser(userId);
for (const pick of picks) {
  const game = await GameModel.findById(pick.game_id); // N queries!
}

// ✅ Good - Single query with join
const { data } = await supabase
  .from('picks')
  .select('*, game:games(*)')
  .eq('user_id', userId);
```

### Caching Strategy

**Current:** No caching (direct DB queries)  
**Future:** Consider Redis for:
- Weekly game schedules
- Leaderboard standings
- User profiles

## 🧪 Testing Strategy

### Unit Tests
- Test models with mocked Supabase client
- Test controllers with mocked models
- Test services independently

### Integration Tests
- Test API routes end-to-end
- Use test database
- Verify data persistence

### Example Test Structure:
```typescript
describe('PickController', () => {
  it('should prevent picks after game starts', async () => {
    // Mock game that has started
    jest.spyOn(GameModel, 'findById').mockResolvedValue({
      id: '123',
      game_time: '2025-01-01T10:00:00Z', // Past time
      ...
    });
    
    await expect(
      PickController.createPick(userId, gameId, team, false)
    ).rejects.toThrow('Game already started');
  });
});
```

## 🔧 Development Workflow

### Local Development
1. Run `npm run dev`
2. Make changes
3. Hot reload updates automatically
4. Test in browser

### Adding New Feature
1. Define types in `src/types/`
2. Create model in `src/models/`
3. Create controller in `src/controllers/`
4. Add API route in `src/app/api/`
5. Create UI components
6. Test thoroughly

### Deployment
1. Push to GitHub
2. Vercel automatically builds and deploys
3. Cron jobs configured in Vercel dashboard
4. Environment variables set in Vercel

## 📚 Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Database:** Supabase (PostgreSQL)
- **Styling:** Tailwind CSS
- **Hosting:** Vercel
- **External APIs:** ESPN API (game scores)

## 🎯 Best Practices

1. **Always use controllers in API routes** - Never access models directly
2. **Type everything** - Use TypeScript types for all data
3. **Handle errors gracefully** - Try/catch and meaningful error messages
4. **Log important operations** - Use console.log for debugging
5. **Keep functions small** - Single responsibility principle
6. **Comment complex logic** - Explain why, not what
7. **Test edge cases** - What if game is null? What if user has 3 locks?

## 🚀 Performance Metrics

**Target metrics:**
- Page load time: < 2 seconds
- API response time: < 500ms
- Database query time: < 100ms
- Cron job execution: < 30 seconds

## 📈 Scalability

**Current capacity:**
- ~100 users
- ~300 picks per week
- ~15 games per week

**Scale limitations:**
- Supabase free tier: 500MB database
- Vercel free tier: 100GB bandwidth

**Future improvements:**
- Add caching layer (Redis)
- Optimize database queries
- Add CDN for static assets
- Consider database read replicas

