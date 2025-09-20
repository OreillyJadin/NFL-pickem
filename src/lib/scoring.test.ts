import { calculatePickPoints } from "./scoring";
import { Pick, Game } from "./supabase";

async function testBonusPoints() {
  // Mock game data
  const mockGame: Game = {
    id: "game1",
    week: 3, // Week 3+ for bonus points
    season: 2025,
    season_type: "regular",
    status: "completed",
    home_team: "KC",
    away_team: "DEN",
    home_score: 28,
    away_score: 14,
    game_time: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  // Test Case 1: Regular pick, no bonus (multiple people picked correctly)
  const regularPick: Pick = {
    id: "pick1",
    user_id: "user1",
    game_id: "game1",
    picked_team: "KC",
    is_lock: false,
    created_at: new Date().toISOString(),
  };

  const otherCorrectPick: Pick = {
    id: "pick2",
    user_id: "user2",
    game_id: "game1",
    picked_team: "KC",
    is_lock: false,
    created_at: new Date().toISOString(),
  };

  // Test Case 2: Solo correct pick
  const soloPick: Pick = {
    id: "pick3",
    user_id: "user3",
    game_id: "game1",
    picked_team: "KC",
    is_lock: false,
    created_at: new Date().toISOString(),
  };

  // Test Case 3: Solo correct lock (with another non-lock pick)
  const soloLock: Pick = {
    id: "pick4",
    user_id: "user4",
    game_id: "game1",
    picked_team: "KC",
    is_lock: true,
    created_at: new Date().toISOString(),
  };

  const nonLockPick: Pick = {
    id: "pick6",
    user_id: "user6",
    game_id: "game1",
    picked_team: "KC",
    is_lock: false,
    created_at: new Date().toISOString(),
  };

  // Test Case 4: Super bonus (solo pick AND solo lock)
  const superBonus: Pick = {
    id: "pick5",
    user_id: "user5",
    game_id: "game1",
    picked_team: "KC",
    is_lock: true,
    created_at: new Date().toISOString(),
  };

  // Run tests
  console.log("\n=== Running Bonus Points Tests ===\n");

  // Test 1: Regular pick (no bonus)
  const regularResult = await calculatePickPoints(regularPick, mockGame, [
    regularPick,
    otherCorrectPick,
  ]);
  console.log("Test 1 - Regular pick (should be 1 point, no bonus):");
  console.log("Result:", regularResult);
  console.log("Expected: { isCorrect: true, points: 1, bonus: 0 }");
  console.log(
    "Passed:",
    regularResult.points === 1 && regularResult.bonus === 0
  );

  // Test 2: Solo pick bonus
  const soloResult = await calculatePickPoints(soloPick, mockGame, [soloPick]);
  console.log("\nTest 2 - Solo pick (should be 3 points, 2 bonus):");
  console.log("Result:", soloResult);
  console.log("Expected: { isCorrect: true, points: 3, bonus: 2 }");
  console.log("Passed:", soloResult.points === 3 && soloResult.bonus === 2);

  // Test 3: Solo lock bonus
  const soloLockResult = await calculatePickPoints(soloLock, mockGame, [
    soloLock,
    nonLockPick,
  ]);
  console.log("\nTest 3 - Solo lock (should be 4 points, 2 bonus):");
  console.log("Result:", soloLockResult);
  console.log("Expected: { isCorrect: true, points: 4, bonus: 2 }");
  console.log(
    "Passed:",
    soloLockResult.points === 4 && soloLockResult.bonus === 2
  );

  // Test 4: Super bonus
  const superResult = await calculatePickPoints(superBonus, mockGame, [
    superBonus,
  ]);
  console.log("\nTest 4 - Super bonus (should be 7 points, 5 bonus):");
  console.log("Result:", superResult);
  console.log("Expected: { isCorrect: true, points: 7, bonus: 5 }");
  console.log("Passed:", superResult.points === 7 && superResult.bonus === 5);

  // Test 5: Week 2 (no bonus)
  const week2Game = { ...mockGame, week: 2 };
  const week2Result = await calculatePickPoints(soloPick, week2Game, [
    soloPick,
  ]);
  console.log("\nTest 5 - Week 2 pick (should be 1 point, no bonus):");
  console.log("Result:", week2Result);
  console.log("Expected: { isCorrect: true, points: 1, bonus: 0 }");
  console.log("Passed:", week2Result.points === 1 && week2Result.bonus === 0);

  // Test 6: Incorrect pick
  const incorrectPick: Pick = {
    ...regularPick,
    picked_team: "DEN",
  };
  const incorrectResult = await calculatePickPoints(incorrectPick, mockGame, [
    incorrectPick,
  ]);
  console.log("\nTest 6 - Incorrect pick (should be 0 points, no bonus):");
  console.log("Result:", incorrectResult);
  console.log("Expected: { isCorrect: false, points: 0, bonus: 0 }");
  console.log(
    "Passed:",
    incorrectResult.points === 0 && incorrectResult.bonus === 0
  );
}

// Run the tests
testBonusPoints().catch(console.error);
