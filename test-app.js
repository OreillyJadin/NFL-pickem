#!/usr/bin/env node

/**
 * Quick Test Script for NFL Pick'em App
 * Run with: node test-app.js
 */

const { runAllTests } = require("./tests/run-tests.js");

console.log("🧪 Running NFL Pick'em App Tests...\n");

const success = runAllTests();

if (success) {
  console.log("\n✅ All tests passed! Your app is ready to go!");
  process.exit(0);
} else {
  console.log("\n❌ Some tests failed. Please check the output above.");
  process.exit(1);
}
