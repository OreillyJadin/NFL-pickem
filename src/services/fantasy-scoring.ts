import { FantasyPlayerStats, ScoringFormat } from "@/types/database";

/**
 * Fantasy Football Scoring Engine
 * Calculates fantasy points for PPR, Half PPR, and Standard formats
 */

// Scoring constants for all formats
const SCORING = {
  // Passing
  PASSING_YARDS_PER_POINT: 25, // 1 point per 25 yards
  PASSING_TD: 4,
  INTERCEPTION: -2,

  // Rushing
  RUSHING_YARDS_PER_POINT: 10, // 1 point per 10 yards
  RUSHING_TD: 6,

  // Receiving
  RECEIVING_YARDS_PER_POINT: 10, // 1 point per 10 yards
  RECEIVING_TD: 6,
  RECEPTION_PPR: 1, // Full PPR
  RECEPTION_HALF_PPR: 0.5, // Half PPR
  RECEPTION_STANDARD: 0, // Standard (no PPR)

  // Other
  FUMBLE_LOST: -2,
  TWO_POINT_CONVERSION: 2,

  // Kicker
  FG_0_39: 3,
  FG_40_49: 4,
  FG_50_PLUS: 5,
  FG_MISSED: -1,
  XP_MADE: 1,
  XP_MISSED: -1,

  // Defense/Special Teams
  DST_SACK: 1,
  DST_INTERCEPTION: 2,
  DST_FUMBLE_RECOVERY: 2,
  DST_SAFETY: 2,
  DST_TD: 6,
  DST_BLOCKED_KICK: 2,
  // Points allowed scoring
  DST_POINTS_ALLOWED: [
    { max: 0, points: 10 },   // Shutout
    { max: 6, points: 7 },    // 1-6 points
    { max: 13, points: 4 },   // 7-13 points
    { max: 20, points: 1 },   // 14-20 points
    { max: 27, points: 0 },   // 21-27 points
    { max: 34, points: -1 },  // 28-34 points
    { max: Infinity, points: -4 }, // 35+ points
  ],
};

/**
 * Calculate points for passing stats
 */
function calculatePassingPoints(stats: Partial<FantasyPlayerStats>): number {
  let points = 0;

  // Passing yards
  points += (stats.passing_yards || 0) / SCORING.PASSING_YARDS_PER_POINT;

  // Passing TDs
  points += (stats.passing_tds || 0) * SCORING.PASSING_TD;

  // Interceptions
  points += (stats.interceptions || 0) * SCORING.INTERCEPTION;

  return points;
}

/**
 * Calculate points for rushing stats
 */
function calculateRushingPoints(stats: Partial<FantasyPlayerStats>): number {
  let points = 0;

  // Rushing yards
  points += (stats.rushing_yards || 0) / SCORING.RUSHING_YARDS_PER_POINT;

  // Rushing TDs
  points += (stats.rushing_tds || 0) * SCORING.RUSHING_TD;

  return points;
}

/**
 * Calculate points for receiving stats (format-specific for receptions)
 */
function calculateReceivingPoints(
  stats: Partial<FantasyPlayerStats>,
  format: ScoringFormat
): number {
  let points = 0;

  // Receiving yards
  points += (stats.receiving_yards || 0) / SCORING.RECEIVING_YARDS_PER_POINT;

  // Receiving TDs
  points += (stats.receiving_tds || 0) * SCORING.RECEIVING_TD;

  // Receptions (format-specific)
  const receptionValue =
    format === "ppr"
      ? SCORING.RECEPTION_PPR
      : format === "half_ppr"
      ? SCORING.RECEPTION_HALF_PPR
      : SCORING.RECEPTION_STANDARD;

  points += (stats.receptions || 0) * receptionValue;

  return points;
}

/**
 * Calculate points for kicker stats
 */
function calculateKickerPoints(stats: Partial<FantasyPlayerStats>): number {
  let points = 0;

  // Field goals by distance
  points += (stats.fg_made_0_39 || 0) * SCORING.FG_0_39;
  points += (stats.fg_made_40_49 || 0) * SCORING.FG_40_49;
  points += (stats.fg_made_50_plus || 0) * SCORING.FG_50_PLUS;
  points += (stats.fg_missed || 0) * SCORING.FG_MISSED;

  // Extra points
  points += (stats.xp_made || 0) * SCORING.XP_MADE;
  points += (stats.xp_missed || 0) * SCORING.XP_MISSED;

  return points;
}

/**
 * Calculate points for defense/special teams
 */
function calculateDSTPoints(stats: Partial<FantasyPlayerStats>): number {
  let points = 0;

  // Individual defensive stats
  points += (stats.dst_sacks || 0) * SCORING.DST_SACK;
  points += (stats.dst_interceptions || 0) * SCORING.DST_INTERCEPTION;
  points += (stats.dst_fumble_recoveries || 0) * SCORING.DST_FUMBLE_RECOVERY;
  points += (stats.dst_safeties || 0) * SCORING.DST_SAFETY;
  points += (stats.dst_tds || 0) * SCORING.DST_TD;
  points += (stats.dst_blocked_kicks || 0) * SCORING.DST_BLOCKED_KICK;

  // Points allowed
  if (stats.dst_points_allowed !== undefined && stats.dst_points_allowed !== null) {
    const pointsAllowed = stats.dst_points_allowed;
    for (const tier of SCORING.DST_POINTS_ALLOWED) {
      if (pointsAllowed <= tier.max) {
        points += tier.points;
        break;
      }
    }
  }

  return points;
}

/**
 * Calculate misc points (fumbles, 2pt conversions)
 */
function calculateMiscPoints(stats: Partial<FantasyPlayerStats>): number {
  let points = 0;

  points += (stats.fumbles_lost || 0) * SCORING.FUMBLE_LOST;
  points += (stats.two_point_conversions || 0) * SCORING.TWO_POINT_CONVERSION;

  return points;
}

/**
 * Calculate total fantasy points for a player in a specific format
 */
export function calculateFantasyPoints(
  stats: Partial<FantasyPlayerStats>,
  format: ScoringFormat
): number {
  let total = 0;

  total += calculatePassingPoints(stats);
  total += calculateRushingPoints(stats);
  total += calculateReceivingPoints(stats, format);
  total += calculateKickerPoints(stats);
  total += calculateDSTPoints(stats);
  total += calculateMiscPoints(stats);

  // Round to 2 decimal places
  return Math.round(total * 100) / 100;
}

/**
 * Calculate points in all three formats at once
 * Returns an object with points for each format
 */
export function calculateAllFormats(
  stats: Partial<FantasyPlayerStats>
): { ppr: number; half_ppr: number; standard: number } {
  return {
    ppr: calculateFantasyPoints(stats, "ppr"),
    half_ppr: calculateFantasyPoints(stats, "half_ppr"),
    standard: calculateFantasyPoints(stats, "standard"),
  };
}

/**
 * Get the points value based on format
 */
export function getPointsByFormat(
  points: { points_ppr: number; points_half_ppr: number; points_standard: number },
  format: ScoringFormat
): number {
  switch (format) {
    case "ppr":
      return points.points_ppr;
    case "half_ppr":
      return points.points_half_ppr;
    case "standard":
      return points.points_standard;
    default:
      return points.points_ppr;
  }
}

/**
 * Format points for display
 */
export function formatPoints(points: number): string {
  return points.toFixed(1);
}

/**
 * Get scoring format display name
 */
export function getScoringFormatName(format: ScoringFormat): string {
  switch (format) {
    case "ppr":
      return "PPR";
    case "half_ppr":
      return "Half PPR";
    case "standard":
      return "Standard";
    default:
      return "PPR";
  }
}
