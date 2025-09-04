/**
 * Profile Page Tests
 * Tests for the user profile functionality including stats and awards
 */

const fs = require("fs");
const path = require("path");

function testProfilePage() {
  console.log("\n👤 Testing Profile Page...");

  const tests = [];

  // Test profile page exists
  tests.push({
    name: "Profile page exists",
    test: () => {
      const filePath = "src/app/profile/page.tsx";
      return fs.existsSync(filePath) ? true : `File not found: ${filePath}`;
    },
  });

  // Test profile functionality
  tests.push({
    name: "Profile has user stats",
    test: () => {
      const filePath = "src/app/profile/page.tsx";
      if (!fs.existsSync(filePath)) return "File not found";
      const content = fs.readFileSync(filePath, "utf8");
      return content.includes("UserStats") ? true : "User stats not found";
    },
  });

  tests.push({
    name: "Profile has stats loading",
    test: () => {
      const filePath = "src/app/profile/page.tsx";
      if (!fs.existsSync(filePath)) return "File not found";
      const content = fs.readFileSync(filePath, "utf8");
      return content.includes("loadUserStats")
        ? true
        : "Stats loading not found";
    },
  });

  tests.push({
    name: "Profile has pick history",
    test: () => {
      const filePath = "src/app/profile/page.tsx";
      if (!fs.existsSync(filePath)) return "File not found";
      const content = fs.readFileSync(filePath, "utf8");
      return content.includes("PickHistory") ? true : "Pick history not found";
    },
  });

  tests.push({
    name: "Profile has lock stats",
    test: () => {
      const filePath = "src/app/profile/page.tsx";
      if (!fs.existsSync(filePath)) return "File not found";
      const content = fs.readFileSync(filePath, "utf8");
      return content.includes("lockPicks") ? true : "Lock stats not found";
    },
  });

  tests.push({
    name: "Profile has win percentage",
    test: () => {
      const filePath = "src/app/profile/page.tsx";
      if (!fs.existsSync(filePath)) return "File not found";
      const content = fs.readFileSync(filePath, "utf8");
      return content.includes("winPercentage")
        ? true
        : "Win percentage not found";
    },
  });

  tests.push({
    name: "Profile has awards system",
    test: () => {
      const filePath = "src/app/profile/page.tsx";
      if (!fs.existsSync(filePath)) return "File not found";
      const content = fs.readFileSync(filePath, "utf8");
      return content.includes("awards") ? true : "Awards system not found";
    },
  });

  tests.push({
    name: "Profile has trophy wall",
    test: () => {
      const filePath = "src/app/profile/page.tsx";
      if (!fs.existsSync(filePath)) return "File not found";
      const content = fs.readFileSync(filePath, "utf8");
      return content.includes("Trophy Wall") ? true : "Trophy wall not found";
    },
  });

  tests.push({
    name: "Profile has lock record",
    test: () => {
      const filePath = "src/app/profile/page.tsx";
      if (!fs.existsSync(filePath)) return "File not found";
      const content = fs.readFileSync(filePath, "utf8");
      return content.includes("Lock Picks") ? true : "Lock record not found";
    },
  });

  tests.push({
    name: "Profile has completed games filter",
    test: () => {
      const filePath = "src/app/profile/page.tsx";
      if (!fs.existsSync(filePath)) return "File not found";
      const content = fs.readFileSync(filePath, "utf8");
      return content.includes("completed")
        ? true
        : "Completed games filter not found";
    },
  });

  tests.push({
    name: "Profile has Supabase integration",
    test: () => {
      const filePath = "src/app/profile/page.tsx";
      if (!fs.existsSync(filePath)) return "File not found";
      const content = fs.readFileSync(filePath, "utf8");
      return content.includes("supabase")
        ? true
        : "Supabase integration not found";
    },
  });

  tests.push({
    name: "Profile has authentication check",
    test: () => {
      const filePath = "src/app/profile/page.tsx";
      if (!fs.existsSync(filePath)) return "File not found";
      const content = fs.readFileSync(filePath, "utf8");
      return content.includes("useAuth")
        ? true
        : "Authentication check not found";
    },
  });

  return tests;
}

module.exports = { testProfilePage };
