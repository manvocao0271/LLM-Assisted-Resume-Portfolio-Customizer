# Fix Preview Draft on Render

## The Problem

Preview draft works on localhost but fails on Render because:

1. **Frontend is static** - No proxy server, must make direct API calls
2. **API URL must be baked into the build** - `VITE_API_BASE_URL` is set at build time, not runtime
3. **CORS must be configured** - Backend must allow frontend domain

## Quick Fix - Verify These Settings

### Step 1: Check Frontend Environment Variable

In **Render Dashboard → portfolio-frontend → Environment**:

```
VITE_API_BASE_URL=https://portfolio-backend-p2td.onrender.com
```

**Important**: This MUST be set BEFORE building. If you change it, you must **manually redeploy** the frontend.

### Step 2: Check Backend CORS Configuration

In **Render Dashboard → portfolio-backend → Environment**:

```
API_ALLOW_ORIGINS=https://portfolio-frontend-p2td.onrender.com
```

This should already be set in your `render.yaml`, but verify it's there.

### Step 3: Force Rebuild Frontend

1. Go to **Render Dashboard → portfolio-frontend**
2. Click **Manual Deploy** → **Deploy latest commit**
3. This ensures `VITE_API_BASE_URL` is baked into the bundle

### Step 4: Test the API Directly

Visit: `https://portfolio-backend-p2td.onrender.com/health`

You should see:
```json
{
  "status": "ok",
  "timestamp": "2025-12-05T...",
  "database": "connected"
}
```

If you see errors, the backend has issues (likely DATABASE_URL not set).

## Debugging in Production

### Check Browser Console

1. Open your deployed frontend: `https://portfolio-frontend-p2td.onrender.com`
2. Upload a resume and click "Preview draft"
3. Open browser DevTools (F12) → Console tab
4. Look for errors like:
   - `CORS error` → Backend CORS not configured
   - `404 Not Found` → API URL wrong or backend down
   - `Failed to fetch` → Backend not responding

### Check Network Tab

1. Open DevTools → Network tab
2. Click "Preview draft"
3. Look for the API request to `/api/portfolios/preview/...`
4. Check:
   - **Request URL**: Should be `https://portfolio-backend-p2td.onrender.com/api/portfolios/preview/...`
   - **Status**: Should be `200 OK`
   - **Response**: Should have `data` object

### Common Issues

**Issue**: Request goes to `https://portfolio-frontend-p2td.onrender.com/api/...` (frontend URL)
- **Cause**: `VITE_API_BASE_URL` not set or frontend not rebuilt
- **Fix**: Set env var and manually redeploy frontend

**Issue**: `CORS policy: No 'Access-Control-Allow-Origin' header`
- **Cause**: Backend doesn't allow frontend domain
- **Fix**: Check `API_ALLOW_ORIGINS` includes frontend URL

**Issue**: `404 Not Found` on preview endpoint
- **Cause**: Slug or portfolio_id is wrong/missing
- **Fix**: Check URL has both slug and `?portfolio_id=...` query param

## If Still Failing

1. **Check backend logs**:
   - Go to **Render Dashboard → portfolio-backend → Logs**
   - Look for errors when you try to preview
   
2. **Verify the slug was saved**:
   - The slug should be auto-generated when you click "Preview draft"
   - Check the browser console for: `Opening preview: ...` log
   
3. **Test with a published portfolio**:
   - Instead of "Preview draft", set status to "Published" and visibility to "Unlisted"
   - Visit the public URL to see if that works

## Environment Variables Summary

### Backend (`portfolio-backend`)
```
OPENAI_API_KEY=<your-key>
OPENAI_BASE_URL=https://api.groq.com/openai/v1
MODEL_NAME=llama-3.1-8b-instant
DATABASE_URL=postgresql://... (from Supabase)
API_ALLOW_ORIGINS=https://portfolio-frontend-p2td.onrender.com
SUPABASE_URL=<your-supabase-url>
SUPABASE_SERVICE_ROLE_KEY=<your-key>
SUPABASE_RESUME_BUCKET=resumes
SUPABASE_ARTIFACT_BUCKET=artifacts
LLM_DRY_RUN=0
```

### Frontend (`portfolio-frontend`)
```
VITE_API_BASE_URL=https://portfolio-backend-p2td.onrender.com
```

Remember: **Frontend env vars are baked in at build time!** You must redeploy after changing them.
