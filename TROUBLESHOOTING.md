# Troubleshooting CORS and 500 Errors

## Current Issue Diagnosis

Based on your screenshots, you're experiencing:
1. **CORS errors** - blocking requests from frontend to backend
2. **500 Internal Server Errors** - backend is crashing when trying to process requests
3. **404 on root** - expected, backend has no `/` endpoint (now fixed)

## Step-by-Step Fix

### 1. Verify Environment Variables in Render

Go to your **backend service** in Render dashboard and verify these are ALL set:

#### Required (Backend will crash without these):
```
OPENAI_API_KEY=gsk_...your-groq-key...
DATABASE_URL=postgresql+asyncpg://...
```

#### Required for CORS:
```
API_ALLOW_ORIGINS=https://portfolio-frontend-9t3a.onrender.com
```
⚠️ **CRITICAL**: Make sure this EXACTLY matches your frontend URL (check for typos: `9t3a` not `9l3a`)

#### Recommended (without these, file uploads fail):
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJh...
SUPABASE_RESUME_BUCKET=resumes
SUPABASE_ARTIFACT_BUCKET=artifacts
```

#### Optional (already set in render.yaml):
```
OPENAI_BASE_URL=https://api.groq.com/openai/v1
MODEL_NAME=llama-3.1-8b-instant
LLM_DRY_RUN=0
```

### 2. Verify Frontend Environment Variables

Go to your **frontend static site** in Render dashboard:

```
VITE_API_BASE_URL=https://portfolio-backend-xmzb.onrender.com
```

⚠️ **No trailing slash!**

### 3. Test Backend Health

After setting environment variables and redeploying backend, visit:
```
https://portfolio-backend-xmzb.onrender.com/health
```

You should see:
```json
{
  "status": "ok",
  "issues": [],
  "warnings": [],
  "model": "llama-3.1-8b-instant",
  "base_url": "https://api.groq.com/openai/v1",
  "dry_run": false
}
```

If you see `"issues": ["OPENAI_API_KEY not set"]`, go back and set that variable.

### 4. Test Root Endpoint

Visit:
```
https://portfolio-backend-xmzb.onrender.com/
```

You should see:
```json
{
  "status": "ok",
  "message": "Resume Portfolio Builder API",
  "cors_allowed_origins": [
    "http://127.0.0.1:5173",
    "http://localhost:5173",
    "https://portfolio-frontend-9t3a.onrender.com"
  ],
  "endpoints": [...]
}
```

⚠️ **Check `cors_allowed_origins`** - your frontend URL MUST be in this list!

### 5. Check Backend Logs

In Render dashboard → Backend service → Logs tab

Look for errors like:
- `KeyError: 'OPENAI_API_KEY'` → Missing API key
- `sqlalchemy.exc.OperationalError` → Database connection failed
- `ImportError` → Missing Python package

### 6. Rebuild Frontend

After backend is healthy, rebuild your frontend:
- Render dashboard → Frontend service → Manual Deploy → Deploy latest commit

## Common Issues and Solutions

### Issue: CORS Error Even With Correct API_ALLOW_ORIGINS

**Symptom**: Console shows `Access to fetch at 'https://portfolio-backend-xmzb.onrender.com/api/resumes' has been blocked by CORS policy`

**Causes**:
1. Typo in frontend URL (e.g., `9l3a` vs `9t3a`, extra `/` at end)
2. Backend not redeployed after changing `API_ALLOW_ORIGINS`
3. Browser caching old CORS headers

**Solutions**:
1. Double-check the URL in `API_ALLOW_ORIGINS` matches frontend URL exactly
2. Manually trigger a redeploy of backend in Render
3. Hard refresh browser (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)
4. Try in incognito mode

### Issue: 500 Internal Server Error

**Symptom**: Requests reach backend but return 500

**Causes**:
1. Missing `OPENAI_API_KEY` or `DATABASE_URL`
2. Invalid Supabase credentials
3. Database not initialized

**Solutions**:
1. Check `/health` endpoint for issues list
2. Review backend logs in Render dashboard
3. Ensure database exists and is accessible
4. Run database migrations (Render runs these automatically on deploy)

### Issue: Backend Takes 30+ Seconds to Respond

**Symptom**: First request is very slow, then faster

**Cause**: Render free tier spins down services after 15 minutes of inactivity

**Solution**: This is expected on free tier. Options:
1. Accept the cold start delay
2. Upgrade to paid tier for always-on service
3. Use a ping service (UptimeRobot) to keep it warm

### Issue: Frontend Shows Old Backend URL

**Symptom**: Frontend still tries to connect to localhost or wrong URL

**Causes**:
1. `VITE_API_BASE_URL` not set in Render
2. Frontend not rebuilt after setting variable
3. Browser caching old JavaScript bundle

**Solutions**:
1. Set `VITE_API_BASE_URL` in Render frontend settings
2. Trigger manual redeploy of frontend
3. Hard refresh browser or try incognito mode

## Quick Verification Commands

### Test Backend from Command Line

```bash
# Test health
curl https://portfolio-backend-xmzb.onrender.com/health

# Test root (should show CORS config)
curl https://portfolio-backend-xmzb.onrender.com/

# Test CORS preflight
curl -X OPTIONS https://portfolio-backend-xmzb.onrender.com/api/resumes \
  -H "Origin: https://portfolio-frontend-9t3a.onrender.com" \
  -H "Access-Control-Request-Method: POST" \
  -v
```

Look for header in response: `Access-Control-Allow-Origin: https://portfolio-frontend-9t3a.onrender.com`

### Check Frontend API Configuration

Open browser console on your frontend and run:
```javascript
console.log(import.meta.env.VITE_API_BASE_URL)
```

Should print: `https://portfolio-backend-xmzb.onrender.com`

## Still Having Issues?

1. **Check backend logs** - Most issues show clear error messages in logs
2. **Verify all environment variables** - Use the `/health` endpoint
3. **Test endpoints individually** - Use curl or Postman to isolate issues
4. **Check browser console** - Look for detailed error messages
5. **Try incognito mode** - Rules out caching issues

## URL Checklist

Current URLs from your screenshots:
- ✅ Frontend: `https://portfolio-frontend-9t3a.onrender.com`
- ✅ Backend: `https://portfolio-backend-xmzb.onrender.com`

These should be set in:
- ✅ Backend `API_ALLOW_ORIGINS`: `https://portfolio-frontend-9t3a.onrender.com`
- ✅ Frontend `VITE_API_BASE_URL`: `https://portfolio-backend-xmzb.onrender.com`
