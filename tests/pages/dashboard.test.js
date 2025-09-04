/**
 * Dashboard Page Tests
 * Tests for the main dashboard functionality including games, picks, and locks
 */

const fs = require("fs");
const path = require("path");

function testDashboardPage() {
  console.log("\n📊 Testing Dashboard Page...");

  const tests = [];

  // Test dashboard page exists
  tests.push({
    name: "Dashboard page exists",
    test: () => {
      const filePath = "src/app/dashboard/page.tsx";
      return fs.existsSync(filePath) ? true : `File not found: ${filePath}`;
    },
  });

  // Test dashboard functionality
  tests.push({
    name: "Dashboard has game loading",
    test: () => {
      const filePath = "src/app/dashboard/page.tsx";
      if (!fs.existsSync(filePath)) return "File not found";
      const content = fs.readFileSync(filePath, "utf8");
      return content.includes("loadGames") ? true : "Game loading not found";
    },
  });

  tests.push({
    name: "Dashboard has pick loading",
    test: () => {
      const filePath = "src/app/dashboard/page.tsx";
      if (!fs.existsSync(filePath)) return "File not found";
      const content = fs.readFileSync(filePath, "utf8");
      return content.includes("loadPicks") ? true : "Pick loading not found";
    },
  });

  tests.push({
    name: "Dashboard has pick making",
    test: () => {
      const filePath = "src/app/dashboard/page.tsx";
      if (!fs.existsSync(filePath)) return "File not found";
      const content = fs.readFileSync(filePath, "utf8");
      return content.includes("makePick") ? true : "Pick making not found";
    },
  });

  tests.push({
    name: "Dashboard has lock functionality",
    test: () => {
      const filePath = "src/app/dashboard/page.tsx";
      if (!fs.existsSync(filePath)) return "File not found";
      const content = fs.readFileSync(filePath, "utf8");
      return content.includes("is_lock")
        ? true
        : "Lock functionality not found";
    },
  });

  tests.push({
    name: "Dashboard has lock tracking",
    test: () => {
      const filePath = "src/app/dashboard/page.tsx";
      if (!fs.existsSync(filePath)) return "File not found";
      const content = fs.readFileSync(filePath, "utf8");
      return content.includes("locksUsed") ? true : "Lock tracking not found";
    },
  });

  tests.push({
    name: "Dashboard has week selection",
    test: () => {
      const filePath = "src/app/dashboard/page.tsx";
      if (!fs.existsSync(filePath)) return "File not found";
      const content = fs.readFileSync(filePath, "utf8");
      return content.includes("selectedWeek")
        ? true
        : "Week selection not found";
    },
  });

  tests.push({
    name: "Dashboard has season type selection",
    test: () => {
      const filePath = "src/app/dashboard/page.tsx";
      if (!fs.existsSync(filePath)) return "File not found";
      const content = fs.readFileSync(filePath, "utf8");
      return content.includes("selectedSeasonType")
        ? true
        : "Season type selection not found";
    },
  });

  tests.push({
    name: "Dashboard has game locking",
    test: () => {
      const filePath = "src/app/dashboard/page.tsx";
      if (!fs.existsSync(filePath)) return "File not found";
      const content = fs.readFileSync(filePath, "utf8");
      return content.includes("isGameLocked") ? true : "Game locking not found";
    },
  });

  tests.push({
    name: "Dashboard has team colors",
    test: () => {
      const filePath = "src/app/dashboard/page.tsx";
      if (!fs.existsSync(filePath)) return "File not found";
      const content = fs.readFileSync(filePath, "utf8");
      return content.includes("getTeamColors") ? true : "Team colors not found";
    },
  });

  tests.push({
    name: "Dashboard has Supabase integration",
    test: () => {
      const filePath = "src/app/dashboard/page.tsx";
      if (!fs.existsSync(filePath)) return "File not found";
      const content = fs.readFileSync(filePath, "utf8");
      return content.includes("supabase")
        ? true
        : "Supabase integration not found";
    },
  });

  tests.push({
    name: "Dashboard has authentication check",
    test: () => {
      const filePath = "src/app/dashboard/page.tsx";
      if (!fs.existsSync(filePath)) return "File not found";
      const content = fs.readFileSync(filePath, "utf8");
      return content.includes("useAuth")
        ? true
        : "Authentication check not found";
    },
  });

  return tests;
}

module.exports = { testDashboardPage };
