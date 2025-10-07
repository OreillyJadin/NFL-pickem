# 🔒 Security Audit - Penetration Test Report

## Executive Summary

This document outlines security vulnerabilities found in the NFL Pick'em application. Issues are ranked by severity: 🔴 Critical, 🟠 High, 🟡 Medium, 🟢 Low.

---

## 🔴 CRITICAL VULNERABILITIES

### 1. No Time-Based Pick Restrictions (Game Manipulation)

**Location:** `src/app/dashboard/page.tsx:563-632`

**Issue:** Users can submit or modify picks AFTER a game has started or even completed.

```typescript
const makePick = async (
  gameId: string,
  team: string,
  isLock: boolean = false
) => {
  // NO CHECK FOR GAME START TIME!
  await supabase.from("picks").update({ picked_team: team, is_lock: isLock });
};
```

**Attack Vector:**

1. User watches game finish
2. User modifies pick to winning team
3. User gains unfair advantage

**Impact:** Complete breakdown of game integrity. Users can cheat by picking winners after games complete.

**Fix Required:**

```typescript
const makePick = async (
  gameId: string,
  team: string,
  isLock: boolean = false
) => {
  // Get game time
  const { data: game } = await supabase
    .from("games")
    .select("game_time, status")
    .eq("id", gameId)
    .single();

  // Prevent picks after game starts
  if (game.status !== "scheduled" || new Date(game.game_time) <= new Date()) {
    throw new Error("Cannot modify picks after game has started");
  }

  // ... rest of pick logic
};
```

**Database RLS Policy Needed:**

```sql
CREATE POLICY "Users can only insert/update picks before game starts"
ON picks
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM games
    WHERE games.id = picks.game_id
    AND games.status = 'scheduled'
    AND games.game_time > NOW()
  )
);
```

---

### 2. Lock Count Validation is Client-Side Only

**Location:** `src/app/dashboard/page.tsx:570-574`

**Issue:** Lock count validation happens only in JavaScript - can be bypassed.

```typescript
if (isLock && locksUsed >= 3) {
  alert("You can only use 3 locks per week!");
  return; // Client-side only!
}
```

**Attack Vector:**

1. Open browser DevTools
2. Modify `locksUsed` variable to 0
3. Set unlimited locks via console: `makePick(gameId, team, true)`
4. Gain massive advantage

**Impact:** Users can use unlimited locks, breaking game balance.

**Fix Required - Database Constraint:**

```sql
-- Add a check function
CREATE OR REPLACE FUNCTION check_lock_limit()
RETURNS TRIGGER AS $$
DECLARE
  lock_count INTEGER;
  game_week INTEGER;
  game_season_type TEXT;
BEGIN
  IF NEW.is_lock = TRUE THEN
    -- Get game details
    SELECT week, season_type INTO game_week, game_season_type
    FROM games WHERE id = NEW.game_id;

    -- Count existing locks for this week
    SELECT COUNT(*) INTO lock_count
    FROM picks p
    JOIN games g ON p.game_id = g.id
    WHERE p.user_id = NEW.user_id
      AND p.is_lock = TRUE
      AND g.week = game_week
      AND g.season_type = game_season_type
      AND p.id != NEW.id; -- Exclude current pick if updating

    IF lock_count >= 3 THEN
      RAISE EXCEPTION 'Cannot use more than 3 locks per week';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_lock_limit
  BEFORE INSERT OR UPDATE ON picks
  FOR EACH ROW
  EXECUTE FUNCTION check_lock_limit();
```

---

## 🟠 HIGH SEVERITY VULNERABILITIES

### 3. File Upload - Client-Side Validation Only

**Location:** `src/components/auth/RegisterForm.tsx:80-102`

**Issue:** File type validation is ONLY client-side and can be bypassed.

```typescript
// Client-side only - easily spoofed!
if (!file.type.startsWith("image/")) {
  setError("Please select an image file");
  return;
}
```

**Attack Vector:**

1. Rename `malicious.php` to `malicious.php.jpg`
2. Modify HTTP request to change Content-Type header
3. Upload malicious file
4. Potentially execute server-side code or serve phishing content

**Impact:**

- XSS attacks via SVG files
- Phishing via HTML files disguised as images
- Storage exhaustion

**Fix Required:**

```typescript
// Server-side validation needed in uploadFile function
export async function uploadFile(file: File, bucket: string, path: string) {
  // Validate file signature (magic bytes), not just extension
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer).subarray(0, 4);

  // Check magic bytes for actual image files
  const isJPEG = bytes[0] === 0xff && bytes[1] === 0xd8;
  const isPNG = bytes[0] === 0x89 && bytes[1] === 0x50;
  const isGIF = bytes[0] === 0x47 && bytes[1] === 0x49;
  const isWebP = bytes[0] === 0x52 && bytes[1] === 0x49;

  if (!isJPEG && !isPNG && !isGIF && !isWebP) {
    throw new Error("Invalid image file");
  }

  // ... rest of upload
}
```

**Supabase Storage Policy Needed:**

```sql
-- Limit file types in storage bucket policies
-- Also set max file size to prevent storage exhaustion
```

---

### 4. No Rate Limiting on Critical Endpoints

**Location:** `src/app/api/cron/*`, `src/app/dashboard/page.tsx`

**Issue:** No rate limiting on pick submissions or API calls.

**Attack Vector:**

1. User spams pick submissions
2. DoS attack on database
3. Cost escalation on Supabase

**Impact:** Database overload, cost escalation, poor UX for other users.

**Fix Required:**

```typescript
// Implement rate limiting middleware
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "10 s"),
});

// In pick endpoint
const { success } = await ratelimit.limit(user.id);
if (!success) {
  return NextResponse.json({ error: "Too many requests" }, { status: 429 });
}
```

---

### 5. Service Role Key in Multiple Files

**Location:**

- `src/app/api/cron/fix-scoring/route.ts:7`
- `src/app/api/cron/sync-scores/route.ts:7`
- `src/app/api/cron/route.ts:7`

**Issue:** Service role key usage is correct, but if CRON_SECRET leaks, attackers gain full database access.

**Current Protection:**

```typescript
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

**Improvement Needed:**

- Add IP whitelisting for cron endpoints
- Use Vercel Cron with built-in auth
- Rotate CRON_SECRET regularly
- Add request signing for additional verification

---

## 🟡 MEDIUM SEVERITY VULNERABILITIES

### 6. Missing RLS (Row Level Security) Policies

**Location:** Database

**Issue:** Can't verify RLS policies without database access, but likely missing or incomplete.

**Required Policies:**

```sql
-- Profiles: Users can only update their own profile
CREATE POLICY "Users can update own profile"
ON profiles
FOR UPDATE
USING (auth.uid() = id);

-- Profiles: All users can read all profiles (for leaderboard)
CREATE POLICY "Anyone can read profiles"
ON profiles
FOR SELECT
USING (true);

-- Picks: Users can only create/update their own picks
CREATE POLICY "Users can manage own picks"
ON picks
FOR ALL
USING (auth.uid() = user_id);

-- Picks: All users can read all picks (after game starts)
CREATE POLICY "Anyone can read picks for completed games"
ON picks
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM games
    WHERE games.id = picks.game_id
    AND games.status IN ('in_progress', 'completed')
  )
);

-- Games: Everyone can read
CREATE POLICY "Anyone can read games"
ON games
FOR SELECT
USING (true);

-- Games: Only service role can write
-- (handled by service role key in cron jobs)
```

---

### 7. No Input Sanitization on Username/Bio

**Location:** `src/contexts/AuthContext.tsx:48-92`

**Issue:** Username and bio are not sanitized for XSS.

**Attack Vector:**

```javascript
username = "<script>alert('XSS')</script>";
bio = "<img src=x onerror='alert(document.cookie)'>";
```

**Impact:** Stored XSS attacks, cookie theft, session hijacking.

**Fix Required:**

```typescript
import DOMPurify from "isomorphic-dompurify";

const signUp = async (
  email: string,
  password: string,
  username: string,
  bio?: string
) => {
  // Sanitize inputs
  const cleanUsername = DOMPurify.sanitize(username, { ALLOWED_TAGS: [] });
  const cleanBio = DOMPurify.sanitize(bio || "", {
    ALLOWED_TAGS: ["b", "i", "em", "strong"],
  });

  // Validate username format
  if (!/^[a-zA-Z0-9_-]{3,20}$/.test(cleanUsername)) {
    throw new Error("Username must be 3-20 characters, alphanumeric only");
  }

  // ... rest of signup
};
```

---

### 8. Exposed Build Errors in Production

**Location:** `next.config.ts:4-12`

**Issue:** TypeScript and ESLint errors ignored in production builds.

```typescript
eslint: {
  ignoreDuringBuilds: true, // ⚠️ BAD!
},
typescript: {
  ignoreBuildErrors: true, // ⚠️ BAD!
},
```

**Impact:** Type errors and linting issues can lead to runtime bugs and security vulnerabilities.

**Fix:** Remove these flags and fix all errors before deploying.

---

### 9. Profile Picture Access Control

**Location:** `src/lib/storage.ts`

**Issue:** Profile pictures may be publicly accessible without authentication.

**Required:** Verify Supabase Storage bucket policies allow public read but authenticated write only.

```sql
-- Storage RLS policy needed
CREATE POLICY "Anyone can view profile pictures"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-pictures');

CREATE POLICY "Authenticated users can upload own profile picture"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile-pictures'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

---

## 🟢 LOW SEVERITY ISSUES

### 10. No CSRF Protection

**Location:** All API routes

**Issue:** Next.js API routes don't have explicit CSRF tokens.

**Mitigation:** Next.js uses SameSite cookies which provide some protection, but consider adding CSRF tokens for sensitive operations.

---

### 11. Console.log Statements in Production

**Location:** Throughout codebase

**Issue:** Debug logging exposes internal logic and data structures.

**Fix:** Use environment-based logging:

```typescript
const isDev = process.env.NODE_ENV === "development";
if (isDev) console.log("Debug info");
```

---

### 12. No Content Security Policy (CSP)

**Location:** Missing

**Recommendation:** Add CSP headers to prevent XSS:

```typescript
// next.config.ts
const nextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
          },
        ],
      },
    ];
  },
};
```

---

## Priority Fix List

### Immediate (Within 24 hours):

1. ✅ **Add time-based pick restrictions** - Prevents post-game cheating
2. ✅ **Add database lock count validation** - Prevents unlimited locks
3. ✅ **Add file type validation (magic bytes)** - Prevents malicious uploads

### Short Term (Within 1 week):

4. Add rate limiting
5. Implement RLS policies
6. Add input sanitization
7. Fix build error ignoring

### Medium Term (Within 1 month):

8. Add CSRF tokens
9. Implement CSP headers
10. Add IP whitelisting for cron jobs
11. Add monitoring/alerting for suspicious activity

---

## Testing Checklist

- [ ] Try modifying pick after game starts
- [ ] Try using more than 3 locks per week
- [ ] Try uploading non-image file as profile picture
- [ ] Try XSS in username/bio fields
- [ ] Try accessing other users' data
- [ ] Try spam-clicking pick buttons
- [ ] Check database for orphaned/corrupted data
- [ ] Verify RLS policies block unauthorized access

---

## Conclusion

The application has several critical vulnerabilities that **MUST** be fixed before going to production. The most serious issues are:

1. **Game timing bypass** - Users can cheat by picking winners after games complete
2. **Lock count bypass** - Users can gain unfair advantage with unlimited locks
3. **File upload vulnerabilities** - Potential for XSS and storage attacks

Once these are fixed, the application will be significantly more secure.

**Recommendation:** Do NOT deploy to production until Critical and High severity issues are resolved.
