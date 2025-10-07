# Scoring System Improvements

## Overview

The scoring system has been significantly improved to be more robust and prevent issues where winning picks receive 0 points.

## What Was Fixed

### 1. **Week 1-2 Games Now Get Scored** ✅

**Problem:** The old code had an early return for weeks 1-2, so picks never got ANY points.

**Fix:** Removed the week restriction. ALL weeks now get base points:

- Week 1-2: Base points only (1 point for win, 2 for lock win)
- Week 3+: Base points + bonus points for solo picks/locks

### 2. **Added Retry Logic** ✅

**Problem:** If a database update failed, picks would never get scored.

**Fix:** Added automatic retry logic (3 attempts) with exponential backoff to handle transient errors.

### 3. **Better Error Handling** ✅

**Problem:** Errors would crash the scoring process silently.

**Fix:** Now logs detailed error information and tracks success/failure counts for each game.

### 4. **Safety Net Cron Job** ✅

**Problem:** If scoring was missed during game sync, there was no way to catch it.

**Fix:** Created a new endpoint `/api/cron/fix-scoring` that:

- Checks ALL completed games for incorrect scoring
- Automatically fixes any games where winning picks have 0 points
- Can be run periodically to catch any edge cases

## Scoring Rules (Verified by Tests)

### Base Points (All Weeks)

- ✅ Correct non-lock: +1 point
- ✅ Correct lock: +2 points
- ✅ Incorrect non-lock: 0 points
- ✅ Incorrect lock: -2 points
- ✅ Tie game: 0 points for everyone (picks voided)

### Bonus Points (Week 3+ Only)

- ✅ Solo pick (only person to pick that team): +2 bonus
- ✅ Solo lock (only lock on that team): +2 bonus
- ✅ Super bonus (solo pick AND solo lock): +5 bonus (total 7 points)

## How It Works Now

### Automatic Scoring

1. When a game completes, `syncGameScore()` calls `updateSoloPickStatus()`
2. `updateSoloPickStatus()` calculates and stores points for ALL picks
3. If it fails, it retries up to 3 times
4. All results are logged for debugging

### Safety Net

Run the fix-scoring endpoint periodically (e.g., daily) to catch any missed scoring:

```bash
curl -X GET "https://your-app.vercel.app/api/cron/fix-scoring" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

The endpoint will:

- Check all completed games
- Find any winning picks with 0 points
- Automatically fix them
- Return a report of what was fixed

### Manual Fix (if needed)

If you ever notice a game with incorrect scoring, you can manually trigger a recalculation:

```typescript
import { updateSoloPickStatus } from "@/lib/scoring";

// Fix a specific game
await updateSoloPickStatus("game-id-here");
```

## Test Coverage

All scoring scenarios are now covered by automated tests:

- ✅ Regular picks (no bonus)
- ✅ Solo picks (+2 bonus)
- ✅ Solo locks (+2 bonus)
- ✅ Super bonus (+5 bonus)
- ✅ Week 1 picks (base points, no bonus)
- ✅ Week 2 picks (base points, no bonus)
- ✅ Incorrect picks
- ✅ Tie games

Run tests with:

```bash
npx tsx src/lib/scoring.test.ts
```

## Monitoring

### Check for Scoring Issues

The fix-scoring endpoint returns detailed information:

```json
{
  "success": true,
  "message": "✅ All 42 games have correct scoring",
  "gamesChecked": 42,
  "gamesFixed": 0,
  "picksFixed": 0,
  "problemGames": []
}
```

If issues are found:

```json
{
  "success": true,
  "message": "⚠️ Fixed 9 picks across 1 games",
  "gamesChecked": 42,
  "gamesFixed": 1,
  "picksFixed": 9,
  "problemGames": [
    {
      "gameId": "...",
      "week": 5,
      "matchup": "Las Vegas Raiders @ Indianapolis Colts",
      "incorrectPicks": 9
    }
  ]
}
```

## Recommended Setup

### Vercel Cron Jobs

Add to your `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/sync-scores",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cron/fix-scoring",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

This will:

- Sync scores every 5 minutes (existing)
- Run the safety net every 6 hours (new)

## Summary

The scoring system is now:

- ✅ **More reliable** - Retry logic handles transient errors
- ✅ **More complete** - Week 1-2 games now get scored
- ✅ **Self-healing** - Safety net catches any missed scoring
- ✅ **Better tested** - Comprehensive test coverage
- ✅ **Better monitored** - Detailed logging and reporting

This should prevent the issue where winning picks get 0 points from happening again!
