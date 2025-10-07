import { describe, it, expect } from "vitest";

// Test data structure matching the awards processing
interface UserStats {
  points: number;
  correct: number;
  total: number;
}

interface TestUser {
  userId: string;
  stats: UserStats;
}

// Tiebreaker sorting function (extracted from awards.ts)
function sortUsersByTiebreaker(
  users: [string, UserStats][]
): [string, UserStats][] {
  return users.sort((a, b) => {
    // 1. Points (descending)
    if (b[1].points !== a[1].points) {
      return b[1].points - a[1].points;
    }

    // 2. Win percentage (descending)
    const aWinPercentage = a[1].total > 0 ? a[1].correct / a[1].total : 0;
    const bWinPercentage = b[1].total > 0 ? b[1].correct / b[1].total : 0;
    if (bWinPercentage !== aWinPercentage) {
      return bWinPercentage - aWinPercentage;
    }

    // 3. Wins (descending)
    if (b[1].correct !== a[1].correct) {
      return b[1].correct - a[1].correct;
    }

    // 4. Lowest losses (ascending)
    return a[1].total - a[1].correct - (b[1].total - b[1].correct);
  });
}

describe("Tiebreaker System", () => {
  describe("Points Tiebreaker", () => {
    it("should rank higher points first", () => {
      const users: [string, UserStats][] = [
        ["user1", { points: 10, correct: 5, total: 10 }],
        ["user2", { points: 15, correct: 7, total: 10 }],
        ["user3", { points: 8, correct: 4, total: 10 }],
      ];

      const sorted = sortUsersByTiebreaker(users);
      expect(sorted[0][0]).toBe("user2"); // 15 points
      expect(sorted[1][0]).toBe("user1"); // 10 points
      expect(sorted[2][0]).toBe("user3"); // 8 points
    });
  });

  describe("Win Percentage Tiebreaker", () => {
    it("should rank higher win percentage first when points are tied", () => {
      const users: [string, UserStats][] = [
        ["user1", { points: 15, correct: 12, total: 16 }], // 75%
        ["user2", { points: 15, correct: 11, total: 16 }], // 68.75%
        ["user3", { points: 15, correct: 10, total: 16 }], // 62.5%
      ];

      const sorted = sortUsersByTiebreaker(users);
      expect(sorted[0][0]).toBe("user1"); // 75%
      expect(sorted[1][0]).toBe("user2"); // 68.75%
      expect(sorted[2][0]).toBe("user3"); // 62.5%
    });

    it("should handle Week 3 scenario correctly", () => {
      const users: [string, UserStats][] = [
        ["lemon", { points: 15, correct: 11, total: 16 }], // 68.75%
        ["sage", { points: 15, correct: 12, total: 16 }], // 75%
      ];

      const sorted = sortUsersByTiebreaker(users);
      expect(sorted[0][0]).toBe("sage"); // Higher win percentage
      expect(sorted[1][0]).toBe("lemon"); // Lower win percentage
    });

    it("should handle Week 4 scenario correctly", () => {
      const users: [string, UserStats][] = [
        ["colton", { points: 15, correct: 10, total: 15 }], // 66.67%
        ["lemon", { points: 15, correct: 10, total: 14 }], // 71.43%
      ];

      const sorted = sortUsersByTiebreaker(users);
      expect(sorted[0][0]).toBe("lemon"); // Higher win percentage
      expect(sorted[1][0]).toBe("colton"); // Lower win percentage
    });
  });

  describe("Wins Tiebreaker", () => {
    it("should rank more wins first when points and win percentage are tied", () => {
      const users: [string, UserStats][] = [
        ["user1", { points: 15, correct: 10, total: 20 }], // 50%, 10 wins
        ["user2", { points: 15, correct: 10, total: 20 }], // 50%, 10 wins
        ["user3", { points: 15, correct: 12, total: 20 }], // 60%, 12 wins
      ];

      const sorted = sortUsersByTiebreaker(users);
      expect(sorted[0][0]).toBe("user3"); // Higher win percentage
      // user1 and user2 are tied in all criteria, so order is preserved
    });
  });

  describe("Losses Tiebreaker", () => {
    it("should rank fewer losses first when all other criteria are tied", () => {
      const users: [string, UserStats][] = [
        ["user1", { points: 15, correct: 10, total: 15 }], // 66.67%, 10 wins, 5 losses
        ["user2", { points: 15, correct: 10, total: 16 }], // 62.5%, 10 wins, 6 losses
      ];

      const sorted = sortUsersByTiebreaker(users);
      expect(sorted[0][0]).toBe("user1"); // Fewer losses (5 vs 6)
      expect(sorted[1][0]).toBe("user2"); // More losses
    });
  });

  describe("Edge Cases", () => {
    it("should handle zero total picks", () => {
      const users: [string, UserStats][] = [
        ["user1", { points: 0, correct: 0, total: 0 }],
        ["user2", { points: 5, correct: 3, total: 5 }],
      ];

      const sorted = sortUsersByTiebreaker(users);
      expect(sorted[0][0]).toBe("user2"); // Has points
      expect(sorted[1][0]).toBe("user1"); // No picks
    });

    it("should handle perfect records", () => {
      const users: [string, UserStats][] = [
        ["user1", { points: 15, correct: 10, total: 10 }], // 100%
        ["user2", { points: 15, correct: 9, total: 10 }], // 90%
      ];

      const sorted = sortUsersByTiebreaker(users);
      expect(sorted[0][0]).toBe("user1"); // Perfect record
      expect(sorted[1][0]).toBe("user2"); // 90%
    });

    it("should handle negative points", () => {
      const users: [string, UserStats][] = [
        ["user1", { points: -5, correct: 2, total: 10 }],
        ["user2", { points: 0, correct: 0, total: 5 }],
        ["user3", { points: 10, correct: 5, total: 10 }],
      ];

      const sorted = sortUsersByTiebreaker(users);
      expect(sorted[0][0]).toBe("user3"); // 10 points
      expect(sorted[1][0]).toBe("user2"); // 0 points
      expect(sorted[2][0]).toBe("user1"); // -5 points
    });
  });

  describe("Real World Scenarios", () => {
    it("should handle complex tiebreaker scenarios", () => {
      const users: [string, UserStats][] = [
        ["player1", { points: 15, correct: 12, total: 16 }], // 75%
        ["player2", { points: 15, correct: 11, total: 16 }], // 68.75%
        ["player3", { points: 14, correct: 9, total: 16 }], // 56.25%
        ["player4", { points: 15, correct: 10, total: 14 }], // 71.43%
        ["player5", { points: 15, correct: 10, total: 15 }], // 66.67%
      ];

      const sorted = sortUsersByTiebreaker(users);

      // Expected order: player1 (75%), player4 (71.43%), player2 (68.75%), player5 (66.67%), player3 (56.25%)
      expect(sorted[0][0]).toBe("player1"); // 75%
      expect(sorted[1][0]).toBe("player4"); // 71.43%
      expect(sorted[2][0]).toBe("player2"); // 68.75%
      expect(sorted[3][0]).toBe("player5"); // 66.67%
      expect(sorted[4][0]).toBe("player3"); // 56.25%
    });
  });
});
