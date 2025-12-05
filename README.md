# LLM-Assisted Resume Portfolio Builder

A full-stack application that transforms PDF résumés into structured data and customizable portfolio landing pages using LLM-powered parsing, FastAPI backend services, and a React-based editing interface.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Project Structure](#project-structure)
- [How It Works](#how-it-works)
- [Project Summary](#project-summary)

---

## Architecture Overview

### System Design

This application follows a **three-tier architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (React)                        │
│  - Vite + React 18 + Tailwind CSS                           │
│  - Zustand for state management                             │
│  - Multi-step workflow (Upload → Review → Customize)        │
│  - Deployed as static site on Render                        │
└─────────────────┬───────────────────────────────────────────┘
                  │ REST API (JSON)
                  │ CORS-enabled
┌─────────────────┴───────────────────────────────────────────┐
│                    BACKEND (FastAPI)                         │
│  - Python 3.12 with async/await                             │
│  - PDF parsing + LLM integration                            │
│  - SQLAlchemy ORM with Alembic migrations                   │
│  - Supabase Storage for file uploads                        │
│  - Deployed on Render (Python web service)                  │
└─────────────────┬───────────────────────────────────────────┘
                  │ SQL queries, file uploads
┌─────────────────┴───────────────────────────────────────────┐
│                   DATA & STORAGE LAYER                       │
│  - PostgreSQL (Supabase) - resume/portfolio metadata        │
│  - Supabase Storage - PDF files and artifacts               │
│  - SQLite fallback for local development                    │
└─────────────────────────────────────────────────────────────┘
```

### Tech Stack

**Frontend**
- **Framework**: React 18 with Vite for fast builds and hot module replacement
- **Styling**: Tailwind CSS for utility-first, responsive design
- **State**: Zustand for lightweight, hook-based state management
- **Routing**: React Router for multi-page navigation (public portfolios, preview drafts)
- **Build**: Vite bundles to static files deployed on Render static sites

**Backend**
- **Framework**: FastAPI for high-performance async Python web services
- **Database ORM**: SQLAlchemy 2.x with async support
- **Migrations**: Alembic for version-controlled schema changes
- **PDF Processing**: PyPDF2 for text extraction and link parsing
- **LLM Integration**: OpenAI SDK (compatible with Groq, OpenAI, local servers)
- **Storage**: Supabase Storage SDK for secure file uploads with signed URLs

**Infrastructure**
- **Deployment**: Render (backend web service + frontend static site)
- **Database**: Supabase PostgreSQL (managed Postgres with connection pooling)
- **File Storage**: Supabase Storage (S3-compatible object storage)
- **Environment**: Environment variables managed through Render dashboard

---

## Project Structure

```
ResumeParser/
├── backend/                    # FastAPI backend application
│   ├── app.py                 # Main FastAPI app with API endpoints
│   ├── models.py              # SQLAlchemy database models
│   ├── schemas.py             # Pydantic schemas for request/response validation
│   ├── database.py            # Database connection and session management
│   ├── storage.py             # Supabase Storage integration
│   ├── job_types.py           # Job classification taxonomy and logic
│   └── classifier_test.py     # Standalone classifier testing tool
│
├── frontend/                   # React frontend application
│   ├── src/
│   │   ├── App.jsx            # Main app component with routing
│   │   ├── main.jsx           # Vite entry point
│   │   ├── components/        # Reusable UI components
│   │   │   ├── UploadStep.jsx         # PDF upload with job description
│   │   │   ├── ReviewStep.jsx         # Edit parsed resume data
│   │   │   ├── CustomizeStep.jsx      # Theme and layout customization
│   │   │   ├── PreviewPanel.jsx       # Live preview component
│   │   │   ├── NeonPortfolioPreview.jsx  # Modern portfolio renderer
│   │   │   └── SchemaRenderer.jsx     # Safe generative layout renderer
│   │   ├── store/
│   │   │   └── usePortfolioStore.js   # Zustand state store
│   │   └── pages/             # Route components
│   │       ├── PreviewDraft.jsx       # Draft preview page
│   │       └── PublicPortfolio.jsx    # Published portfolio viewer
│   ├── public/                # Static assets
│   ├── package.json           # Frontend dependencies
│   └── vite.config.js         # Vite configuration with API proxy
│
├── alembic/                   # Database migration scripts
│   ├── versions/              # Migration version files
│   └── env.py                 # Alembic environment configuration
│
├── app.py                     # Uvicorn entry point (imports backend.app)
├── llm_label_resume.py        # Standalone CLI parser script
├── requirements.txt           # Python production dependencies
├── requirements-dev.txt       # Python development dependencies
├── pyproject.toml            # Python project metadata
├── alembic.ini               # Alembic configuration
├── render.yaml               # Render deployment configuration
├── package.json              # Root npm scripts (forwards to frontend)
├── .env.example              # Environment variable template
├── DEPLOYMENT.md             # Detailed deployment guide
├── TROUBLESHOOTING.md        # Common issues and solutions
└── README.md                 # This file
```

### Key Files Explained

**Backend**
- `backend/app.py` - FastAPI application with all API routes, CORS configuration, and request handlers
- `backend/models.py` - Database schema: `ResumeDocument` (parsed PDF metadata) and `PortfolioDraft` (user edits)
- `backend/storage.py` - Supabase Storage wrapper for uploading PDFs and generating signed URLs
- `backend/job_types.py` - Classification system with 30+ job categories and skill-based matching
- `llm_label_resume.py` - CLI tool that can be imported or run standalone to parse PDFs with LLMs

**Frontend**
- `frontend/src/App.jsx` - Main component with step indicator and routing logic
- `frontend/src/store/usePortfolioStore.js` - Central state management for resume data, theme, and API calls
- `frontend/src/components/UploadStep.jsx` - File upload with multi-endpoint fallback and job description input
- `frontend/src/components/ReviewStep.jsx` - Section-by-section editing interface with job fit scoring
- `frontend/src/components/CustomizeStep.jsx` - Theme picker and section ordering controls

**Infrastructure**
- `render.yaml` - Infrastructure-as-code for deploying both services to Render
- `alembic/versions/*` - Database migration history with up/down scripts

---

## How It Works

### 1. Resume Upload & Parsing Flow

```
User uploads PDF
       ↓
Frontend (UploadStep.jsx)
  - Validates file type and size
  - Optionally captures job description
  - Sends to backend via POST /api/resumes
       ↓
Backend (app.py)
  - Saves PDF temporarily
  - Extracts text with PyPDF2
  - Sends to LLM with structured prompt
  - Normalizes JSON response
       ↓
LLM (Groq/OpenAI)
  - Returns structured JSON:
    {
      name, contact, summary,
      education[], experience[],
      projects[], skills[]
    }
       ↓
Backend Processing
  - Classifies job type from resume content
  - If job description provided:
    * Classifies target role
    * Generates tailored summary
    * Rewrites experience bullets
  - Uploads PDF to Supabase Storage
  - Saves to PostgreSQL (ResumeDocument + PortfolioDraft)
       ↓
Frontend receives response
  - Stores in Zustand state
  - Advances to Review step
```

### 2. Data Review & Editing Flow

```
Frontend (ReviewStep.jsx)
  - Displays parsed data in editable sections
  - Shows job type classification
  - If job description present:
    * Calculates fit score (keyword matching)
    * Shows matched/missing skills
  - User edits inline
       ↓
User clicks "Next"
  - State updates locally (not saved yet)
  - Advances to Customize step
```

### 3. Customization & Preview Flow

```
Frontend (CustomizeStep.jsx)
  - User selects theme (Aurora, Midnight, Dawn)
  - Reorders sections (drag/drop or buttons)
  - Changes visibility settings
  - Previews live in PreviewPanel
       ↓
User clicks "Save Draft"
  - Calls PUT /api/portfolios/{portfolio_id}
  - Backend updates PortfolioDraft.content_json
       ↓
User clicks "Preview Full Page"
  - Opens /preview/:slug in new tab
  - PreviewDraft.jsx fetches latest draft
  - Renders with NeonPortfolioPreview component
```

### 4. Publishing Flow (Future)

```
User clicks "Publish"
       ↓
Backend (PUT /api/portfolios/{id})
  - Sets status = "published"
  - Sets visibility = "public"
  - Generates unique slug
  - Records published_at timestamp
       ↓
Frontend redirects to /p/:slug
  - PublicPortfolio.jsx renders final page
  - SEO-optimized, shareable link
```

### 5. Database Schema

```sql
-- Resume metadata and parsed content
CREATE TABLE resume_documents (
    id UUID PRIMARY KEY,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    original_filename VARCHAR(255),
    job_description TEXT,
    file_size INTEGER,
    storage_bucket VARCHAR(128),    -- Supabase bucket name
    storage_path VARCHAR(512),      -- File path in bucket
    storage_uploaded_at TIMESTAMP,
    llm_model VARCHAR(120),         -- e.g., "llama-3.1-8b-instant"
    dry_run BOOLEAN,
    parsed_payload JSONB,           -- Raw LLM output
    normalized_payload JSONB        -- Cleaned and structured data
);

-- User's editable portfolio draft
CREATE TABLE portfolio_drafts (
    id UUID PRIMARY KEY,
    resume_id UUID REFERENCES resume_documents(id),
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    slug VARCHAR(255) UNIQUE,       -- URL-safe identifier
    status VARCHAR(20),             -- "draft" or "published"
    visibility VARCHAR(20),         -- "private", "unlisted", "public"
    published_at TIMESTAMP,
    content_json JSONB              -- User's edited content + theme
);
```

### 6. API Endpoints

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| `POST` | `/api/resumes` | Upload PDF, parse with LLM, save to DB | None (future: required) |
| `POST` | `/api/parse` | Legacy parsing endpoint (similar to above) | None |
| `GET` | `/api/resumes/{id}/fit` | Calculate resume-job fit score | None (future: required) |
| `GET` | `/api/portfolios/{id}` | Fetch draft by ID | None (future: owner only) |
| `PUT` | `/api/portfolios/{id}` | Update draft (save edits) | None (future: owner only) |
| `GET` | `/api/portfolios/by-slug/{slug}` | Fetch published portfolio | Public |
| `GET` | `/api/portfolios/preview/{slug}` | Fetch draft preview | None (requires portfolio_id param) |
| `POST` | `/api/generative/preview` | Generate layout from prompt | None |
| `GET` | `/health` | Backend health check with env validation | Public |
| `GET` | `/` | API info and CORS configuration | Public |

### 7. State Management (Frontend)

The Zustand store (`usePortfolioStore.js`) manages:

```javascript
{
  // Multi-step flow
  step: 0,  // 0=Upload, 1=Review, 2=Customize
  
  // Upload state
  rawFile: File | null,
  uploadStatus: 'idle' | 'ready' | 'uploading' | 'parsed' | 'error',
  
  // Parsed data
  name: string,
  summary: string,
  contact: { emails[], phones[], urls[] },
  experience: Array<{ role, company, period, bullets[] }>,
  education: Array<{ institution, degree, dates }>,
  projects: Array<{ name, description, link }>,
  skills: string[],
  
  // Job classification
  job_type: { category, confidence, matches[] },
  resume_job_type: { category, confidence, matches[] },
  job_description: string,
  
  // Customization
  themes: { selected: 'aurora', options: [...] },
  layout: { sectionOrder: string[] },
  
  // Metadata
  meta: {
    resume_id: UUID,
    portfolio_id: UUID,
    status: 'draft' | 'published',
    visibility: 'private' | 'unlisted' | 'public',
    slug: string
  }
}
```

### 8. Environment Variables

**Backend (.env)**
```bash
# Required
OPENAI_API_KEY=gsk_...              # Groq or OpenAI API key
DATABASE_URL=postgresql+asyncpg://... # Postgres connection string

# Optional (Supabase)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_RESUME_BUCKET=resumes
SUPABASE_ARTIFACT_BUCKET=artifacts

# Optional (customization)
OPENAI_BASE_URL=https://api.groq.com/openai/v1  # LLM provider
MODEL_NAME=llama-3.1-8b-instant                  # Default model
LLM_DRY_RUN=0                                    # 1 = skip LLM calls
API_ALLOW_ORIGINS=https://your-frontend.com      # CORS origins
```

**Frontend (.env or Render)**
```bash
VITE_API_BASE_URL=https://your-backend.com  # Backend URL (baked into build)
```

### 9. Deployment Architecture (Render)

```
GitHub Repository (main branch)
       ↓ (auto-deploy on push)
┌──────────────────────────────────────────────┐
│  Render Blueprint (render.yaml)              │
├──────────────────────────────────────────────┤
│                                              │
│  ┌─────────────────┐  ┌──────────────────┐ │
│  │ Backend Service │  │ Frontend Service │ │
│  │ (Python)        │  │ (Static Site)    │ │
│  │                 │  │                  │ │
│  │ Build:          │  │ Build:           │ │
│  │  pip install    │  │  npm install     │ │
│  │                 │  │  npm run build   │ │
│  │ Start:          │  │                  │ │
│  │  uvicorn app    │  │ Serve: dist/     │ │
│  └────────┬────────┘  └────────┬─────────┘ │
│           │                    │            │
└───────────┼────────────────────┼────────────┘
            │                    │
            │                    │
┌───────────┴────────────────────┴────────────┐
│         External Services                   │
│  - Supabase PostgreSQL (database)           │
│  - Supabase Storage (file uploads)          │
│  - Groq API (LLM inference)                 │
└─────────────────────────────────────────────┘
```

**Deployment URLs:**
- Backend: `https://portfolio-backend-xxxx.onrender.com`
- Frontend: `https://portfolio-frontend-xxxx.onrender.com`

**How URLs Connect:**
1. Frontend's `VITE_API_BASE_URL` is set to backend URL (hardcoded in render.yaml)
2. Backend's `API_ALLOW_ORIGINS` is set to frontend URL (hardcoded in render.yaml)
3. Vite bakes `VITE_API_BASE_URL` into JavaScript bundle at build time
4. Backend validates CORS using configured origins at runtime

---

## Project Summary

### Introduction & Overview
ResumeParser transforms traditional résumés into structured data and polished portfolio experiences. The project combines a CLI parser, a FastAPI backend, and a React-based dashboard so users can upload a PDF, normalize its contents, tweak every section, and preview the final portfolio before publishing.

### Main Goals & Guiding Questions
- How can we reliably extract résumé content using LLMs without sacrificing determinism or safety?
- What editing workflows help users reconcile raw parser output with their preferred portfolio narrative?
- Can we offer generative design assistance while preventing arbitrary code execution in the browser?

### Background & Context
Building public-facing portfolios from résumés usually requires manual reformatting. This project started as a CLI experiment to coerce LLMs into stable JSON output, then grew into a full-stack prototype that keeps human control at every step: section ordering, contact cleanup, draft previews, and publish-time slug management.

### Methods & Tools
- **Parsing & Normalization:** Python 3.12, `llm_label_resume.py`, PyPDF2 link extraction, and environment-driven OpenAI-compatible providers.
- **Backend Services:** FastAPI, async SQLAlchemy with Alembic migrations, Supabase Storage integration, and deterministic schema generation for prompts.
- **Frontend Experience:** React 18 with Vite, Tailwind CSS, Zustand state store, and a SchemaRenderer that only renders vetted UI primitives.
- **Dev Ergonomics:** Vite proxying, reusable npm scripts, and dry-run modes for both the parser and backend to support local testing.

### Findings & Outcomes
- Locked-in JSON normalization ensures summaries, contact details, and project bullet points stay consistent across CLI, API, and UI.
- Review & Customize steps now feature buffered inputs, HTTPS-only link sanitization, and up/down section reordering that matches the public preview order.
- A discrete “Preview draft” flow saves the latest edits, opens `/preview/:slug`, and safeguards draft access by requiring both slug and portfolio ID.
- The experimental schema-first generator translates prompts into deterministic UI specs, offering creative layouts without allowing arbitrary HTML or scripts.
- Job-type classifiers now blend curated keyword matching, skill-token weighting, semantic similarity, and the raw résumé text to infer the most relevant role. The shared taxonomy has expanded beyond general software roles to cover robotics, hardware/electrical, mechanical, civil, aerospace, biomedical, healthcare, and more—reducing false positives like “People & HR” for technical postings.
- Documentation, build scripts, and environment scaffolding let contributors stand up the full stack quickly (Python backend, React frontend, optional Supabase services).

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
- Centralized job-type taxonomy (`backend/job_types.py`) powers both job-description and résumé-based classifiers, including skill-specific weighting and resume/raw-text fallbacks for better engineering coverage.
- Automatically reruns the tailored summary generation when a job description is provided so the Review & Edit stage starts with content that references the desired role.
- The tailored summary intentionally stays generalized for the applicant type and omits specific metrics so it can feel reusable across similar openings.
- Experience/project highlights are also rerun through the same contextual prompt so the Review & Edit stage opens with role-aligned but still non-metric copy.
- Persistence bootstrap
  - Async SQLAlchemy models + Alembic migrations for resumes and portfolio drafts
  - Defaults to local SQLite when `DATABASE_URL` is unset; Postgres-ready via `postgresql+asyncpg://`
  - Supabase-aware: when `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` are set, uploads persist PDFs to private Storage buckets
- Frontend prototype (`frontend/`)
  - Vite + React + Tailwind + Zustand multi-step flow (Upload → Review → Customize → Preview)
  - Upload step retries common API base URLs, supports `VITE_API_BASE_URL`, stages files locally, and only triggers parsing once you confirm—making it easier to adjust the job description before burning API calls.
  - Upload step lets you paste or drop a job description (optional) so the backend can tailor the normalized data to that role.
  - Review & Edit now surfaces both job-description and résumé-driven job-type cards, alongside the role-fit evaluation card that compares the parsed résumé against the provided job description, exposing a similarity score, matched keywords, and short recommendations before publishing.
- Dev ergonomics
  - Vite proxy forwards `/api/*` to the backend during dev
  - Root npm scripts (`npm run setup|dev|build|preview`) delegate to the frontend package

### 🚧 Next steps (MVP)
- Persistence enhancements
  - Finalize Supabase Postgres provisioning (`DATABASE_URL`, connection pooling, CI migrations)
  - Add storage hygiene tooling (prune orphaned uploads, refresh signed URLs on demand)
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
  # LLM‑Assisted Résumé → Portfolio Customizer
  - Upstash Redis: prompt/result cache by PDF hash; simple per-user quotas

If you want this scaffolded automatically, start with DB models + three endpoints, then wire Review/Customize to save+load.


1. Copy the sample environment file and set your credentials:
   cp .env.example .env
   # edit .env to add your API key / defaults
  # Optional Supabase integration (storage + Postgres)
  SUPABASE_URL=https://your-project.supabase.co
  SUPABASE_RESUME_BUCKET=resumes
  SUPABASE_ARTIFACT_BUCKET=artifacts
   ```
2. Optionally, override defaults via CLI flags (`--model`, `--base-url`).

## Usage

Groq (recommended free tier):
```zsh
python3 llm_label_resume.py "resume.pdf"
```
- `.env` should include:
  - `OPENAI_API_KEY=your_groq_key`
  - `MODEL_NAME=llama-3.1-8b-instant`

OpenAI cloud (paid):
```zsh
python3 llm_label_resume.py "resume.pdf" --model gpt-4o-mini
```

Any OpenAI-compatible server (LM Studio, Ollama, etc.):
```

Dry run (no API call):
```zsh
python3 llm_label_resume.py "resume.pdf" --dry-run
```

Job description tailoring (optional):
```zsh
python3 llm_label_resume.py "resume.pdf" --job-description "Senior machine learning engineer focused on embedded systems."
```

You can also point `--job-description-file` at a text document when the posting is too long for the command line.

### CLI options
```zsh
python3 llm_label_resume.py --help
```
Key flags:
- `--model` – override default model (otherwise falls back to `MODEL_NAME` or `gpt-4o-mini`)
- `--base-url` – custom endpoint, blank uses OpenAI cloud
- `--job-description-file` – path to a text file with the job description (overrides `--job-description`)

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

## Offline classifier testing

When you don’t want to re-upload the same PDF each time, reuse the stored parser output and run the backend classifiers directly:

1. Generate `labeled_resume.json` once via `python3 llm_label_resume.py resume.pdf --dry-run` (or reuse the existing fixture).
2. Run `python backend/classifier_test.py` to see what both `job_type` and `resume_job_type` inference produce from that JSON.
3. Pass a job description to the script for the job-type classifier using `--job-description "Senior Product Manager"` or `--job-description-file path/to/description.txt`.

This keeps you local, deterministic, and fast so you can iterate on classification heuristics without calling the upload API or an LLM again.

## Frontend prototype

`frontend/` contains a Vite + React dashboard that walks through upload → review → customization. Tailwind CSS powers the styling and Zustand holds client state. The draft and public preview routes now render the new `NeonPortfolioPreview` component, keeping the data flow the same but wrapping the experience in a dark, gradient-driven layout before publishing. To explore the demo locally:

```zsh
cd frontend
npm install
npm run dev
```

### Linting & formatting

Frontend (ESLint + Prettier):
```zsh
cd frontend
npm i -D eslint eslint-plugin-react eslint-plugin-react-hooks eslint-plugin-jsx-a11y eslint-plugin-import prettier eslint-config-prettier eslint-plugin-prettier
npm run lint
npm run format
```

Python (Ruff + Black):
```zsh
pip install -r requirements-dev.txt
ruff check .
black .
```
```

The build output lives in `frontend/dist` after running `npm run build`, and the command still succeeds with the neon preview wired into the pages.

While you are refining résumé data the review page now calls `/api/resumes/{resume_id}/fit` when a job description is present. This ML analysis returns a percentage match, highlights which keywords already align, and surfaces quick suggestions so you can tailor the draft before publishing.

Published portfolios are served client-side at `/p/:slug` (for example `http://localhost:5173/p/demo-slug`) and proxy through to the backend’s `GET /api/portfolios/by-slug/{slug}` endpoint.

> Tip: from the repository root you can run `npm run setup` once and then `npm run dev` to forward the command to the frontend package.

### Backend API

`backend/app.py` exposes a FastAPI service that ingests a PDF and returns normalized résumé data ready for the dashboard:

```zsh
cd backend
python3 -m venv .venv
source .venv/bin/activate
- `POST /api/resumes` – preferred upload endpoint. Parses the PDF, persists a `resume_document` & `portfolio_draft`, and returns normalized data plus `meta.resume_id` / `meta.portfolio_id` for follow-up calls.
- `POST /api/resumes` – preferred upload endpoint. Accepts the resume PDF plus an optional `job_description` field so the parser knows the role you are targeting; the response still returns normalized data plus `meta.resume_id` / `meta.portfolio_id`.
- `GET /api/portfolios/{portfolio_id}` – fetches the latest draft payload for authenticated/editor flows.
- `GET /api/portfolios/by-slug/{slug}` – public read model (only returns `published` + non-`private` portfolios).
- `GET /api/resumes/{resume_id}/fit` – ML-powered resume vs job description similarity that returns a match score, matched keywords, missing keywords, and tactical suggestions for sharpening the narrative.

Every response includes a `meta` block with `resume_id`, `portfolio_id`, and current `status`/`visibility` so the UI can keep track of persisted entities.

When `LLM_DRY_RUN=1` is enabled, the parser will first look for a locally saved `labeled_resume.json` and reuse it so the UI fills with real-looking content. If that file is missing it falls back to an illustrative sample résumé.

VITE_API_BASE_URL=http://localhost:8000
```
During local development a Vite dev proxy forwards `/api/*` calls to `http://localhost:8000`, so the extra `.env` file is optional unless you are pointing at a remote backend or building for production.

### Database & migrations

- Set `DATABASE_URL` in `.env` when you are ready to use Postgres (example: `postgresql+asyncpg://user:pass@localhost:5432/resumeparser`). If the variable is omitted, the backend falls back to a local SQLite file `resumeparser.db`.
- Apply migrations with Alembic from the project root:
  alembic upgrade head
  ```
- Generate future schema changes with:
  ```zsh
  alembic revision --autogenerate -m "describe change"
- If you hit `ValueError: the greenlet library is required`, reinstall the backend deps after pulling updates:
  ```zsh
  pip install -r requirements.txt
  ```
- The async SQLAlchemy session is configured in `backend/database.py`; `init_models_if_needed()` will auto-create tables only for the SQLite fallback to keep local prototyping frictionless.

### Supabase storage & Postgres

1. Create a Supabase project (the free tier is enough for prototyping) and grab the **project URL** and **service role key**.
2. In Supabase &rarr; Storage, create two **private** buckets (defaults used by the app are `resumes` for uploads and `artifacts` for generated assets).
  SUPABASE_RESUME_BUCKET=resumes
  ```
  Use the Supabase connection string (from Project Settings &rarr; Database) for `DATABASE_URL`, replacing the driver prefix with `postgresql+asyncpg://`.
4. Apply migrations so the managed Postgres instance is up to date:
  ```zsh
  alembic upgrade head
  ```
5. Run the backend. When Supabase credentials are present the upload endpoint streams PDFs to Storage and includes a short-lived signed URL in the API response. If the variables are left blank the app falls back to local disk and SQLite for quick demos.
6. Verify the integration:
  - Install backend dependencies *after* updating `.env` so the Supabase Python SDK is available:
    ```zsh
    pip install -r requirements.txt
    ```
  - Start the API (`uvicorn app:app --reload --port 8000`), upload a PDF via the UI, and confirm the server log does **not** print `Supabase SDK not installed; storage integration disabled`.
  - Inspect the `POST /api/resumes` response — the `data.meta.storage` block should list `bucket`, `path`, and a `signed_url`.
  - Refresh the Supabase dashboard (`Storage → resumes`) and confirm the uploaded file appears.

### Troubleshooting Supabase uploads

If you see the frontend warning **"Failed to persist PDF to storage"**, the backend has already routed the PDF to Supabase and the Storage upload call is raising a `Supabase upload failed for …` exception. A few checks usually clear it up:

1. **Double-check the credentials:** make sure `SUPABASE_URL` still points to your project, `SUPABASE_SERVICE_ROLE_KEY` is the current service-role key (rotate it in Supabase if you regenerated keys), and `SUPABASE_RESUME_BUCKET` exactly matches the bucket name you created (`resumes` by default). Restart the backend after changing `.env` so the new values are loaded.
2. **Confirm the bucket exists/permissioned:** the service role key is required to write to private buckets.
3. **Reproduce the failure locally:** create a quick PDF and invoke the upload helper directly to isolate network errors.
   ```zsh
   python3 - <<'PY'
   from PyPDF2 import PdfWriter
   writer = PdfWriter()
   writer.add_blank_page(width=612, height=792)
   with open('sample_resume.pdf', 'wb') as out:
     writer.write(out)
   PY

  ./.venv/bin/python - <<'PY'
   import asyncio
   from pathlib import Path
   from dotenv import load_dotenv

   load_dotenv('.env')
   from backend import storage

   async def main():
     try:
       asset = await storage.upload_resume_pdf(Path('sample_resume.pdf'), 'sample_resume.pdf')
       print('Uploaded asset', asset)
     except Exception as exc:
       raise SystemExit(f'Supabase upload failed: {exc}')

   asyncio.run(main())
   PY
   ```
   A successful run means your Supabase project is configured correctly; any HTTP error in that script (401/403/404) points at an invalid key or bucket.
4. **Check the backend log:** while uvicorn is running, look for the `Supabase upload failed for ...` stack trace. It includes the Supabase status code and payload so you know whether you’re hitting authentication, bucket permissions, or payload size limits.

Once the service-role key and bucket are validated, the frontend upload flow should stop returning the red error message and you’ll see signed URLs appended to `data.meta.storage` again.

> Troubleshooting: if the backend logs `Supabase SDK not installed; storage integration disabled`, reinstall the requirements or run `pip install supabase` inside your virtualenv, then restart `uvicorn`.

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
# when SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY are set, uploads are pushed to Supabase Storage
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

## Generative Portfolio (Experimental Design)

This opt-in feature turns a short prompt into a presentational portfolio layout using a safe, schema-first approach. The backend returns a constrained UI specification (uiSpec) that the frontend renders with vetted components—no arbitrary code or HTML execution.

Goals
- No arbitrary code execution in the browser; only whitelisted components are rendered.
- Fast and deterministic preview; no external calls required after spec is returned.
- Safe defaults; if spec is missing/invalid, the app falls back to the theme-based renderer.

API contract (draft)
- POST /api/generative/preview
  - Request: { prompt: string, data?: PortfolioData }
  - Response: { uiSpec: SchemaSpec, info: { version: string, generatedAt: string } }
- PUT /api/portfolios/{id}
  - May include an optional meta.generatedSpec to persist a chosen spec for the public page (future).

SchemaSpec v0 (bounded primitives)
- page: { layout: "default" | "minimal" }
- sections: Array<Section>
- Section
  - type: "hero" | "heading" | "paragraph" | "list" | "grid" | "contact"
  - props: strictly typed, e.g. list: { title?: string, variant?: "tags"|"bullets", items: Array<string|{title:string,body?:string}> }

Frontend plan (feature-flagged)
- Generate Design panel in Customize with:
  - Prompt textarea (e.g., "Minimal, airy, emphasis on projects")
  - Generate button → POST preview → store uiSpec in state
  - Inline preview via SchemaRenderer
  - History (last specs) and Revert to Theme (future)

Renderer (SchemaRenderer)
- Tailwind-only building blocks:
  - Hero: name + summary
  - Lists: skills as tags or bullets; experience/project items with title/body
  - Grid: project cards with optional https link
  - Contact: mailto/tel/https chips
  - No iframes, scripts, style tags, or raw HTML rendering

Safety & guardrails
- Drop external URLs that aren’t https.
- Clamp array sizes (e.g., max 12 items per list/grid) and truncate long text.
- Validate spec with Pydantic (backend) and Zod/prop checks (frontend).
- If validation fails, show a friendly error and fall back to theme renderer.

Milestones
1) MVP: Deterministic spec from prompt + current data; preview only (this PR).
2) Persist spec on publish (meta.generatedSpec) and render on the public page.
3) Add more section types (quote, stats, timeline) and color variants.
4) Optional: server-side spec templating for static export.

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