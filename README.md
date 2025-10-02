# ResumeParser

Single-file CLI that converts a resume PDF into structured JSON with the help of any OpenAI-compatible LLM.

## Project status

What’s already working and what’s left for a minimal publishable MVP.

### ✅ Done
- CLI parser (`llm_label_resume.py`)
  - Dry-run mode that returns a realistic sample or reuses `labeled_resume.json`
  - OpenAI-compatible provider support via `OPENAI_BASE_URL`, `MODEL_NAME`, `FORCE_JSON`
  - Link extraction from PDF annotations for traceability
- FastAPI backend (`backend/app.py`)
  - `/api/parse` endpoint normalizes parser output for the UI
  - CORS configured; `/health` endpoint; root entrypoint (`app.py`) for `uvicorn app:app`
- Persistence bootstrap
  - Async SQLAlchemy models + Alembic migrations for resumes and portfolio drafts
  - Defaults to local SQLite when `DATABASE_URL` is unset; Postgres-ready via `postgresql+asyncpg://`
- Frontend prototype (`frontend/`)
  - Vite + React + Tailwind + Zustand multi-step flow (Upload → Review → Customize → Preview)
  - Upload step retries common API base URLs and supports `VITE_API_BASE_URL`
- Dev ergonomics
  - Vite proxy forwards `/api/*` to the backend during dev
  - Root npm scripts (`npm run setup|dev|build|preview`) delegate to the frontend package

### 🚧 Next steps (MVP)
- Persistence enhancements
  - Move from default SQLite to managed Postgres (Supabase) and configure connection pooling
  - Hook portfolio update flows into the UI and persist published slugs end-to-end
  - Store original PDFs in Supabase Storage/S3 and persist `file_url`
- Auth & sessions
  - Supabase Auth or email magic link; protect write endpoints, keep public GET by slug
- File storage
  - Store original PDFs in Supabase Storage (or S3-compatible in dev) and persist `file_url`
- Publishing flow
  - "Publish draft" → reserve unique slug, set `published=true`, public route renders portfolio
- Theme & visibility persistence
  - Save theme selection and section toggles; load them into Preview
- Robust errors & health hints
  - Clear frontend messages for unreachable backend vs. parse failures; optional `/health` probe fallback
- Tests
  - Backend unit tests (normalizers, JSON coercion) + integration tests for `/api/parse`
  - Frontend store/component tests for Review/Customize
- CI/CD
  - GitHub Actions for lint/test/build; deploy frontend (Vercel) and backend (Render/Fly)
- Cache & rate limits (optional)
  - Upstash Redis: prompt/result cache by PDF hash; simple per-user quotas

If you want this scaffolded automatically, start with DB models + three endpoints, then wire Review/Customize to save+load.

## Requirements

- Python 3.10+
- `pip install -r requirements.txt`

## Setup

1. Copy the sample environment file and set your credentials:
   ```zsh
   cp .env.example .env
   # edit .env to add your API key / defaults
   ```
2. Optionally, override defaults via CLI flags (`--model`, `--base-url`).

## Usage

Groq (recommended free tier):
```zsh
python3 llm_label_resume.py "resume.pdf"
```
- `.env` should include:
  - `OPENAI_API_KEY=your_groq_key`
  - `OPENAI_BASE_URL=https://api.groq.com/openai/v1`
  - `MODEL_NAME=llama-3.1-8b-instant`

OpenAI cloud (paid):
```zsh
export OPENAI_API_KEY=sk-your-openai-key
python3 llm_label_resume.py "resume.pdf" --model gpt-4o-mini
```

Any OpenAI-compatible server (LM Studio, Ollama, etc.):
```zsh
python3 llm_label_resume.py "resume.pdf" \
  --base-url http://localhost:11434/v1 \
  --model mistral:7b-instruct
```

Dry run (no API call):
```zsh
python3 llm_label_resume.py "resume.pdf" --dry-run
```

### CLI options
```zsh
python3 llm_label_resume.py --help
```
Key flags:
- `--model` – override default model (otherwise falls back to `MODEL_NAME` or `gpt-4o-mini`)
- `--base-url` – custom endpoint, blank uses OpenAI cloud
- `--output-json` – change output filename (default `labeled_resume.json`)
- `--dry-run` – skip network call, emit stub payload for testing

### Environment variables
- `OPENAI_API_KEY` (required)
- `OPENAI_BASE_URL` (optional)
- `MODEL_NAME` (optional default model)
- `FORCE_JSON` – set to `0` if your provider rejects `response_format`
- `DEBUG_JSON` – set to any value to dump raw responses to `llm_raw.txt` when JSON parsing fails

## Output

`labeled_resume.json` contains:
- `name`
- `contact` (emails, phones, urls)
- `summary`
- `education`, `experience`, `projects`, `skills`
- `embedded_links` from PDF annotations (for traceability)

You can tailor the schema by editing the `SYSTEM_PROMPT` in `llm_label_resume.py`.

## Tips

- PDFs and generated artifacts (`labeled_resume.json`, `llm_raw.txt`) are git-ignored by default.
- Run `--dry-run` during development to avoid spending tokens.
- The script automatically loads `.env`, so keep that file out of version control.

## Frontend prototype

`frontend/` contains a Vite + React dashboard that walks through upload → review → customization. Tailwind CSS powers the styling and Zustand holds client state. To explore the demo locally:

```zsh
cd frontend
npm install
npm run dev
```

The build output lives in `frontend/dist` after running `npm run build`.

> Tip: from the repository root you can run `npm run setup` once and then `npm run dev` to forward the command to the frontend package.

### Backend API

`backend/app.py` exposes a FastAPI service that ingests a PDF and returns normalized résumé data ready for the dashboard:

```zsh
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r ../requirements.txt
uvicorn app:app --reload
```

Once the virtual environment is activated you can stay at the repository root and launch the API as `uvicorn app:app --reload`; the top-level `app.py` simply re-exports the FastAPI instance from `backend/app.py` for convenience.

By default the server trusts `LLM_DRY_RUN=0` (real LLM call). For demos without an API key set `LLM_DRY_RUN=1` to return structured stubs while still extracting hyperlinks. Adjust CORS via `API_ALLOW_ORIGINS` and override the model/base URL with `MODEL_NAME` and `OPENAI_BASE_URL`.

Key endpoints and payloads:
- `POST /api/resumes` – preferred upload endpoint. Parses the PDF, persists a `resume_document` & `portfolio_draft`, and returns normalized data plus `meta.resume_id` / `meta.portfolio_id` for follow-up calls.
- `POST /api/parse` – legacy alias retained for the existing frontend; identical behavior to `/api/resumes`.
- `PUT /api/portfolios/{portfolio_id}` – saves review/customization edits. The request body should include the same normalized structure returned from upload.
- `GET /api/portfolios/{portfolio_id}` – fetches the latest draft payload for authenticated/editor flows.
- `GET /api/portfolios/by-slug/{slug}` – public read model (only returns `published` + non-`private` portfolios).

Every response includes a `meta` block with `resume_id`, `portfolio_id`, and current `status`/`visibility` so the UI can keep track of persisted entities.

When `LLM_DRY_RUN=1` is enabled, the parser will first look for a locally saved `labeled_resume.json` and reuse it so the UI fills with real-looking content. If that file is missing it falls back to an illustrative sample résumé.

Point the frontend at the API by creating `frontend/.env.local`:

```zsh
VITE_API_BASE_URL=http://localhost:8000
```

During local development a Vite dev proxy forwards `/api/*` calls to `http://localhost:8000`, so the extra `.env` file is optional unless you are pointing at a remote backend or building for production.

### Database & migrations

- Set `DATABASE_URL` in `.env` when you are ready to use Postgres (example: `postgresql+asyncpg://user:pass@localhost:5432/resumeparser`). If the variable is omitted, the backend falls back to a local SQLite file `resumeparser.db`.
- Apply migrations with Alembic from the project root:
  ```zsh
  alembic upgrade head
  ```
- Generate future schema changes with:
  ```zsh
  alembic revision --autogenerate -m "describe change"
  ```
- If you hit `ValueError: the greenlet library is required`, reinstall the backend deps after pulling updates:
  ```zsh
  pip install -r requirements.txt
  ```
- The async SQLAlchemy session is configured in `backend/database.py`; `init_models_if_needed()` will auto-create tables only for the SQLite fallback to keep local prototyping frictionless.

## Development quickstart

Run the backend and frontend side-by-side during development.

Backend (root directory):
```zsh
# create a virtual environment (first time)
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# dry-run demo (no API key needed)
LLM_DRY_RUN=1 uvicorn app:app --port 8000

# or live LLM (requires env vars OPENAI_API_KEY, optional OPENAI_BASE_URL, MODEL_NAME)
# LLM_DRY_RUN=0 uvicorn app:app --port 8000
```

Frontend (in another terminal):
```zsh
cd frontend
npm install
npm run dev
```

The frontend will proxy `/api/*` to `http://localhost:8000`. To point at a remote backend, create `frontend/.env.local` with:
```ini
VITE_API_BASE_URL=https://your-api.example.com
```

## Portfolio Generator Roadmap

### Project Overview
Build a web application that transforms PDF résumés into customizable, public portfolio landing pages. The workflow covers uploading a résumé, parsing and refining its contents, and publishing a polished site.

### Architecture Approach
- **Frontend**: React/Next.js deployed on Vercel's Hobby tier (free SSL, automatic builds)
- **Backend**: FastAPI (Python) hosted on Render free services
- **Database**: PostgreSQL via Supabase free tier (includes backups and connection pooling) plus Upstash Redis free tier for caching
- **Storage**: Supabase Storage free allowance for PDFs and generated assets (alternatively S3-compatible MinIO during local dev)
- **Deployment**: GitHub → Vercel CI pipelines on free plans, with GitHub Actions (2K min/month) for smoke tests

### Development Phases
1. **Foundation (Weeks 1-2)**
  - Architecture & tech stack planning
  - Spin up FastAPI with core middleware and health checks
  - Wrap `llm_label_resume.py` in an async parsing service
2. **Core Features (Weeks 3-5)**
  - Design database schema for users, portfolios, and parsed sections
  - Build PDF upload interface with validation and progress updates
  - Create data review/edit UI for tweaking parsed content
3. **Portfolio Generation (Weeks 6-8)**
  - Implement modular theme system with responsive layouts
  - Develop portfolio renderer with SEO and accessibility baked in
  - Add customization controls (colors, typography, section ordering)
4. **Publishing & Accounts (Weeks 9-10)**
  - Generate shareable URLs and handle static/site rendering
  - Add authentication, portfolio dashboards, and privacy settings
5. **Production Hardening (Weeks 11-12)**
  - Layer in security hardening, monitoring, and analytics
  - Expand automated testing (unit, integration, E2E)
  - Finalize CI/CD and deployment automation

### Success Metrics
- Upload-to-publish flow completes in under five minutes
- Mobile Lighthouse score ≥ 90 across all themes
- Robust parsing for >95% of common résumé PDF formats
- At least 60% of users return to update or republish their portfolios

npm run dev
LLM_DRY_RUN=0 uvicorn app:app --port 8000