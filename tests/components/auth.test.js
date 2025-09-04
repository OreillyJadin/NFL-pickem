/**
 * Authentication Component Tests
 * Tests for login, register, and auth context functionality
 */

const fs = require("fs");
const path = require("path");

function testAuthComponents() {
  console.log("\n🔐 Testing Authentication Components...");

  const tests = [];

  // Test LoginForm component
  tests.push({
    name: "LoginForm component exists",
    test: () => {
      const filePath = "src/components/auth/LoginForm.tsx";
      return fs.existsSync(filePath) ? true : `File not found: ${filePath}`;
    },
  });

  tests.push({
    name: "LoginForm has email input",
    test: () => {
      const filePath = "src/components/auth/LoginForm.tsx";
      if (!fs.existsSync(filePath)) return "File not found";
      const content = fs.readFileSync(filePath, "utf8");
      return content.includes('type="email"') ? true : "Email input not found";
    },
  });

  tests.push({
    name: "LoginForm has password input",
    test: () => {
      const filePath = "src/components/auth/LoginForm.tsx";
      if (!fs.existsSync(filePath)) return "File not found";
      const content = fs.readFileSync(filePath, "utf8");
      return content.includes('type="password"')
        ? true
        : "Password input not found";
    },
  });

  // Test RegisterForm component
  tests.push({
    name: "RegisterForm component exists",
    test: () => {
      const filePath = "src/components/auth/RegisterForm.tsx";
      return fs.existsSync(filePath) ? true : `File not found: ${filePath}`;
    },
  });

  tests.push({
    name: "RegisterForm has username input",
    test: () => {
      const filePath = "src/components/auth/RegisterForm.tsx";
      if (!fs.existsSync(filePath)) return "File not found";
      const content = fs.readFileSync(filePath, "utf8");
      return content.includes("username") ? true : "Username input not found";
    },
  });

  // Test AuthContext
  tests.push({
    name: "AuthContext exists",
    test: () => {
      const filePath = "src/contexts/AuthContext.tsx";
      return fs.existsSync(filePath) ? true : `File not found: ${filePath}`;
    },
  });

  tests.push({
    name: "AuthContext has signUp method",
    test: () => {
      const filePath = "src/contexts/AuthContext.tsx";
      if (!fs.existsSync(filePath)) return "File not found";
      const content = fs.readFileSync(filePath, "utf8");
      return content.includes("signUp") ? true : "signUp method not found";
    },
  });

  tests.push({
    name: "AuthContext has signIn method",
    test: () => {
      const filePath = "src/contexts/AuthContext.tsx";
      if (!fs.existsSync(filePath)) return "File not found";
      const content = fs.readFileSync(filePath, "utf8");
      return content.includes("signIn") ? true : "signIn method not found";
    },
  });

  tests.push({
    name: "AuthContext has signOut method",
    test: () => {
      const filePath = "src/contexts/AuthContext.tsx";
      if (!fs.existsSync(filePath)) return "File not found";
      const content = fs.readFileSync(filePath, "utf8");
      return content.includes("signOut") ? true : "signOut method not found";
    },
  });

  tests.push({
    name: "AuthContext uses Supabase",
    test: () => {
      const filePath = "src/contexts/AuthContext.tsx";
      if (!fs.existsSync(filePath)) return "File not found";
      const content = fs.readFileSync(filePath, "utf8");
      return content.includes("supabase")
        ? true
        : "Supabase integration not found";
    },
  });

  return tests;
}

module.exports = { testAuthComponents };
