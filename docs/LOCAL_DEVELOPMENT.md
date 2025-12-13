# Local Development Guide

This guide provides detailed instructions for setting up and running the LLM-Assisted Resume Portfolio Customizer locally.

---

## Prerequisites

- **Python 3.12+** (for backend)
- **Node.js 18+** (for frontend)
- **Git** (for version control)
- **OpenAI-compatible API key** (Groq recommended for free tier)

---

## Initial Setup

### 1. Clone the Repository

```bash
git clone https://github.com/manvocao0271/LLM-Assisted-Resume-Portfolio-Customizer.git
cd ResumeParser
```

### 2. Backend Setup

#### Create Virtual Environment

```bash
# Create and activate virtual environment
python -m venv .venv

# Activate (macOS/Linux)
source .venv/bin/activate

# Activate (Windows)
.venv\Scripts\activate
```

#### Install Python Dependencies

```bash
pip install -r requirements.txt
```

#### Configure Environment Variables

```bash
# Copy the example environment file
cp .env.example .env
```

Edit `.env` and configure:

```bash
# Required: OpenAI-compatible API key
OPENAI_API_KEY=your_api_key_here

# Recommended for free tier: Groq settings
OPENAI_BASE_URL=https://api.groq.com/openai/v1
MODEL_NAME=llama-3.1-8b-instant

# Optional: Database (defaults to SQLite if not set)
# DATABASE_URL=postgresql+asyncpg://user:pass@localhost/dbname

# Optional: Supabase Storage
# SUPABASE_URL=https://your-project.supabase.co
# SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
# SUPABASE_RESUME_BUCKET=resumes
# SUPABASE_ARTIFACT_BUCKET=artifacts

# Development settings
LLM_DRY_RUN=1  # Set to 0 to use real LLM API calls (requires valid API key)
```

#### Run Database Migrations

```bash
# Initialize the database (creates SQLite by default)
alembic upgrade head
```

### 3. Frontend Setup

```bash
# Install Node dependencies
cd frontend
npm install
```

#### Configure Frontend Environment (Optional)

For production builds, create `frontend/.env.local`:

```bash
# Points to your deployed backend URL (only needed for production builds)
VITE_API_BASE_URL=http://localhost:8000
```

> **Note:** In development mode (`npm run dev`), Vite automatically proxies `/api/*` to `http://localhost:8000`, so this variable is not needed locally.

---

## Running the Application

### Option 1: Run Backend and Frontend Separately

**Terminal 1 - Backend:**
```bash
# From repository root, with .venv activated
source .venv/bin/activate

# Run with mock data (default - no API key needed)
uvicorn app:app --reload --host 0.0.0.0 --port 8000

# Or run with real LLM calls (requires OPENAI_API_KEY in .env)
LLM_DRY_RUN=0 uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 - Frontend:**
```bash
# From frontend directory
cd frontend
npm run dev
```

---

## Development Workflow

### Testing the Full Pipeline

1. **Start Backend**
   ```bash
   source .venv/bin/activate
   uvicorn app:app --reload  # Runs in dry-run mode by default
   ```

2. **Start Frontend**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Open Browser**
   - Navigate to `http://localhost:5173` (default Vite dev server)
   - Upload a PDF resume
   - Optionally paste a job description
   - Review parsed content
   - Customize theme and sections
   - Preview the portfolio

### Using the CLI Parser

Test the LLM parsing directly:

```bash
# Basic usage (uses settings from .env)
python -m backend.llm_label_resume path/to/resume.pdf

# With custom model
python -m backend.llm_label_resume resume.pdf --model gpt-4o-mini

# Dry run (no API call, uses mock data)
python -m backend.llm_label_resume resume.pdf --dry-run

# With job description
python -m backend.llm_label_resume resume.pdf --job-description "Senior Python Developer role"

# Get help
python -m backend.llm_label_resume --help
```

Output will be saved to `labeled_resume.json`.

### Running Tests

```bash
# Backend tests (when implemented)
pytest tests/

# Frontend linting
cd frontend
npm run lint

# Frontend formatting check
npm run check-format

# Auto-format frontend code
npm run format
```

---

## Common Development Tasks

### Database Operations

```bash
# Create a new migration
alembic revision --autogenerate -m "description of changes"

# Apply migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1

# View migration history
alembic history
```

### Resetting Local Database

```bash
# Remove SQLite database
rm resumeparser.db

# Recreate from migrations
alembic upgrade head
```

### Viewing API Documentation

With the backend running, visit:
- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

---

## Working with Feature Branches

Since Render auto-deploys from `main`, develop on feature branches:

```bash
# Create/switch to feature branch
git checkout -b feature/your-feature-name

# Make changes and commit
git add .
git commit -m "feat: your feature description"

# Keep feature branch updated with main
git fetch origin main
git merge origin/main

# When ready to deploy, merge to main
git checkout main
git merge feature/your-feature-name
git push origin main

# Continue development on feature branch
git checkout feature/your-feature-name
```

---

## Troubleshooting

### Backend Issues

**Port already in use:**
```bash
# Kill process on port 8000
lsof -ti:8000 | xargs kill -9

# Or use a different port
uvicorn app:app --reload --port 8001
```

**Import errors:**
```bash
# Ensure virtual environment is activated
source .venv/bin/activate

# Reinstall dependencies
pip install -r requirements.txt
```

**Database errors:**
```bash
# Check if migrations are up to date
alembic current

# Apply any pending migrations
alembic upgrade head
```

### Frontend Issues

**Port 5173 in use:**
```bash
# Vite will automatically try the next available port
# Or specify a different port in vite.config.js
```

**API connection errors:**
- Ensure backend is running on port 8000
- Check that Vite proxy is configured (should be automatic)
- Verify `VITE_API_BASE_URL` is not set incorrectly in `.env.local`

**Module not found:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### LLM/API Issues

**Rate limiting:**
- Default mode uses mock data (`LLM_DRY_RUN=1`) - no API calls needed
- To use real API: set `LLM_DRY_RUN=0` in `.env` and provide `OPENAI_API_KEY`
- Switch to Groq for higher free tier limits

**JSON parsing errors:**
- Set `DEBUG_JSON=1` in `.env` to save raw LLM responses to `llm_raw.txt`
- Try a different model with `--model` flag

---

## Environment Variables Reference

### Backend (.env)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | Yes | - | API key for OpenAI-compatible service |
| `OPENAI_BASE_URL` | No | OpenAI cloud | Custom API endpoint (e.g., Groq) |
| `MODEL_NAME` | No | `gpt-4o-mini` | LLM model to use |
| `DATABASE_URL` | No | SQLite | PostgreSQL connection string |
| `SUPABASE_URL` | No | - | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | No | - | Supabase service role key |
| `SUPABASE_RESUME_BUCKET` | No | `resumes` | Bucket for PDF storage |
| `LLM_DRY_RUN` | No | `1` | Set to `0` to use real LLM API calls |
| `FORCE_JSON` | No | - | Set to `0` if provider doesn't support JSON mode |
| `DEBUG_JSON` | No | - | Set to `1` to log raw LLM responses |
| `API_ALLOW_ORIGINS` | No | localhost | CORS allowed origins |

### Frontend (.env.local)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_BASE_URL` | No | proxy to :8000 | Backend API URL (for production builds) |

---

## Next Steps

- Check [`docs/DEPLOYMENT.md`](./DEPLOYMENT.md) for production deployment instructions
- Review the main [`README.md`](../README.md) for project overview and architecture
- Explore `backend/app.py` for API endpoints
- Look at `frontend/src/App.jsx` for the main UI flow
