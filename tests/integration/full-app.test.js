/**
 * Full App Integration Tests
 * Tests for the complete application flow and integration
 */

const fs = require("fs");
const path = require("path");

function testFullAppIntegration() {
  console.log("\n🔗 Testing Full App Integration...");

  const tests = [];

  // Test main app structure
  tests.push({
    name: "Main app page exists",
    test: () => {
      const filePath = "src/app/page.tsx";
      return fs.existsSync(filePath) ? true : `File not found: ${filePath}`;
    },
  });

  tests.push({
    name: "App layout exists",
    test: () => {
      const filePath = "src/app/layout.tsx";
      return fs.existsSync(filePath) ? true : `File not found: ${filePath}`;
    },
  });

  tests.push({
    name: "Global CSS exists",
    test: () => {
      const filePath = "src/app/globals.css";
      return fs.existsSync(filePath) ? true : `File not found: ${filePath}`;
    },
  });

  // Test navigation integration
  tests.push({
    name: "Navigation component exists",
    test: () => {
      const filePath = "src/components/Navigation.tsx";
      return fs.existsSync(filePath) ? true : `File not found: ${filePath}`;
    },
  });

  tests.push({
    name: "Navigation has all required links",
    test: () => {
      const filePath = "src/components/Navigation.tsx";
      if (!fs.existsSync(filePath)) return "File not found";
      const content = fs.readFileSync(filePath, "utf8");
      const hasDashboard = content.includes("dashboard");
      const hasProfile = content.includes("profile");
      const hasLeaderboard = content.includes("leaderboard");
      const hasAdmin = content.includes("admin");
      return hasDashboard && hasProfile && hasLeaderboard && hasAdmin
        ? true
        : "Missing navigation links";
    },
  });

  // Test admin functionality
  tests.push({
    name: "Admin page exists",
    test: () => {
      const filePath = "src/app/admin/page.tsx";
      return fs.existsSync(filePath) ? true : `File not found: ${filePath}`;
    },
  });

  tests.push({
    name: "Admin picks page exists",
    test: () => {
      const filePath = "src/app/admin/picks/page.tsx";
      return fs.existsSync(filePath) ? true : `File not found: ${filePath}`;
    },
  });

  // Test utility libraries
  tests.push({
    name: "Team colors library exists",
    test: () => {
      const filePath = "src/lib/team-colors.ts";
      return fs.existsSync(filePath) ? true : `File not found: ${filePath}`;
    },
  });

  tests.push({
    name: "Scoring library exists",
    test: () => {
      const filePath = "src/lib/scoring.ts";
      return fs.existsSync(filePath) ? true : `File not found: ${filePath}`;
    },
  });

  tests.push({
    name: "Awards library exists",
    test: () => {
      const filePath = "src/lib/awards.ts";
      return fs.existsSync(filePath) ? true : `File not found: ${filePath}`;
    },
  });

  // Test configuration files
  tests.push({
    name: "Package.json exists",
    test: () => {
      const filePath = "package.json";
      return fs.existsSync(filePath) ? true : `File not found: ${filePath}`;
    },
  });

  tests.push({
    name: "Next.js config exists",
    test: () => {
      const filePath = "next.config.ts";
      return fs.existsSync(filePath) ? true : `File not found: ${filePath}`;
    },
  });

  tests.push({
    name: "TypeScript config exists",
    test: () => {
      const filePath = "tsconfig.json";
      return fs.existsSync(filePath) ? true : `File not found: ${filePath}`;
    },
  });

  tests.push({
    name: "Tailwind CSS configured",
    test: () => {
      const packagePath = "package.json";
      if (!fs.existsSync(packagePath)) return "Package.json not found";
      const content = fs.readFileSync(packagePath, "utf8");
      return content.includes("tailwindcss")
        ? true
        : "Tailwind CSS not configured";
    },
  });

  tests.push({
    name: "Components config exists",
    test: () => {
      const filePath = "components.json";
      return fs.existsSync(filePath) ? true : `File not found: ${filePath}`;
    },
  });

  // Test database schema files
  tests.push({
    name: "Database updates file exists",
    test: () => {
      const filePath = "database-updates.sql";
      return fs.existsSync(filePath) ? true : `File not found: ${filePath}`;
    },
  });

  tests.push({
    name: "Database update guide exists",
    test: () => {
      const filePath = "DATABASE_UPDATE_LOCK_PICKS.md";
      return fs.existsSync(filePath) ? true : `File not found: ${filePath}`;
    },
  });

  // Test environment setup
  tests.push({
    name: "Environment file exists",
    test: () => {
      const filePath = ".env.local";
      return fs.existsSync(filePath) ? true : `File not found: ${filePath}`;
    },
  });

  tests.push({
    name: "Environment has Supabase URL",
    test: () => {
      const filePath = ".env.local";
      if (!fs.existsSync(filePath)) return "File not found";
      const content = fs.readFileSync(filePath, "utf8");
      return content.includes("NEXT_PUBLIC_SUPABASE_URL")
        ? true
        : "Supabase URL not configured";
    },
  });

  tests.push({
    name: "Environment has Supabase key",
    test: () => {
      const filePath = ".env.local";
      if (!fs.existsSync(filePath)) return "File not found";
      const content = fs.readFileSync(filePath, "utf8");
      return content.includes("NEXT_PUBLIC_SUPABASE_ANON_KEY")
        ? true
        : "Supabase key not configured";
    },
  });

  return tests;
}

module.exports = { testFullAppIntegration };
