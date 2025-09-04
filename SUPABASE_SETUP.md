# Supabase Setup Instructions

## 1. Create Environment File

Create a `.env.local` file in your project root with the following content:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://whvxcoganvbrriqpynre.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indodnhjb2dhbnZicnJpcXB5bnJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4NTUzMDUsImV4cCI6MjA3MjQzMTMwNX0.ACLWT5e3OmsgoWD6mWu33EmhMTznW2IQI9qKYAurlh8
```

## 2. Set Up Database Schema

Go to your Supabase dashboard at https://supabase.com/dashboard/project/whvxcoganvbrriqpynre

1. Navigate to the SQL Editor
2. Copy and paste the contents of `supabase-schema-simple.sql`
3. Run the SQL to create the database tables and policies

**Note**: If you get permission errors, use the simplified schema first, then we'll set up the automatic profile creation separately.

## 3. Test the Connection

Run the development server:

```bash
npm run dev
```

The app should now connect to your Supabase database!

## 4. Verify Setup

1. Open http://localhost:3000
2. Try to register a new user
3. Check your Supabase dashboard to see if the user appears in the `auth.users` table
4. Check if a profile was created in the `profiles` table

## 5. Sync Mock Data

1. Go to http://localhost:3000/admin
2. Click "Sync Week 1 Games" to load the mock NFL schedule
3. Check your Supabase dashboard to see the games in the `games` table

## Troubleshooting

- Make sure the `.env.local` file is in the project root
- Restart the development server after creating the environment file
- Check the browser console for any connection errors
- Verify the API key is correct in your Supabase dashboard
