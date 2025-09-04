/**
 * Leaderboard Page Tests
 * Tests for the leaderboard functionality including scoring and rankings
 */

const fs = require("fs");
const path = require("path");

function testLeaderboardPage() {
  console.log("\n🏆 Testing Leaderboard Page...");

  const tests = [];

  // Test leaderboard page exists
  tests.push({
    name: "Leaderboard page exists",
    test: () => {
      const filePath = "src/app/leaderboard/page.tsx";
      return fs.existsSync(filePath) ? true : `File not found: ${filePath}`;
    },
  });

  // Test leaderboard functionality
  tests.push({
    name: "Leaderboard has data loading",
    test: () => {
      const filePath = "src/app/leaderboard/page.tsx";
      if (!fs.existsSync(filePath)) return "File not found";
      const content = fs.readFileSync(filePath, "utf8");
      return content.includes("loadLeaderboard")
        ? true
        : "Data loading not found";
    },
  });

  tests.push({
    name: "Leaderboard has season view",
    test: () => {
      const filePath = "src/app/leaderboard/page.tsx";
      if (!fs.existsSync(filePath)) return "File not found";
      const content = fs.readFileSync(filePath, "utf8");
      return content.includes("viewMode") ? true : "View mode not found";
    },
  });

  tests.push({
    name: "Leaderboard has weekly view",
    test: () => {
      const filePath = "src/app/leaderboard/page.tsx";
      if (!fs.existsSync(filePath)) return "File not found";
      const content = fs.readFileSync(filePath, "utf8");
      return content.includes("weekly") ? true : "Weekly view not found";
    },
  });

  tests.push({
    name: "Leaderboard has points calculation",
    test: () => {
      const filePath = "src/app/leaderboard/page.tsx";
      if (!fs.existsSync(filePath)) return "File not found";
      const content = fs.readFileSync(filePath, "utf8");
      return content.includes("total_points")
        ? true
        : "Points calculation not found";
    },
  });

  tests.push({
    name: "Leaderboard has lock scoring",
    test: () => {
      const filePath = "src/app/leaderboard/page.tsx";
      if (!fs.existsSync(filePath)) return "File not found";
      const content = fs.readFileSync(filePath, "utf8");
      return content.includes("is_lock") ? true : "Lock scoring not found";
    },
  });

  tests.push({
    name: "Leaderboard has win percentage",
    test: () => {
      const filePath = "src/app/leaderboard/page.tsx";
      if (!fs.existsSync(filePath)) return "File not found";
      const content = fs.readFileSync(filePath, "utf8");
      return content.includes("correct_picks") &&
        content.includes("total_picks")
        ? true
        : "Win percentage calculation not found";
    },
  });

  tests.push({
    name: "Leaderboard has ranking",
    test: () => {
      const filePath = "src/app/leaderboard/page.tsx";
      if (!fs.existsSync(filePath)) return "File not found";
      const content = fs.readFileSync(filePath, "utf8");
      return content.includes("rank") || content.includes("index")
        ? true
        : "Ranking not found";
    },
  });

  tests.push({
    name: "Leaderboard has medals for top 3",
    test: () => {
      const filePath = "src/app/leaderboard/page.tsx";
      if (!fs.existsSync(filePath)) return "File not found";
      const content = fs.readFileSync(filePath, "utf8");
      return content.includes("🥇") ||
        content.includes("🥈") ||
        content.includes("🥉")
        ? true
        : "Medals not found";
    },
  });

  tests.push({
    name: "Leaderboard has Supabase integration",
    test: () => {
      const filePath = "src/app/leaderboard/page.tsx";
      if (!fs.existsSync(filePath)) return "File not found";
      const content = fs.readFileSync(filePath, "utf8");
      return content.includes("supabase")
        ? true
        : "Supabase integration not found";
    },
  });

  tests.push({
    name: "Leaderboard has user profiles",
    test: () => {
      const filePath = "src/app/leaderboard/page.tsx";
      if (!fs.existsSync(filePath)) return "File not found";
      const content = fs.readFileSync(filePath, "utf8");
      return content.includes("profiles") ? true : "User profiles not found";
    },
  });

  tests.push({
    name: "Leaderboard has scoring system info",
    test: () => {
      const filePath = "src/app/leaderboard/page.tsx";
      if (!fs.existsSync(filePath)) return "File not found";
      const content = fs.readFileSync(filePath, "utf8");
      return content.includes("Scoring System")
        ? true
        : "Scoring system info not found";
    },
  });

  return tests;
}

module.exports = { testLeaderboardPage };
