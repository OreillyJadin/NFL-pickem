# NFL Pick'em App Test Suite

This directory contains comprehensive tests for the NFL Pick'em application to ensure all functionality is working correctly.

## Test Structure

```
tests/
├── components/          # Component-specific tests
│   └── auth.test.js    # Authentication component tests
├── pages/              # Page-specific tests
│   ├── dashboard.test.js    # Dashboard page tests
│   ├── leaderboard.test.js  # Leaderboard page tests
│   └── profile.test.js      # Profile page tests
├── lib/                # Library tests
│   └── supabase.test.js     # Supabase integration tests
├── integration/        # Integration tests
│   └── full-app.test.js     # Full app integration tests
├── run-tests.js        # Main test runner
├── test-runner.js      # Alternative test runner
└── README.md           # This file
```

## Running Tests

### Quick Test

```bash
node test-app.js
```

### Detailed Test

```bash
node tests/run-tests.js
```

### Individual Test Categories

```bash
# Test authentication components
node -e "const { testAuthComponents } = require('./tests/components/auth.test.js'); console.log(testAuthComponents());"

# Test dashboard page
node -e "const { testDashboardPage } = require('./tests/pages/dashboard.test.js'); console.log(testDashboardPage());"

# Test leaderboard page
node -e "const { testLeaderboardPage } = require('./tests/pages/leaderboard.test.js'); console.log(testLeaderboardPage());"

# Test profile page
node -e "const { testProfilePage } = require('./tests/pages/profile.test.js'); console.log(testProfilePage());"

# Test Supabase library
node -e "const { testSupabaseLibrary } = require('./tests/lib/supabase.test.js'); console.log(testSupabaseLibrary());"

# Test full app integration
node -e "const { testFullAppIntegration } = require('./tests/integration/full-app.test.js'); console.log(testFullAppIntegration());"
```

## Test Categories

### 🔐 Authentication Components

- LoginForm component structure
- RegisterForm component structure
- AuthContext functionality
- Supabase integration

### 📊 Dashboard Page

- Game loading functionality
- Pick making system
- Lock picks functionality
- Week/season selection
- Team colors integration

### 🏆 Leaderboard Page

- Data loading and display
- Season and weekly views
- Points calculation
- Lock scoring system
- Win percentage calculation
- Ranking and medals

### 👤 Profile Page

- User statistics
- Pick history
- Lock records
- Awards system
- Trophy wall

### 🗄️ Supabase Library

- Database configuration
- Table type definitions
- Client setup
- Environment variables

### 🔗 Full App Integration

- Complete app structure
- Navigation integration
- Admin functionality
- Configuration files
- Environment setup

## What the Tests Check

### File Existence

- All required components exist
- All pages are present
- Configuration files are in place
- Database schema files exist

### Code Quality

- TypeScript interfaces are defined
- React hooks are used properly
- Supabase integration is correct
- Authentication flow is complete

### Feature Completeness

- All major features are implemented
- Lock picks system is working
- Scoring calculations are present
- Awards system is integrated
- Leaderboard functionality is complete

### Integration

- Components work together
- Navigation is complete
- Admin functionality exists
- Database schema is updated

## Test Results

The tests will show:

- ✅ **Passed**: Feature is working correctly
- ❌ **Failed**: Feature needs attention
- ℹ️ **Info**: General information
- ⚠️ **Warning**: Non-critical issues

## Fixing Failed Tests

If tests fail, check:

1. **File missing**: Create the required file
2. **Content missing**: Add the required functionality
3. **Configuration issue**: Update configuration files
4. **Environment issue**: Set up environment variables

## Before Deployment

Make sure all tests pass:

```bash
node test-app.js
```

If all tests pass, your app is ready for deployment! 🚀

## Adding New Tests

To add new tests:

1. Create a new test file in the appropriate category
2. Follow the existing pattern
3. Export the test function
4. Add it to the main test runner

Example:

```javascript
function testNewFeature() {
  const tests = [];

  tests.push({
    name: "New feature exists",
    test: () => {
      // Test logic here
      return true; // or error message
    },
  });

  return tests;
}

module.exports = { testNewFeature };
```
