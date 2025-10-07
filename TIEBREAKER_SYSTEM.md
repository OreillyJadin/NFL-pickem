# Tiebreaker System Documentation

## Overview

The tiebreaker system ensures consistent ranking between the leaderboard and awards processing. This document outlines how the system works and the safeguards in place to prevent future issues.

## Tiebreaker Rules

When players are tied in points, the following criteria are used in order:

1. **Points (descending)** - Higher points win
2. **Win Percentage (descending)** - Higher win percentage wins
3. **Wins (descending)** - More wins wins
4. **Lowest Losses (ascending)** - Fewer losses wins

## Implementation

### Centralized Logic

- **File**: `src/lib/tiebreaker.ts`
- **Functions**:
  - `sortUsersByTiebreaker()` - For awards processing
  - `sortLeaderboardByTiebreaker()` - For leaderboard display
  - `validateTiebreakerLogic()` - Validation function
  - `logTiebreakerAnalysis()` - Debug logging

### Usage

Both the leaderboard and awards processing now use the same centralized functions to ensure consistency.

## Safeguards

### 1. Comprehensive Testing

- **File**: `src/lib/tiebreaker.test.ts`
- Tests all tiebreaker scenarios including edge cases
- Validates Week 3 and Week 4 scenarios that were previously incorrect

### 2. Validation

- `validateTiebreakerLogic()` checks that rankings are correct
- Logs errors if tiebreaker rules are violated
- Prevents incorrect awards from being created

### 3. Debug Logging

- `logTiebreakerAnalysis()` provides detailed ranking information
- Shows points, record, and win percentage for each user
- Helps identify issues during awards processing

### 4. Documentation

- Clear comments explaining tiebreaker rules
- Consistent documentation across all files
- Easy to understand for future developers

## Historical Issues Fixed

### Week 3 (Previously Incorrect)

- **Before**: Lemon (1st), Sage (2nd) - both 15 points
- **After**: Sage (1st), Lemon (2nd) - Sage had better win percentage (75% vs 68.75%)

### Week 4 (Previously Incorrect)

- **Before**: Colton (1st), Lemon (2nd) - both 15 points
- **After**: Lemon (1st), Colton (2nd) - Lemon had better win percentage (71.43% vs 66.67%)

## Future Prevention

### Automated Checks

- Validation runs during awards processing
- Errors are logged to console for immediate detection
- Tests can be run to verify tiebreaker logic

### Code Consistency

- Single source of truth for tiebreaker logic
- Both leaderboard and awards use same functions
- Changes only need to be made in one place

### Monitoring

- Debug logs show detailed ranking information
- Validation catches incorrect rankings
- Easy to spot issues during development

## Testing

Run the test suite to verify tiebreaker logic:

```bash
# If test framework is added later
npm test -- src/lib/tiebreaker.test.ts
```

## Maintenance

- Keep tiebreaker logic in `src/lib/tiebreaker.ts`
- Update tests when adding new scenarios
- Monitor console logs during awards processing
- Ensure both leaderboard and awards use centralized functions
