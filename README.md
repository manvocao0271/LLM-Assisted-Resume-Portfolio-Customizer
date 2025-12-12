# LLM-Assisted Resume → Portfolio Customizer

A small open-source project that turns a PDF résumé into a structured JSON profile
and a customizable portfolio-style landing page. It combines a FastAPI backend
(LLM-based parsing + persistence) with a React frontend (multi-step editor and
preview).

---

## Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                       FRONTEND (React)                     │
│  - Vite + React 18 + Tailwind CSS                          │
│  - Zustand store for multi-step flow                       │
│  - Upload → Review → Customize → (Preview/Publish)         │
│  - Deployed as a static site                               │
└─────────────────┬───────────────────────────────────────────┘
                  │ REST API (JSON, CORS)
┌─────────────────┴───────────────────────────────────────────┐
│                      BACKEND (FastAPI)                     │
│  - PDF upload + parsing + LLM calls                        │
│  - Resume & portfolio models (SQLAlchemy)                  │
│  - Job-type & fit scoring helpers                          │
│  - Deployed as a Python web service                        │
└─────────────────┬───────────────────────────────────────────┘
                  │ Async DB + file storage
┌─────────────────┴───────────────────────────────────────────┐
│                    DATA & STORAGE LAYER                    │
│  - PostgreSQL (e.g., Supabase) for metadata                │
│  - Optional Supabase Storage for PDFs/artifacts            │
│  - SQLite fallback for local development                   │
└─────────────────────────────────────────────────────────────┘
```

---

## End-to-End Pipeline

1. **Upload & Parse**
   - User uploads a résumé PDF (optionally with a job description).
   - Backend extracts text, calls an OpenAI-compatible LLM, and normalizes the
     response into a consistent schema (name, contact, education, experience,
     projects, skills, etc.).
   - A `ResumeDocument` row and an initial `PortfolioDraft` are stored in the DB.

2. **Classify & Tailor**
   - The backend infers probable job types from both the résumé and (if provided)
     the job description using keyword + token-similarity scoring.
   - Summaries and highlights can be re-generated to be more aligned with the
     target role while staying human-editable.

3. **Review & Edit (Frontend)**
   - React UI walks through a 3-step flow:
     - **Upload** – choose PDF, paste job description, submit.
     - **Review** – edit parsed content section-by-section; see basic job-fit
       signals and classifications.
     - **Customize** – choose theme, reorder/toggle sections, and refine copy.
   - State is managed in a single Zustand store so changes are reflected across
     pages and preview components.

4. **Preview & Publish (Preview / Future)**
   - A draft preview route renders the portfolio for a private slug.
   - A future "Publish" action can mark a draft as public and reserve a URL
     slug suitable for sharing.

---

## Project Layout (Essentials)

```text
backend/          FastAPI app, models, schemas, storage, job typing
frontend/         React SPA (steps, previews, public portfolio views)
alembic/          Database migrations (PostgreSQL/SQLite)
app.py            Uvicorn entrypoint that exposes backend.app
llm_label_resume.py  CLI / library for LLM-driven resume labeling
render.yaml       Render blueprint (backend + frontend services)
DEPLOYMENT.md     Detailed Render deployment & env-var guide
requirements*.txt Python dependencies
package.json      Root npm helpers that delegate to frontend/
```

---

## Running Locally

### Backend (FastAPI)

1. Create and activate a virtual environment, then install Python deps:
   ```bash
   python -m venv .venv
   # Windows
   .venv\\Scripts\\activate
   pip install -r requirements.txt
   ```

2. Copy the example env file and add at least an API key:
   ```bash
   cp .env.example .env
   # then edit .env
   OPENAI_API_KEY=...              # Groq or OpenAI-compatible key
   # Optional: DATABASE_URL for Postgres; SQLite is used by default locally
   ```

3. Start the API server from the repo root:
   ```bash
   uvicorn app:app --reload
   ```

The main routes live in `backend/app.py` and include résumé upload/parsing
(`/api/resumes`) and portfolio draft/preview endpoints.

### Frontend (React + Vite)

1. From the repo root, install Node deps and run the dev server:
   ```bash
   npm install        # or: npm run setup
   npm run dev
   ```

2. In development, Vite proxies `/api/*` calls to the backend. By default the
   frontend reads `VITE_API_BASE_URL` when building for production and uses a
   dev proxy when running `npm run dev`.

Then open the printed local URL (typically `http://localhost:5173`) and follow
the Upload → Review → Customize flow.

---

## Deploying

The repository includes a Render blueprint at `render.yaml` that defines:

- A **Python web service** (`portfolio-backend`) that runs FastAPI with Uvicorn.
- A **static site** (`portfolio-frontend`) that builds and serves the Vite bundle
  from `frontend/`.

At minimum you will need to configure (in Render's dashboard or equivalent):

- `OPENAI_API_KEY` (or another OpenAI-compatible key).
- `DATABASE_URL` (PostgreSQL connection string) for persistent storage.
- `VITE_API_BASE_URL` on the frontend pointing at the deployed backend URL.
- Optional Supabase settings for file storage buckets.

For step-by-step deployment instructions and troubleshooting notes, see
`DEPLOYMENT.md`.

---

## Contributing & License

- Issues and PRs are welcome: the focus areas are better parsing prompts,
  improved job-fit feedback, and richer portfolio themes that remain safe to
  render in the browser.
- Please keep changes small and well-documented; this repo is intended to be
  approachable for people exploring LLM-powered résumé tooling.
- Add or run formatting/linting using the existing Black/Ruff and frontend
  tooling where appropriate.

(Choose or add a LICENSE file to clarify reuse; MIT is a common default for
small open-source samples like this.)
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
# LLM-Assisted Resume Portfolio Builder

This project is a full-stack app that turns a PDF resume into a structured, editable portfolio page using an LLM-powered FastAPI backend and a React-based multi-step editor.

The goal is to give candidates a fast way to:
- Parse a resume into clean, structured data
- Tailor content toward a target job description
- Customize a modern portfolio-style landing page they can share

---

## High-Level Pipeline

1. **Upload & Parse**
   - User uploads a PDF (optionally with a job description).
   - Backend extracts text, calls the LLM, normalizes the output, and stores resume + initial portfolio draft in the database (and Supabase Storage if configured).

2. **Review & Edit**
   - Frontend displays parsed sections (experience, projects, education, skills, summary).
   - User edits content, sees classification and basic job fit signals, and refines wording.

3. **Customize & Preview**
   - User selects a theme, reorders sections, and toggles visibility.
   - A live preview shows the resulting portfolio page.

4. **Publish (optional / future)**
   - Drafts can be promoted to public portfolio pages reachable by a short slug.

---

## Tech Stack Overview

- **Backend**: FastAPI, SQLAlchemy + Alembic, async PostgreSQL (via Supabase or other DB), optional Supabase Storage, OpenAI-compatible LLM client.
- **Frontend**: React 18 + Vite, Tailwind CSS, Zustand store, React Router.
- **Infra**: Render for hosting (Python web service + static site), `render.yaml` as the blueprint.

---

## Project Structure (Essentials)

```text
backend/          FastAPI app, models, schemas, storage, job typing
frontend/         React SPA (multi-step flow + portfolio views)
alembic/          Database migrations
app.py            Uvicorn entrypoint that re-exports backend.app
llm_label_resume.py  CLI / library for LLM resume labeling
render.yaml       Render blueprint (backend + frontend services)
DEPLOYMENT.md     Longer step-by-step Render deployment guide
requirements*.txt Python dependencies
package.json      Root helpers to run frontend commands from repo root
```

---

## Local Development Workflow

### 1. Backend

1. Create a virtual environment and install deps:
   ```bash
   python -m venv .venv
   .venv/Scripts/activate  # Windows
   pip install -r requirements.txt
   ```

2. Copy `.env.example` to `.env` and set at least:
   ```bash
   OPENAI_API_KEY=...        # Groq or OpenAI-compatible key
   # Optionally: DATABASE_URL for Postgres, otherwise local SQLite is used
   ```

3. Run the API:
   ```bash
   uvicorn app:app --reload
   ```

The main API lives in `backend/app.py` and exposes endpoints such as `/api/resumes` for upload/parse and `/api/portfolios/...` for drafts and previews.

### 2. Frontend

From the repo root:

```bash
npm install        # or: npm run setup
npm run dev        # proxies API calls to the backend
```

During development the flow is:
- Open the frontend dev server in your browser.
- Upload a resume, iterate on copy in the Review step, then tweak layout in Customize.
- Refresh or re-run to test different resumes and job descriptions.

---

## Deployment Overview

The project is designed to deploy to Render with two services defined in `render.yaml`:

- `portfolio-backend` (Python web service)
  - Builds with `pip install -r requirements.txt`.
  - Starts with `uvicorn app:app --host 0.0.0.0 --port $PORT`.
  - Requires environment variables for the LLM provider, database, and (optionally) Supabase.

- `portfolio-frontend` (static site)
  - Lives in `frontend/`.
  - Builds with `npm install && npm run build` and serves the `dist/` bundle.
  - Needs `VITE_API_BASE_URL` pointing at the backend URL.

For a full, step-by-step Render setup (including CORS and Supabase), see DEPLOYMENT.md.

---

## What This Project Demonstrates

- Converting unstructured resume PDFs into a structured schema with LLMs.
- A clean, user-friendly editor around that schema using React + Zustand.
- A realistic deployment story: FastAPI backend + React SPA on Render with Postgres and object storage.