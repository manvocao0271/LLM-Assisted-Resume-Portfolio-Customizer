# ResumeParser

Single-file CLI that converts a resume PDF into structured JSON with the help of any OpenAI-compatible LLM.

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
  # Optional Supabase integration (storage + Postgres)
  SUPABASE_URL=https://your-project.supabase.co
  SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
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
- `--output-json` – change output filename (default `labeled_resume.json`)
- `--dry-run` – skip network call, emit stub payload for testing
- `--job-description` – paste the target job/role description to nudge the parser toward the hiring criteria
- `--job-description-file` – path to a text file with the job description (overrides `--job-description`)

### Environment variables
- `OPENAI_API_KEY` (required)
- `OPENAI_BASE_URL` (optional)
- `MODEL_NAME` (optional default model)
- `FORCE_JSON` – set to `0` if your provider rejects `response_format`
- `DEBUG_JSON` – set to any value to dump raw responses to `llm_raw.txt` when JSON parsing fails
- `SUPABASE_URL` – project URL (optional; enable Supabase Storage + Postgres)
- `SUPABASE_SERVICE_ROLE_KEY` – service role key used by the backend for storage and DB access
- `SUPABASE_RESUME_BUCKET` – bucket name for uploaded PDFs (defaults to `resumes` when unset)
- `SUPABASE_ARTIFACT_BUCKET` – bucket for generated assets (defaults to `artifacts` when unset)

All of these keys are scaffolded in `.env.example`; copy the file and fill in the values that apply to your environment.

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
pip install -r ../requirements.txt
uvicorn app:app --reload
```

Once the virtual environment is activated you can stay at the repository root and launch the API as `uvicorn app:app --reload`; the top-level `app.py` simply re-exports the FastAPI instance from `backend/app.py` for convenience.

By default the server trusts `LLM_DRY_RUN=0` (real LLM call). For demos without an API key set `LLM_DRY_RUN=1` to return structured stubs while still extracting hyperlinks. Adjust CORS via `API_ALLOW_ORIGINS` and override the model/base URL with `MODEL_NAME` and `OPENAI_BASE_URL`.

Key endpoints and payloads:
- `POST /api/resumes` – preferred upload endpoint. Parses the PDF, persists a `resume_document` & `portfolio_draft`, and returns normalized data plus `meta.resume_id` / `meta.portfolio_id` for follow-up calls.
- `POST /api/resumes` – preferred upload endpoint. Accepts the resume PDF plus an optional `job_description` field so the parser knows the role you are targeting; the response still returns normalized data plus `meta.resume_id` / `meta.portfolio_id`.
- `POST /api/parse` – legacy alias retained for the existing frontend; identical behavior to `/api/resumes`.
- `PUT /api/portfolios/{portfolio_id}` – saves review/customization edits. The request body should include the same normalized structure returned from upload.
- `GET /api/portfolios/{portfolio_id}` – fetches the latest draft payload for authenticated/editor flows.
- `GET /api/portfolios/by-slug/{slug}` – public read model (only returns `published` + non-`private` portfolios).
- `GET /api/resumes/{resume_id}/fit` – ML-powered resume vs job description similarity that returns a match score, matched keywords, missing keywords, and tactical suggestions for sharpening the narrative.

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

### Supabase storage & Postgres

1. Create a Supabase project (the free tier is enough for prototyping) and grab the **project URL** and **service role key**.
2. In Supabase &rarr; Storage, create two **private** buckets (defaults used by the app are `resumes` for uploads and `artifacts` for generated assets).
3. Set the following in `.env` (in addition to `DATABASE_URL`):
  ```ini
  SUPABASE_URL=https://your-project.supabase.co
  SUPABASE_SERVICE_ROLE_KEY=service-role-key
  SUPABASE_RESUME_BUCKET=resumes
  SUPABASE_ARTIFACT_BUCKET=artifacts
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

npm run dev
LLM_DRY_RUN=0 uvicorn app:app --port 8000