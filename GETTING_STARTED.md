# 👋 Getting Started - Welcome!

Hey! Welcome to the NFL Picks App project. This guide will get you up and running in about 10 minutes.

## 🎯 Quick Setup (5 Steps)

### 1. Clone and Install

```bash
# You probably already have the code, but if not:
git clone <repository-url>
cd my-supabase-app

# Install dependencies (takes 1-2 minutes)
npm install
```

### 2. Get Environment Variables

Ask your teammate for the `.env.local` file, or create one with these values:

```env
NEXT_PUBLIC_SUPABASE_URL=<ask teammate>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<ask teammate>
SUPABASE_SERVICE_ROLE_KEY=<ask teammate>
CRON_SECRET=<ask teammate>
```

Save this in the root directory as `.env.local`

### 3. Run the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. You should see the landing page!

### 4. Test Login

Try logging in with a test account (ask teammate for credentials) or create a new account.

### 5. Explore the Code

Open the project in your code editor and check out:

- `src/app/dashboard/page.tsx` - The main dashboard
- `src/controllers/` - Business logic
- `src/models/` - Database operations

## 📚 What to Read First

**New to the project?** Start here:

1. **README.md** - Overview of what this app does
2. **PROJECT_GUIDE.md** - Detailed guide to the codebase
3. **ARCHITECTURE.md** - Technical deep dive (optional, read later)

## 🗺️ Project Tour

### The Main Features

- **Dashboard** (`/dashboard`) - Users make their picks here
- **Leaderboard** (`/leaderboard`) - See who's winning
- **Profile** (`/profile`) - User's pick history

### The Codebase Structure

```
src/
├── app/           Pages you see in the browser
├── controllers/   Business logic (validation, rules)
├── models/        Database operations
├── services/      Utilities (scoring, game sync)
└── components/    Reusable UI pieces
```

**Rule of thumb:**

- Want to change how something looks? → `app/` or `components/`
- Want to change business logic? → `controllers/`
- Want to change database operations? → `models/`

## 💡 Common Tasks

### Making Your First Change

Let's add a console.log to see when someone makes a pick:

1. Open `src/controllers/PickController.ts`
2. Find the `createPick` method (around line 8)
3. Add this line at the start:
   ```typescript
   console.log("🎯 User making pick!", { userId, gameId, team });
   ```
4. Save the file
5. Go to the dashboard and make a pick
6. Check your terminal - you should see the log!

### Running Tests

```bash
npm test
```

### Checking for Errors

```bash
npm run build
```

If it builds successfully, your code is good!

### Fixing Linting Issues

```bash
npm run lint
```

## 🐛 Common Issues

**"Cannot find module '@/something'"**

- The `@/` means "start from src/"
- Make sure the file exists
- Restart your dev server

**"Database error" or "Supabase error"**

- Check your `.env.local` file is correct
- Ask teammate if database is running

**Page won't load**

- Check the terminal for errors
- Try `npm run dev` again
- Check if port 3000 is already in use

## 🤝 Working Together

### Before You Start Working

```bash
git pull origin main  # Get latest changes
npm install           # Update dependencies
```

### Making Changes

1. Create a new branch: `git checkout -b feature/your-feature-name`
2. Make your changes
3. Test locally: `npm run dev`
4. Commit: `git commit -m "Add feature description"`
5. Push: `git push origin feature/your-feature-name`
6. Create a Pull Request on GitHub

### Code Style

- Use TypeScript types (don't use `any`)
- Add comments for complex logic
- Use meaningful variable names
- Format with Prettier (it should auto-format on save)

## 📖 Learning Resources

**New to Next.js?**

- [Next.js Tutorial](https://nextjs.org/learn) - Official tutorial (1 hour)

**New to TypeScript?**

- [TypeScript in 5 Minutes](https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes.html)

**New to React?**

- [React Quick Start](https://react.dev/learn) - Official docs

## 💬 Questions?

**Stuck on something?**

1. Check the documentation files (PROJECT_GUIDE.md, etc.)
2. Look at similar code in the project
3. Ask your teammate!

**Found a bug?**

- Note what you were doing when it happened
- Check the browser console for errors
- Check the terminal for server errors
- Share the error message with your teammate

## 🎉 You're Ready!

That's it! You're all set up. Start by exploring the code, make a small change to see how it works, and don't hesitate to ask questions.

The best way to learn is to dive in and experiment. Don't worry about breaking things - that's what version control is for! 😊

**Next steps:**

1. ✅ Run `npm run dev` and explore the app
2. ✅ Read through `PROJECT_GUIDE.md`
3. ✅ Pick a small task or feature to work on
4. ✅ Ask your teammate for a code walkthrough

Happy coding! 🚀
