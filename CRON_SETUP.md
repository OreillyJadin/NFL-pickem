# Automated Score Sync Setup

## Overview

This setup automatically syncs NFL game scores from the ESPN API every hour using Vercel Cron Jobs.

## Files Created

- `src/app/api/cron/sync-scores/route.ts` - Cron job endpoint
- `vercel.json` - Vercel cron configuration

## Environment Variables Required

Add this to your Vercel environment variables:

```
CRON_SECRET=your-secure-random-string-here
```

Generate a secure random string for the CRON_SECRET (e.g., using `openssl rand -hex 32`).

## How It Works

1. **Schedule**: Runs every hour at the top of the hour (0 \* \* \* \*)
2. **Authentication**: Uses CRON_SECRET to verify legitimate requests
3. **Scope**: Syncs all games for the current week (both preseason and regular season)
4. **Rate Limiting**: Includes 100ms delay between API calls to avoid ESPN rate limits
5. **Logging**: Comprehensive logging for monitoring and debugging

## Features

- ✅ **Automatic**: Runs every hour without manual intervention
- ✅ **Secure**: Protected with authentication secret
- ✅ **Comprehensive**: Syncs all games for current week
- ✅ **Robust**: Error handling and retry logic
- ✅ **Monitored**: Detailed logging for each sync operation
- ✅ **Rate Limited**: Prevents API rate limit issues

## Manual Testing

You can test the cron endpoint manually:

```bash
curl -X GET "https://your-app.vercel.app/api/cron/sync-scores" \
  -H "Authorization: Bearer your-cron-secret"
```

## Monitoring

Check Vercel function logs to monitor cron job execution:

1. Go to Vercel Dashboard
2. Select your project
3. Go to Functions tab
4. Look for `/api/cron/sync-scores` function logs

## Troubleshooting

- **401 Unauthorized**: Check CRON_SECRET environment variable
- **No games found**: Verify games exist in database for current week
- **ESPN API errors**: Check ESPN API status and rate limits
- **Database errors**: Verify Supabase connection and permissions
