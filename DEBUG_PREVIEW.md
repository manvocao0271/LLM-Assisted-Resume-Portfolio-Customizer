# Debug Preview Issue on Render

## Current Status
The preview endpoint returns **200 OK** but with **Content-Length: 0** (empty response).

## What to Check

### 1. Frontend Logs (Browser Console)
After clicking "Preview draft", check the console (F12 → Console):
- Should see: `Fetching preview from: ...`
- Should see: `Preview response status: 200`
- Should see: `Content-Type: ...`
- Should see: `Raw response text: ...` (this is the key - is it empty?)

### 2. Backend Logs (Render Dashboard)
Go to: **Render Dashboard → portfolio-backend → Logs**

Look for these log lines:
```
Preview request: slug=man-cao, portfolio_id=xxx
Portfolio found: id=xxx, has_content=True
Returning content with X keys
```

### 3. Possible Causes

#### A. Portfolio content is empty
- The portfolio was saved but the `content` field is null/empty
- **Fix**: Re-upload the resume and save the draft again

#### B. Portfolio ID mismatch
- The URL shows: `portfolio_id=5bc0722b8-d470-...` (notice the `b8` - might be typo?)
- Should be: `portfolio_id=5bc0722b-d470-...` (valid UUID format)
- **Fix**: Check what `meta.portfolioId` is in the frontend state

#### C. JSON serialization error
- FastAPI can't serialize the response to JSON
- **Fix**: Backend logs will show the error

#### D. Frontend not rebuilt
- Changes haven't been deployed to Render frontend
- **Fix**: Go to Render Dashboard → portfolio-frontend → Manual Deploy

## Quick Test

Try this URL directly in your browser (replace with your actual values):
```
https://portfolio-backend-p2td.onrender.com/api/portfolios/preview/man-cao?portfolio_id=<YOUR_PORTFOLIO_ID>
```

You should see JSON like:
```json
{
  "data": {
    "name": "Man Cao",
    "summary": "...",
    ...
  }
}
```

If you see `{}` or nothing, the portfolio content is empty.

## Immediate Actions

1. **Check Render backend logs** - This will tell us the real issue
2. **Try re-uploading** your resume to create a fresh portfolio
3. **Check the portfolio_id** in the URL - make sure it's a valid UUID
4. **Manual deploy frontend** if needed to get latest changes
