# Deployment Guide for Render

## Critical Setup Steps

### 1. Deploy Backend First
1. Push your code to GitHub
2. In Render dashboard, create a new **Web Service** from your repository
3. Configure:
   - **Name**: `portfolio-backend` (or your choice)
   - **Environment**: Python
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app:app --host 0.0.0.0 --port $PORT`
   - **Plan**: Free

4. Set environment variables in Render dashboard:
   ```
   OPENAI_API_KEY=<your-groq-api-key>
   OPENAI_BASE_URL=https://api.groq.com/openai/v1
   MODEL_NAME=llama-3.1-8b-instant
   DATABASE_URL=<your-postgres-url>
   SUPABASE_URL=<your-supabase-url>
   SUPABASE_SERVICE_ROLE_KEY=<your-supabase-key>
   SUPABASE_RESUME_BUCKET=resumes
   SUPABASE_ARTIFACT_BUCKET=artifacts
   LLM_DRY_RUN=0
   
   # LEAVE THIS EMPTY FOR NOW - we'll set it after frontend deploys
   API_ALLOW_ORIGINS=
   ```

5. Wait for deployment to complete
6. **Copy the backend URL** (e.g., `https://portfolio-backend-xmzb.onrender.com`)

### 2. Deploy Frontend
1. In Render dashboard, create a new **Static Site** from your repository
2. Configure:
   - **Name**: `portfolio-frontend` (or your choice)
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
   - **Plan**: Free

3. Set environment variables in Render dashboard:
   ```
   # USE THE BACKEND URL FROM STEP 1 ABOVE
   VITE_API_BASE_URL=https://portfolio-backend-xmzb.onrender.com
   ```

4. Wait for deployment to complete
5. **Copy the frontend URL** (e.g., `https://portfolio-frontend-9l3a.onrender.com`)

### 3. Update Backend CORS Settings
1. Go back to your **backend service** in Render
2. Update the `API_ALLOW_ORIGINS` environment variable:
   ```
   # USE THE FRONTEND URL FROM STEP 2 ABOVE
   API_ALLOW_ORIGINS=https://portfolio-frontend-9l3a.onrender.com
   ```

3. Save and **manually redeploy** the backend service

### 4. Verify Deployment
1. Visit your frontend URL
2. Try uploading a resume
3. Check browser console for errors
4. Verify the CORS errors are gone

## Common Issues

### CORS Error: "Access to fetch has been blocked by CORS policy"
**Cause**: Backend doesn't recognize frontend origin

**Solution**:
- Ensure `API_ALLOW_ORIGINS` in backend includes the exact frontend URL
- No trailing slashes: ✅ `https://example.com` ❌ `https://example.com/`
- Must use `https://` in production
- Redeploy backend after changing this variable

### 500 Internal Server Error on Parse
**Cause**: Backend missing required environment variables

**Solution**:
- Verify all environment variables are set in backend:
  - `OPENAI_API_KEY` (Groq API key)
  - `DATABASE_URL` (Postgres connection string)
  - `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- Check backend logs in Render dashboard for specific errors

### Resume Upload Fails Silently
**Cause**: Frontend can't reach backend

**Solution**:
- Verify `VITE_API_BASE_URL` is set correctly in frontend
- Must match backend URL exactly
- Rebuild frontend after changing this variable

### Database Connection Errors
**Cause**: Invalid or missing `DATABASE_URL`

**Solution**:
- Use PostgreSQL addon in Render (recommended)
- Format: `postgresql+asyncpg://user:password@host:5432/dbname`
- Ensure database exists and is accessible

## Multiple Origins (Optional)

If you need to allow multiple frontend origins (e.g., staging + production):

```
API_ALLOW_ORIGINS=https://production.example.com,https://staging.example.com
```

**Important**: No spaces after commas!

## Testing Locally with Production Backend

To test your local frontend against the deployed backend:

1. Create `frontend/.env.local`:
   ```
   VITE_API_BASE_URL=https://your-backend.onrender.com
   ```

2. Update backend `API_ALLOW_ORIGINS` to include:
   ```
   https://your-frontend.onrender.com,http://localhost:5173
   ```

3. Run frontend: `cd frontend && npm run dev`

## Render Free Tier Limitations

- **Cold starts**: Services spin down after 15 minutes of inactivity
- **First request**: May take 30-60 seconds to wake up
- **Build time**: 15-20 minutes for deployments

To reduce cold starts, use a service like [UptimeRobot](https://uptimerobot.com/) to ping your backend every 14 minutes.

## Troubleshooting Checklist

- [ ] Backend deployed successfully
- [ ] Frontend deployed successfully
- [ ] `VITE_API_BASE_URL` set in frontend (exact backend URL)
- [ ] `API_ALLOW_ORIGINS` set in backend (exact frontend URL)
- [ ] Backend redeployed after setting `API_ALLOW_ORIGINS`
- [ ] Frontend rebuilt after setting `VITE_API_BASE_URL`
- [ ] All database and API keys configured
- [ ] Browser console shows no CORS errors
- [ ] Resume upload completes successfully

## Getting URLs

### Backend URL
In Render dashboard → Backend service → Copy the URL at the top

### Frontend URL  
In Render dashboard → Frontend static site → Copy the URL at the top

Both URLs are also visible in the deployment logs.
