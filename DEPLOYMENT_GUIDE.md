# 🚀 Deployment Guide

## Overview

This guide walks you through deploying your secure NFL Pick'em app to Vercel.

## 📋 Pre-Deployment Checklist

Before deploying, make sure you have:

- [ ] ✅ Database setup complete (ran `CLEAN_DATABASE_SETUP.sql`)
- [ ] ✅ Environment variables configured
- [ ] ✅ Admin access working locally
- [ ] ✅ All security fixes implemented
- [ ] ✅ Code pushed to GitHub

## 🗄️ Database Setup (Supabase)

### **Step 1: Run Database Script**

1. Go to your Supabase dashboard
2. Click "SQL Editor"
3. Copy and paste the contents of `CLEAN_DATABASE_SETUP.sql`
4. Click "Run" to execute the script
5. Verify all tables and policies were created successfully

### **Step 2: Verify Admin Account**

Run this query to confirm your account is admin:

```sql
SELECT username, email, is_admin
FROM public.profiles
WHERE email = 'oreillyjadin24@gmail.com';
```

**Expected result:** `is_admin` should be `TRUE`

## 🌍 Environment Variables

### **Development (.env.local)**

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### **Production (Vercel)**

1. Go to Vercel dashboard
2. Select your project
3. Go to "Settings" → "Environment Variables"
4. Add all three variables with the same values

## 🚀 Deploy to Vercel

### **Step 1: Connect to GitHub**

1. Go to [vercel.com](https://vercel.com)
2. Sign in with your GitHub account
3. Click "New Project"
4. Import your repository

### **Step 2: Configure Project**

1. **Framework Preset:** Next.js
2. **Root Directory:** `./` (default)
3. **Build Command:** `npm run build` (default)
4. **Output Directory:** `.next` (default)

### **Step 3: Add Environment Variables**

1. In the "Environment Variables" section
2. Add each variable:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Click "Deploy"

### **Step 4: Wait for Deployment**

- Vercel will build and deploy your app
- This usually takes 2-5 minutes
- You'll get a URL like `https://your-app.vercel.app`

## ✅ Post-Deployment Testing

### **Test 1: Basic Functionality**

1. Visit your deployed URL
2. Try to sign up with a test account
3. Try to sign in
4. Check if dashboard loads

### **Test 2: Admin Access**

1. Sign in with `oreillyjadin24@gmail.com`
2. Try to access `/admin`
3. **Expected:** Should work normally
4. Try admin features (sync games, view users)

### **Test 3: Security**

1. Sign in with a non-admin account
2. Try to access `/admin`
3. **Expected:** Should redirect to dashboard
4. Try to access `/admin/picks`
5. **Expected:** Should redirect to dashboard

### **Test 4: Database Connection**

1. Make a pick in the dashboard
2. Check if it appears in your profile
3. Check if it appears in the leaderboard

## 🔧 Troubleshooting

### **Problem: "Invalid API key" error**

**Solution:** Check environment variables in Vercel

1. Go to Vercel dashboard → Settings → Environment Variables
2. Make sure all three variables are set
3. Make sure values are correct (no extra spaces)
4. Redeploy the project

### **Problem: Admin access not working**

**Solution:** Check database setup

1. Verify your account is admin in Supabase
2. Check if RLS policies are created
3. Check if service role key is correct

### **Problem: Database connection failed**

**Solution:** Check Supabase configuration

1. Verify Supabase URL and keys
2. Check if database is accessible
3. Check if RLS policies allow access

### **Problem: Build failed**

**Solution:** Check for errors

1. Look at the build logs in Vercel
2. Check for TypeScript errors
3. Make sure all files are committed to GitHub

## 📊 Monitoring

### **Vercel Analytics**

1. Go to Vercel dashboard
2. Click on "Analytics" tab
3. Monitor page views, performance, and errors

### **Supabase Monitoring**

1. Go to Supabase dashboard
2. Click on "Logs" tab
3. Monitor database queries and errors

### **Security Monitoring**

1. Check audit logs in Supabase
2. Monitor for unauthorized access attempts
3. Review admin actions regularly

## 🔄 Updates and Maintenance

### **Updating Your App**

1. Make changes locally
2. Test thoroughly
3. Push to GitHub
4. Vercel will automatically redeploy

### **Database Updates**

1. Make changes in Supabase SQL Editor
2. Test locally first
3. Update production database
4. Test on production

### **Security Updates**

1. Keep dependencies updated
2. Monitor for security vulnerabilities
3. Update environment variables if needed
4. Review access logs regularly

## 🎉 Success!

If everything is working correctly, you should have:

- ✅ A secure NFL Pick'em app deployed to Vercel
- ✅ Admin access protected by multiple security layers
- ✅ Database properly configured with RLS policies
- ✅ All features working on production

Your app is now live and secure! 🚀
