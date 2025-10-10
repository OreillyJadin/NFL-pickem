import type { Game } from "./supabase";

export function validateGameForScoring(game: Game): {
  canScore: boolean;
  reason?: string;
} {
  if (game.status !== "completed") {
    return { canScore: false, reason: "Game not completed" };
  }
  if (game.home_score === null || game.home_score === undefined) {
    return { canScore: false, reason: "Missing home score" };
  }
  if (game.away_score === null || game.away_score === undefined) {
    return { canScore: false, reason: "Missing away score" };
  }
  if (!game.week || game.week < 1) {
    return { canScore: false, reason: "Invalid week" };
  }
  return { canScore: true };
}
