# 🌍 Environment Setup Guide

## Overview

This guide explains how to set up your environment variables for the NFL Pick'em app, including the new security features.

## 📋 Required Environment Variables

### **For Development (.env.local)**

Create a file called `.env.local` in your project root with these variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# NEW: Server-side Admin Verification
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### **What Each Variable Does:**

#### **NEXT_PUBLIC_SUPABASE_URL**

- **Purpose:** Tells your app where your Supabase database is located
- **Example:** `https://whvxcoganvbrriqpynre.supabase.co`
- **Used by:** Client-side operations (user login, data fetching)
- **Security:** Public (safe to expose in browser)

#### **NEXT_PUBLIC_SUPABASE_ANON_KEY**

- **Purpose:** Allows your app to connect to Supabase with limited permissions
- **Example:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Used by:** Client-side operations (user login, data fetching)
- **Security:** Public (safe to expose in browser)

#### **SUPABASE_SERVICE_ROLE_KEY** ⚠️ **NEW & IMPORTANT**

- **Purpose:** Allows server-side operations with full database access
- **Example:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Used by:** Admin verification, middleware, API routes
- **Security:** PRIVATE (never expose in browser)

## 🔑 How to Get Your Keys

### **Step 1: Go to Supabase Dashboard**

1. Open your browser and go to [supabase.com](https://supabase.com)
2. Sign in to your account
3. Select your project

### **Step 2: Navigate to API Settings**

1. Click on "Settings" in the left sidebar
2. Click on "API" in the settings menu
3. You'll see a page with your project keys

### **Step 3: Copy Your Keys**

1. **Project URL** → Copy this to `NEXT_PUBLIC_SUPABASE_URL`
2. **anon public** → Copy this to `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. **service_role** → Copy this to `SUPABASE_SERVICE_ROLE_KEY`

### **Step 4: Create .env.local File**

1. In your project root, create a file called `.env.local`
2. Paste the keys in the format shown above
3. Save the file

## 🚨 Security Warnings

### **NEVER Do These:**

- ❌ Don't commit `.env.local` to GitHub
- ❌ Don't share your service role key
- ❌ Don't put service role key in client-side code
- ❌ Don't expose service role key in browser

### **ALWAYS Do These:**

- ✅ Add `.env.local` to your `.gitignore` file
- ✅ Keep service role key private
- ✅ Use different keys for development and production
- ✅ Rotate keys regularly

## 🔧 Troubleshooting

### **Problem: "Invalid API key" error**

**Solution:** Check if you copied the keys correctly

- Make sure there are no extra spaces
- Make sure the keys are complete
- Try copying them again from Supabase

### **Problem: Admin access not working**

**Solution:** Check if you have the service role key

- Make sure `SUPABASE_SERVICE_ROLE_KEY` is set
- Make sure it's the `service_role` key, not `anon`
- Restart your development server after adding it

### **Problem: "Environment variable not found" error**

**Solution:** Check your file location and format

- Make sure `.env.local` is in the project root
- Make sure there are no spaces around the `=` sign
- Make sure there are no quotes around the values

## 📁 File Structure

Your project should look like this:

```
my-supabase-app/
├── .env.local                 # ← Your environment variables
├── .gitignore                 # ← Should include .env.local
├── src/
│   ├── middleware.ts          # ← Uses service role key
│   ├── app/
│   │   └── api/
│   │       └── admin/
│   │           └── check/
│   │               └── route.ts  # ← Uses service role key
│   └── lib/
│       └── admin.ts           # ← Uses anon key
└── package.json
```

## 🚀 For Production (Vercel)

### **Step 1: Add Environment Variables in Vercel**

1. Go to your Vercel dashboard
2. Select your project
3. Go to "Settings" → "Environment Variables"
4. Add all three variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

### **Step 2: Deploy**

1. Push your code to GitHub
2. Vercel will automatically deploy
3. Test your admin access on the production URL

## ✅ Verification Checklist

After setting up your environment variables:

- [ ] `.env.local` file exists in project root
- [ ] All three environment variables are set
- [ ] Service role key is the correct one (not anon key)
- [ ] `.env.local` is in `.gitignore`
- [ ] Development server starts without errors
- [ ] Admin access works at `/admin`
- [ ] Non-admin users can't access `/admin`

## 🆘 Need Help?

If you're still having issues:

1. **Check the console** for error messages
2. **Verify your keys** in Supabase dashboard
3. **Restart your development server** after making changes
4. **Check the file location** of `.env.local`
5. **Make sure there are no typos** in variable names

Your environment is now set up securely! 🎉
