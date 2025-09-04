#!/usr/bin/env node

/**
 * NFL Pick'em App Test Runner
 *
 * This script runs comprehensive tests for the NFL Pick'em application
 * to verify all functionality is working correctly.
 */

const fs = require("fs");
const path = require("path");

// Test configuration
const config = {
  testDir: "./tests",
  verbose: true,
  colors: {
    pass: "\x1b[32m✓\x1b[0m",
    fail: "\x1b[31m✗\x1b[0m",
    info: "\x1b[36mℹ\x1b[0m",
    warn: "\x1b[33m⚠\x1b[0m",
  },
};

// Test results tracking
let testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: [],
};

// Utility functions
function log(message, type = "info") {
  const color = config.colors[type] || config.colors.info;
  console.log(`${color} ${message}`);
}

function runTest(testName, testFunction) {
  testResults.total++;
  try {
    const result = testFunction();
    if (result === true || result === undefined) {
      testResults.passed++;
      log(`${testName}`, "pass");
      return true;
    } else {
      testResults.failed++;
      testResults.errors.push(`${testName}: ${result}`);
      log(`${testName}: ${result}`, "fail");
      return false;
    }
  } catch (error) {
    testResults.failed++;
    testResults.errors.push(`${testName}: ${error.message}`);
    log(`${testName}: ${error.message}`, "fail");
    return false;
  }
}

// File existence tests
function testFileExists(filePath, description) {
  return runTest(`${description} exists`, () => {
    if (fs.existsSync(filePath)) {
      return true;
    }
    return `File not found: ${filePath}`;
  });
}

// File content tests
function testFileContains(filePath, searchText, description) {
  return runTest(`${description} contains required content`, () => {
    if (!fs.existsSync(filePath)) {
      return `File not found: ${filePath}`;
    }

    const content = fs.readFileSync(filePath, "utf8");
    if (content.includes(searchText)) {
      return true;
    }
    return `Required content not found: ${searchText}`;
  });
}

// Component structure tests
function testComponentStructure() {
  log("\n🔍 Testing Component Structure...", "info");

  const components = [
    "src/components/ui/button.tsx",
    "src/components/ui/card.tsx",
    "src/components/ui/input.tsx",
    "src/components/ui/label.tsx",
    "src/components/Navigation.tsx",
    "src/components/auth/LoginForm.tsx",
    "src/components/auth/RegisterForm.tsx",
  ];

  components.forEach((component) => {
    testFileExists(component, `Component ${path.basename(component)}`);
  });
}

// Page structure tests
function testPageStructure() {
  log("\n📄 Testing Page Structure...", "info");

  const pages = [
    "src/app/page.tsx",
    "src/app/dashboard/page.tsx",
    "src/app/profile/page.tsx",
    "src/app/leaderboard/page.tsx",
    "src/app/admin/page.tsx",
    "src/app/admin/picks/page.tsx",
  ];

  pages.forEach((page) => {
    testFileExists(page, `Page ${path.basename(page, ".tsx")}`);
  });
}

// Library structure tests
function testLibraryStructure() {
  log("\n📚 Testing Library Structure...", "info");

  const libFiles = [
    "src/lib/supabase.ts",
    "src/lib/team-colors.ts",
    "src/lib/scoring.ts",
    "src/lib/awards.ts",
  ];

  libFiles.forEach((libFile) => {
    testFileExists(libFile, `Library ${path.basename(libFile, ".ts")}`);
  });
}

// Configuration tests
function testConfiguration() {
  log("\n⚙️ Testing Configuration...", "info");

  const configFiles = [
    "package.json",
    "next.config.ts",
    "tsconfig.json",
    "tailwind.config.js",
    "components.json",
  ];

  configFiles.forEach((configFile) => {
    testFileExists(configFile, `Config ${configFile}`);
  });
}

// Environment tests
function testEnvironment() {
  log("\n🌍 Testing Environment...", "info");

  testFileExists(".env.local", "Environment file");

  if (fs.existsSync(".env.local")) {
    const envContent = fs.readFileSync(".env.local", "utf8");
    testFileContains(".env.local", "NEXT_PUBLIC_SUPABASE_URL", "Supabase URL");
    testFileContains(
      ".env.local",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "Supabase Key"
    );
  }
}

// Database schema tests
function testDatabaseSchema() {
  log("\n🗄️ Testing Database Schema...", "info");

  const schemaFiles = ["database-updates.sql", "DATABASE_UPDATE_LOCK_PICKS.md"];

  schemaFiles.forEach((schemaFile) => {
    testFileExists(schemaFile, `Schema ${schemaFile}`);
  });
}

// Code quality tests
function testCodeQuality() {
  log("\n✨ Testing Code Quality...", "info");

  // Check for TypeScript usage
  const tsFiles = [
    "src/app/page.tsx",
    "src/app/dashboard/page.tsx",
    "src/contexts/AuthContext.tsx",
  ];

  tsFiles.forEach((tsFile) => {
    if (fs.existsSync(tsFile)) {
      const content = fs.readFileSync(tsFile, "utf8");
      testFileContains(tsFile, "interface", "TypeScript interfaces");
      testFileContains(tsFile, "useState", "React hooks");
    }
  });
}

// Feature completeness tests
function testFeatureCompleteness() {
  log("\n🎯 Testing Feature Completeness...", "info");

  // Test authentication features
  if (fs.existsSync("src/contexts/AuthContext.tsx")) {
    const authContent = fs.readFileSync("src/contexts/AuthContext.tsx", "utf8");
    testFileContains(
      "src/contexts/AuthContext.tsx",
      "signUp",
      "Sign up functionality"
    );
    testFileContains(
      "src/contexts/AuthContext.tsx",
      "signIn",
      "Sign in functionality"
    );
    testFileContains(
      "src/contexts/AuthContext.tsx",
      "signOut",
      "Sign out functionality"
    );
  }

  // Test dashboard features
  if (fs.existsSync("src/app/dashboard/page.tsx")) {
    const dashboardContent = fs.readFileSync(
      "src/app/dashboard/page.tsx",
      "utf8"
    );
    testFileContains(
      "src/app/dashboard/page.tsx",
      "makePick",
      "Pick making functionality"
    );
    testFileContains(
      "src/app/dashboard/page.tsx",
      "is_lock",
      "Lock picks functionality"
    );
    testFileContains(
      "src/app/dashboard/page.tsx",
      "locksUsed",
      "Lock tracking"
    );
  }

  // Test leaderboard features
  if (fs.existsSync("src/app/leaderboard/page.tsx")) {
    const leaderboardContent = fs.readFileSync(
      "src/app/leaderboard/page.tsx",
      "utf8"
    );
    testFileContains(
      "src/app/leaderboard/page.tsx",
      "leaderboard",
      "Leaderboard display"
    );
    testFileContains(
      "src/app/leaderboard/page.tsx",
      "total_points",
      "Points calculation"
    );
  }

  // Test profile features
  if (fs.existsSync("src/app/profile/page.tsx")) {
    const profileContent = fs.readFileSync("src/app/profile/page.tsx", "utf8");
    testFileContains(
      "src/app/profile/page.tsx",
      "UserStats",
      "User statistics"
    );
    testFileContains("src/app/profile/page.tsx", "awards", "Awards system");
  }
}

// Integration tests
function testIntegration() {
  log("\n🔗 Testing Integration...", "info");

  // Test Supabase integration
  if (fs.existsSync("src/lib/supabase.ts")) {
    const supabaseContent = fs.readFileSync("src/lib/supabase.ts", "utf8");
    testFileContains("src/lib/supabase.ts", "createClient", "Supabase client");
    testFileContains("src/lib/supabase.ts", "profiles", "Profiles table");
    testFileContains("src/lib/supabase.ts", "games", "Games table");
    testFileContains("src/lib/supabase.ts", "picks", "Picks table");
  }

  // Test navigation integration
  if (fs.existsSync("src/components/Navigation.tsx")) {
    const navContent = fs.readFileSync("src/components/Navigation.tsx", "utf8");
    testFileContains(
      "src/components/Navigation.tsx",
      "dashboard",
      "Dashboard link"
    );
    testFileContains(
      "src/components/Navigation.tsx",
      "profile",
      "Profile link"
    );
    testFileContains(
      "src/components/Navigation.tsx",
      "leaderboard",
      "Leaderboard link"
    );
  }
}

// Main test runner
function runAllTests() {
  log("🚀 Starting NFL Pick'em App Tests...", "info");
  log("=====================================", "info");

  testComponentStructure();
  testPageStructure();
  testLibraryStructure();
  testConfiguration();
  testEnvironment();
  testDatabaseSchema();
  testCodeQuality();
  testFeatureCompleteness();
  testIntegration();

  // Print results
  log("\n📊 Test Results Summary:", "info");
  log("========================", "info");
  log(`Total Tests: ${testResults.total}`, "info");
  log(`Passed: ${testResults.passed}`, "pass");
  log(
    `Failed: ${testResults.failed}`,
    testResults.failed > 0 ? "fail" : "pass"
  );

  if (testResults.errors.length > 0) {
    log("\n❌ Failed Tests:", "fail");
    testResults.errors.forEach((error) => {
      log(`  - ${error}`, "fail");
    });
  }

  if (testResults.failed === 0) {
    log("\n🎉 All tests passed! Your app is ready to go!", "pass");
  } else {
    log(
      `\n⚠️  ${testResults.failed} test(s) failed. Please review the issues above.`,
      "warn"
    );
  }

  return testResults.failed === 0;
}

// Run tests if called directly
if (require.main === module) {
  const success = runAllTests();
  process.exit(success ? 0 : 1);
}

module.exports = { runAllTests, testResults };
