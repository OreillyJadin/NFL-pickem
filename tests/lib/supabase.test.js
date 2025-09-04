/**
 * Supabase Library Tests
 * Tests for the Supabase configuration and database integration
 */

const fs = require("fs");
const path = require("path");

function testSupabaseLibrary() {
  console.log("\n🗄️ Testing Supabase Library...");

  const tests = [];

  // Test supabase.ts exists
  tests.push({
    name: "Supabase library exists",
    test: () => {
      const filePath = "src/lib/supabase.ts";
      return fs.existsSync(filePath) ? true : `File not found: ${filePath}`;
    },
  });

  // Test Supabase configuration
  tests.push({
    name: "Supabase client configuration",
    test: () => {
      const filePath = "src/lib/supabase.ts";
      if (!fs.existsSync(filePath)) return "File not found";
      const content = fs.readFileSync(filePath, "utf8");
      return content.includes("createClient")
        ? true
        : "Supabase client not configured";
    },
  });

  tests.push({
    name: "Supabase URL configuration",
    test: () => {
      const filePath = "src/lib/supabase.ts";
      if (!fs.existsSync(filePath)) return "File not found";
      const content = fs.readFileSync(filePath, "utf8");
      return content.includes("supabaseUrl")
        ? true
        : "Supabase URL not configured";
    },
  });

  tests.push({
    name: "Supabase key configuration",
    test: () => {
      const filePath = "src/lib/supabase.ts";
      if (!fs.existsSync(filePath)) return "File not found";
      const content = fs.readFileSync(filePath, "utf8");
      return content.includes("supabaseAnonKey")
        ? true
        : "Supabase key not configured";
    },
  });

  // Test database types
  tests.push({
    name: "User interface defined",
    test: () => {
      const filePath = "src/lib/supabase.ts";
      if (!fs.existsSync(filePath)) return "File not found";
      const content = fs.readFileSync(filePath, "utf8");
      return content.includes("interface User")
        ? true
        : "User interface not defined";
    },
  });

  tests.push({
    name: "Game interface defined",
    test: () => {
      const filePath = "src/lib/supabase.ts";
      if (!fs.existsSync(filePath)) return "File not found";
      const content = fs.readFileSync(filePath, "utf8");
      return content.includes("interface Game")
        ? true
        : "Game interface not defined";
    },
  });

  tests.push({
    name: "Pick interface defined",
    test: () => {
      const filePath = "src/lib/supabase.ts";
      if (!fs.existsSync(filePath)) return "File not found";
      const content = fs.readFileSync(filePath, "utf8");
      return content.includes("interface Pick")
        ? true
        : "Pick interface not defined";
    },
  });

  tests.push({
    name: "Award interface defined",
    test: () => {
      const filePath = "src/lib/supabase.ts";
      if (!fs.existsSync(filePath)) return "File not found";
      const content = fs.readFileSync(filePath, "utf8");
      return content.includes("interface Award")
        ? true
        : "Award interface not defined";
    },
  });

  tests.push({
    name: "Pick interface has is_lock",
    test: () => {
      const filePath = "src/lib/supabase.ts";
      if (!fs.existsSync(filePath)) return "File not found";
      const content = fs.readFileSync(filePath, "utf8");
      return content.includes("is_lock") ? true : "is_lock field not defined";
    },
  });

  tests.push({
    name: "Award interface defined",
    test: () => {
      const filePath = "src/lib/supabase.ts";
      if (!fs.existsSync(filePath)) return "File not found";
      const content = fs.readFileSync(filePath, "utf8");
      return content.includes("interface Award")
        ? true
        : "Award interface not defined";
    },
  });

  return tests;
}

module.exports = { testSupabaseLibrary };
