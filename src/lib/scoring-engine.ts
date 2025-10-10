import type { Game, Pick } from "./supabase";

export interface ScoringInput {
  isCorrect: boolean;
  isLock: boolean;
  week: number;
  soloStatus: {
    isSoloPick: boolean;
    isSoloLock: boolean;
  };
}

export interface ScoringResult {
  basePoints: number;
  bonusPoints: number;
  totalPoints: number;
  breakdown: string;
}

export function calculatePickScore(input: ScoringInput): ScoringResult {
  const { isCorrect, isLock, week, soloStatus } = input;

  // Base points (all weeks)
  const basePoints = isCorrect ? (isLock ? 2 : 1) : isLock ? -2 : 0;

  // Bonus points (week 3+ and only for correct picks)
  let bonusPoints = 0;
  if (isCorrect && week >= 3) {
    if (isLock && soloStatus.isSoloPick) {
      // Super bonus: solo pick + lock (implies solo lock)
      bonusPoints = 5;
    } else if (soloStatus.isSoloLock) {
      bonusPoints = 2;
    } else if (soloStatus.isSoloPick) {
      bonusPoints = 2;
    }
  }

  return {
    basePoints,
    bonusPoints,
    totalPoints: basePoints + bonusPoints,
    breakdown: `base=${basePoints}, bonus=${bonusPoints}, week=${week}, isLock=${isLock}, isCorrect=${isCorrect}, soloPick=${soloStatus.isSoloPick}, soloLock=${soloStatus.isSoloLock}`,
  };
}

export function determineWinner(game: Game): string | null {
  if (game.status !== "completed") return null;
  if (game.home_score == null || game.away_score == null) return null;
  if (game.home_score === game.away_score) return null; // tie
  return game.home_score > game.away_score ? game.home_team : game.away_team;
}

export function calculateSoloStatusForPick(
  pick: Pick,
  allPicks: Pick[]
): { isSoloPick: boolean; isSoloLock: boolean } {
  const team = pick.picked_team;
  const teamPicks = allPicks.filter((p) => p.picked_team === team);
  const teamLocks = teamPicks.filter((p) => !!p.is_lock);

  const isSoloPick = teamPicks.length === 1;
  const isSoloLock = !!pick.is_lock && teamLocks.length === 1;

  return { isSoloPick, isSoloLock };
}
