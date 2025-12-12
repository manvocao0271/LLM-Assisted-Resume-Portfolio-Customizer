# LLM-Assisted Resume → Portfolio Customizer

A small open-source project that turns a PDF résumé into a structured JSON profile and a customizable portfolio-style landing page. It combines a FastAPI backend (LLM-based parsing + persistence) with a React frontend (multi-step editor and preview).

---

## Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                       FRONTEND (React)                      │
│  - Vite + React 18 + Tailwind CSS                           │
│  - Zustand store for multi-step flow                        │
│  - Upload → Review → Customize → (Preview/Publish)          │
│  - Deployed as a static site                                │
└─────────────────┬───────────────────────────────────────────┘
                  │ REST API (JSON, CORS)
┌─────────────────┴───────────────────────────────────────────┐
│                      BACKEND (FastAPI)                      │
│  - PDF upload + parsing + LLM calls                         │
│  - Resume & portfolio models (SQLAlchemy)                   │
│  - Job-type & fit scoring helpers                           │
│  - Deployed as a Python web service                         │
└─────────────────┬───────────────────────────────────────────┘
                  │ Async DB + file storage
┌─────────────────┴───────────────────────────────────────────┐
│                    DATA & STORAGE LAYER                     │
│  - PostgreSQL (e.g., Supabase) for metadata                 │
│  - Optional Supabase Storage for PDFs/artifacts             │
│  - SQLite fallback for local development                    │
└─────────────────────────────────────────────────────────────┘
```

---

## End-to-End Pipeline

1. **Upload & Parse**
   - User uploads a résumé PDF (optionally with a job description).
   - Backend extracts text, calls an OpenAI-compatible LLM, and normalizes the response into a consistent schema (name, contact, education, experience, projects, skills, etc.).
   - A `ResumeDocument` row and an initial `PortfolioDraft` are stored in the DB.

2. **Classify & Tailor**
   - The backend infers probable job types from both the résumé and (if provided) the job description using keyword + token-similarity scoring.
   - Summaries and highlights can be re-generated to be more aligned with the target role while staying human-editable.

3. **Review & Edit (Frontend)**
   - React UI walks through a 3-step flow:
     - **Upload** – choose PDF, paste job description, submit.
     - **Review** – edit parsed content section-by-section; see basic job-fit signals and classifications.
     - **Customize** – choose theme, reorder/toggle sections, and refine copy.
   - State is managed in a single Zustand store so changes are reflected across pages and preview components.

4. **Preview & Publish (Preview / Future)**
   - A draft preview route renders the portfolio for a private slug.
   - A future "Publish" action can mark a draft as public and reserve a URL slug suitable for sharing.

---

## Project Layout

```text
backend/          FastAPI app, models, schemas, storage, job typing
frontend/         React SPA (steps, previews, public portfolio views)
alembic/          Database migrations (PostgreSQL/SQLite)
scripts/          CLI tools (llm_label_resume.py for LLM parsing)
tests/            Test suite (backend tests, fixtures)
docs/             Documentation (LOCAL_DEVELOPMENT.md, DEPLOYMENT.md)
app.py            Uvicorn entrypoint that exposes backend.app
render.yaml       Render blueprint (backend + frontend services)
requirements*.txt Python dependencies
package.json      Root npm helpers that delegate to frontend/
```

---

## Getting Started

### Local Development

For detailed setup instructions including environment configuration, database setup, and development workflow, see **[`docs/LOCAL_DEVELOPMENT.md`](docs/LOCAL_DEVELOPMENT.md)**.

**Quick start:**
```bash
# Backend
source .venv/bin/activate
uvicorn app:app --reload

# Frontend (in another terminal)
npm run dev
```

### Deployment

The repository includes a Render blueprint (`render.yaml`) for deploying both services. For complete deployment instructions and production configuration, see **[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)**.

---

## Technologies

- **Backend:** FastAPI, SQLAlchemy + Alembic, async PostgreSQL, Supabase Storage, OpenAI-compatible LLM
- **Frontend:** React 18 + Vite, Tailwind CSS, Zustand, React Router  
- **Infrastructure:** Render (Python web service + static site)

---

## Documentation

- **[Local Development Guide](docs/LOCAL_DEVELOPMENT.md)** - Setup instructions, environment configuration, and troubleshooting
- **[Deployment Guide](docs/DEPLOYMENT.md)** - Production deployment on Render with Supabase

---

## Contributing

Issues and PRs are welcome. Focus areas include:
- Improved parsing prompts and job-fit feedback
- Additional portfolio themes
- Test coverage and CI/CD pipelines

Please keep changes small and well-documented.

---