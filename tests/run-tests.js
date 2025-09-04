#!/usr/bin/env node

/**
 * Comprehensive Test Runner for NFL Pick'em App
 *
 * This script runs all tests to verify the application is working correctly
 */

const fs = require("fs");
const path = require("path");

// Import individual test modules
const { testAuthComponents } = require("./components/auth.test.js");
const { testDashboardPage } = require("./pages/dashboard.test.js");
const { testLeaderboardPage } = require("./pages/leaderboard.test.js");
const { testProfilePage } = require("./pages/profile.test.js");
const { testSupabaseLibrary } = require("./lib/supabase.test.js");
const { testFullAppIntegration } = require("./integration/full-app.test.js");

// Test configuration
const config = {
  colors: {
    pass: "\x1b[32m✓\x1b[0m",
    fail: "\x1b[31m✗\x1b[0m",
    info: "\x1b[36mℹ\x1b[0m",
    warn: "\x1b[33m⚠\x1b[0m",
    header: "\x1b[35m📋\x1b[0m",
  },
};

// Test results tracking
let testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: [],
  categories: {},
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

function runTestCategory(categoryName, testFunction) {
  log(`\n${categoryName}`, "header");
  log("=".repeat(categoryName.length + 2), "info");

  const categoryResults = {
    total: 0,
    passed: 0,
    failed: 0,
    errors: [],
  };

  const tests = testFunction();
  tests.forEach((test) => {
    categoryResults.total++;
    testResults.total++;

    try {
      const result = test.test();
      if (result === true || result === undefined) {
        categoryResults.passed++;
        testResults.passed++;
        log(`  ${test.name}`, "pass");
      } else {
        categoryResults.failed++;
        testResults.failed++;
        const error = `${test.name}: ${result}`;
        categoryResults.errors.push(error);
        testResults.errors.push(error);
        log(`  ${error}`, "fail");
      }
    } catch (error) {
      categoryResults.failed++;
      testResults.failed++;
      const errorMsg = `${test.name}: ${error.message}`;
      categoryResults.errors.push(errorMsg);
      testResults.errors.push(errorMsg);
      log(`  ${errorMsg}`, "fail");
    }
  });

  testResults.categories[categoryName] = categoryResults;

  // Print category summary
  log(
    `\n  Category Results: ${categoryResults.passed}/${categoryResults.total} passed`,
    categoryResults.failed === 0 ? "pass" : "warn"
  );

  return categoryResults;
}

// Main test runner
function runAllTests() {
  log("🚀 Starting NFL Pick'em App Comprehensive Tests...", "info");
  log("==================================================", "info");

  // Run all test categories
  runTestCategory("🔐 Authentication Components", testAuthComponents);
  runTestCategory("📊 Dashboard Page", testDashboardPage);
  runTestCategory("🏆 Leaderboard Page", testLeaderboardPage);
  runTestCategory("👤 Profile Page", testProfilePage);
  runTestCategory("🗄️ Supabase Library", testSupabaseLibrary);
  runTestCategory("🔗 Full App Integration", testFullAppIntegration);

  // Print final results
  log("\n📊 Final Test Results Summary:", "header");
  log("==============================", "info");
  log(`Total Tests: ${testResults.total}`, "info");
  log(`Passed: ${testResults.passed}`, "pass");
  log(
    `Failed: ${testResults.failed}`,
    testResults.failed > 0 ? "fail" : "pass"
  );

  // Print category breakdown
  log("\n📋 Category Breakdown:", "header");
  Object.entries(testResults.categories).forEach(([category, results]) => {
    const status = results.failed === 0 ? "pass" : "warn";
    log(`  ${category}: ${results.passed}/${results.total} passed`, status);
  });

  // Print failed tests if any
  if (testResults.errors.length > 0) {
    log("\n❌ Failed Tests Details:", "fail");
    testResults.errors.forEach((error) => {
      log(`  - ${error}`, "fail");
    });
  }

  // Print success message
  if (testResults.failed === 0) {
    log("\n🎉 All tests passed! Your NFL Pick'em app is ready to go!", "pass");
    log(
      '🚀 You can now run "npm run dev" to start the development server.',
      "info"
    );
  } else {
    log(
      `\n⚠️  ${testResults.failed} test(s) failed. Please review the issues above.`,
      "warn"
    );
    log("🔧 Fix the failing tests before deploying your app.", "warn");
  }

  // Print next steps
  log("\n📝 Next Steps:", "info");
  log('1. Run "npm run dev" to start the development server', "info");
  log("2. Open http://localhost:3000 in your browser", "info");
  log("3. Test the app functionality manually", "info");
  log("4. Deploy to Vercel when ready", "info");

  return testResults.failed === 0;
}

// Run tests if called directly
if (require.main === module) {
  const success = runAllTests();
  process.exit(success ? 0 : 1);
}

module.exports = { runAllTests, testResults };
