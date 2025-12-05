# Render Setup Guide - Required Steps

## Critical Issue: Missing DATABASE_URL

Your backend is currently **failing with 500 errors** because `DATABASE_URL` is not set in Render. The backend falls back to SQLite, which **does not work** on Render's ephemeral filesystem.

## Solution: Set Up Supabase PostgreSQL

### Step 1: Get Your Supabase Database URL

1. Go to your Supabase project: https://supabase.com/dashboard
2. Click on your project
3. Go to **Project Settings** → **Database**
4. Find the **Connection String** section
5. Copy the **URI** format (not the connection pooling format)
6. It looks like: `postgresql://postgres:[YOUR-PASSWORD]@[HOST]:5432/postgres`

### Step 2: Add DATABASE_URL to Render

1. Go to Render Dashboard: https://dashboard.render.com
2. Click on your **portfolio-backend** service
3. Go to **Environment** tab
4. Click **Add Environment Variable**
5. Add:
   ```
   Key: DATABASE_URL
   Value: postgresql://postgres:[YOUR-PASSWORD]@[HOST]:5432/postgres
   ```
6. **Important**: The backend will automatically convert this to the async format (`postgresql+asyncpg://...`)
7. Click **Save Changes**
8. Render will automatically redeploy

### Step 3: Verify Database Connection

After the redeploy completes (5-10 minutes):

1. Visit: `https://portfolio-backend-p2td.onrender.com/health`
2. You should see `"status": "ok"` with no issues
3. Try uploading a resume from the frontend
4. It should work!

---

## All Required Environment Variables Checklist

Go through each one and make sure they're set in **Render Dashboard → Backend Service → Environment**:

### ✅ Already Set (in render.yaml)
- ✅ `OPENAI_BASE_URL=https://api.groq.com/openai/v1`
- ✅ `MODEL_NAME=llama-3.1-8b-instant`
- ✅ `SUPABASE_RESUME_BUCKET=resumes`
- ✅ `SUPABASE_ARTIFACT_BUCKET=artifacts`
- ✅ `API_ALLOW_ORIGINS=https://portfolio-frontend-p2td.onrender.com`
- ✅ `LLM_DRY_RUN=0`

### ⚠️ Must Add Manually (sync: false in render.yaml)

#### 1. OPENAI_API_KEY (Required)
```
Key: OPENAI_API_KEY
Value: gsk_... (your Groq API key from https://console.groq.com/keys)
```

#### 2. DATABASE_URL (Required)
```
Key: DATABASE_URL  
Value: postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres
```
Get from: Supabase → Project Settings → Database → Connection String

#### 3. SUPABASE_URL (Required for file uploads)
```
Key: SUPABASE_URL
Value: https://[project-id].supabase.co
```
Get from: Supabase → Project Settings → API → Project URL

#### 4. SUPABASE_SERVICE_ROLE_KEY (Required for file uploads)
```
Key: SUPABASE_SERVICE_ROLE_KEY
Value: eyJ... (long JWT token)
```
Get from: Supabase → Project Settings → API → service_role key (click "Reveal" and copy)

⚠️ **Never commit these values to Git!** That's why they're set to `sync: false`.

---

## Why This Happens

The `render.yaml` declares these variables with `sync: false`, meaning:
- ✅ Good: Secrets don't get committed to Git
- ❌ Bad: You must manually add them in Render dashboard

Render reads `render.yaml` to know which variables to expect, but doesn't automatically create them.

---

## Testing After Setup

### 1. Check Health Endpoint
```bash
curl https://portfolio-backend-p2td.onrender.com/health | python3 -m json.tool
```

Should return:
```json
{
  "status": "ok",
  "issues": [],
  "warnings": []
}
```

If you see `"issues": ["DATABASE_URL not set"]` or other issues, that variable is missing.

### 2. Test Root Endpoint
```bash
curl https://portfolio-backend-p2td.onrender.com/ | python3 -m json.tool
```

Should show CORS configuration with your frontend URL in `cors_allowed_origins`.

### 3. Try Upload
Go to your frontend and upload a resume. Should work without 500 errors.

---

## Common Errors and Fixes

### Error: "OperationalError: (psycopg2.OperationalError) could not connect to server"
**Cause**: DATABASE_URL is incorrect or Supabase database is not accessible  
**Fix**: Double-check the connection string from Supabase

### Error: "Supabase upload failed"
**Cause**: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing/incorrect  
**Fix**: Add/update these variables in Render

### Error: "Authentication failed"  
**Cause**: OPENAI_API_KEY (Groq) is missing or invalid  
**Fix**: Get a new API key from https://console.groq.com/keys

### Error: Still getting 500 errors after adding DATABASE_URL
**Cause**: Database tables don't exist yet  
**Solution**: The backend auto-creates tables on startup. Try these steps:
1. Check backend logs in Render for migration errors
2. Run migrations manually if needed (see below)

---

## Running Database Migrations (If Needed)

If the backend can't auto-create tables:

1. Install Render CLI: `brew install render`
2. Log in: `render login`
3. Open shell on your backend service:
   ```bash
   render shell portfolio-backend
   ```
4. Run migrations:
   ```bash
   alembic upgrade head
   ```
5. Exit: `exit`

---

## Quick Start (TL;DR)

1. Get Groq API key: https://console.groq.com/keys
2. Get Supabase credentials: https://supabase.com/dashboard → Your Project → Settings
3. Add all 4 required variables to Render backend (OPENAI_API_KEY, DATABASE_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
4. Wait for autodeploy (~5-10 min)
5. Test: visit `/health` endpoint
6. Upload a resume!

**After this setup, everything should work perfectly!** 🚀
