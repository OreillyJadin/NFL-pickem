# Leaderboard & Scoring Fixes - Summary

## Issues Fixed Today

### 1. ✅ Week 1-2 Games Not Being Scored

**Problem:** The scoring function had an early return for weeks 1-2, so those games never received ANY points.

**Fix:** Removed the week restriction. Now ALL weeks get base points:

- Week 1-2: Base points only (1 for win, 2 for lock win)
- Week 3+: Base points + bonus points for solo picks/locks

**Impact:** All historical week 1-2 games were manually rescored.

---

### 2. ✅ Winning Picks Showing 0 Points

**Problem:** 9 winning picks on Indianapolis Colts vs Las Vegas Raiders (Week 5) were showing 0 points.

**Root Cause:** One-time scoring sync failure where `updateSoloPickStatus` wasn't triggered properly.

**Fix:**

- Added retry logic (3 attempts) to `updateSoloPickStatus`
- Created safety net cron job `/api/cron/fix-scoring` to catch missed scoring
- Manually fixed the affected game

---

### 3. ✅ Leaderboard Missing Picks (Major Issue)

**Problem:** Season leaderboard was showing incorrect stats:

- Database actual: **47 wins, 29 losses, 59 points**
- Leaderboard showing: **38 wins, 19 losses, 44 points**
- **Missing:** 9 wins, 10 losses, 15 points

**Root Cause:** Supabase has a **hard 1000 row limit** on queries

- Total picks for completed games: **1200**
- Query was only returning first **1000 picks**
- Missing **200 picks** affected multiple users' stats

**Initial Attempt - FAILED:**

```typescript
// This doesn't work - limit is ignored
.select("...")
.in("game_id", gameIds)
.limit(10000)
```

**Working Solution - Pagination:**

```typescript
// Fetch in batches of 1000 using .range()
let allPicks = [];
let from = 0;
const pageSize = 1000;
let hasMore = true;

while (hasMore) {
  const { data: picksBatch } = await supabase
    .from("picks")
    .select("...")
    .in("game_id", gameIds)
    .range(from, from + pageSize - 1);

  if (picksBatch && picksBatch.length > 0) {
    allPicks = [...allPicks, ...picksBatch];
    from += pageSize;
    hasMore = picksBatch.length === pageSize;
  } else {
    hasMore = false;
  }
}
```

**Additional Changes:**

- Separated games query from picks query (removed nested `games!inner` join)
- Used JavaScript Map to join data client-side
- This avoids nested query limitations and ensures all picks are counted

---

## Files Modified

### Scoring System

- `src/lib/scoring.ts` - Removed week restrictions, added retry logic
- `src/app/api/cron/fix-scoring/route.ts` - NEW: Safety net to catch scoring issues
- `src/lib/scoring.test.ts` - Added tests for Week 1 & 2 scoring

### Leaderboard

- `src/app/leaderboard/page.tsx` - Implemented pagination for picks query

---

## Key Learnings

1. **Supabase Query Limits:**

   - Hard 1000 row limit on queries
   - `.limit()` doesn't override this
   - Must use `.range()` for pagination

2. **Nested Queries:**

   - Can silently drop data when hitting limits
   - Better to separate queries and join in JavaScript

3. **Scoring Robustness:**
   - Always add retry logic for critical operations
   - Create safety nets to catch edge cases
   - Monitor for anomalies

---

## Verification Queries

Check if all picks are being counted:

```sql
-- Total picks for completed games
SELECT COUNT(*) as total_picks
FROM picks p
WHERE p.game_id IN (
  SELECT id FROM games
  WHERE season = 2025
  AND status = 'completed'
);

-- User-specific stats
SELECT
  u.username,
  COUNT(*) as total_picks,
  SUM(CASE WHEN /* win logic */ THEN 1 END) as wins,
  SUM(CASE WHEN /* loss logic */ THEN 1 END) as losses,
  SUM(p.pick_points) as total_points
FROM picks p
JOIN games g ON g.id = p.game_id
JOIN profiles u ON u.id = p.user_id
WHERE u.username = 'USERNAME_HERE'
  AND g.season = 2025
  AND g.status = 'completed'
GROUP BY u.username;
```

---

## Status: ✅ ALL FIXED

- Season leaderboard now shows accurate stats for all users
- All weeks (1-18) are properly scored
- Pagination ensures all picks are counted
- Safety net in place to catch future issues
