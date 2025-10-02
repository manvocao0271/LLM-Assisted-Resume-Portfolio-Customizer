from __future__ import annotations

import copy
import os
import sys
import tempfile
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from backend.database import get_session, init_models_if_needed
from backend.models import PortfolioDraft, ResumeDocument
from backend.schemas import PortfolioUpdatePayload
from llm_label_resume import label_with_llm

MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024  # 8 MB demo guard
DEFAULT_MODEL = os.getenv("MODEL_NAME", "gpt-4o-mini")
DEFAULT_BASE_URL = os.getenv("OPENAI_BASE_URL") or None
DEFAULT_DRY_RUN = os.getenv("LLM_DRY_RUN", "0").strip().lower() in {"1", "true", "yes"}

THEME_OPTIONS = [
    {"id": "aurora", "name": "Aurora", "primary": "#42a5f5", "accent": "#f472b6"},
    {"id": "midnight", "name": "Midnight", "primary": "#6366f1", "accent": "#22d3ee"},
    {"id": "dawn", "name": "Dawn", "primary": "#f97316", "accent": "#facc15"},
]


@dataclass(slots=True)
class UploadedPDF:
    path: Path
    size: int
    filename: str

app = FastAPI(title="Resume Parser API", version="0.1.0")

default_origins = {
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
}

configured_origins = os.getenv("API_ALLOW_ORIGINS")
if configured_origins:
    allowed_origins = {origin.strip() for origin in configured_origins.split(",") if origin.strip()}
else:
    allowed_origins = set()

allowed_origins = sorted(default_origins.union(allowed_origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup() -> None:
    await init_models_if_needed()


async def _read_upload(upload: UploadFile) -> UploadedPDF:
    if upload.content_type not in {"application/pdf", "application/octet-stream"}:
        raise HTTPException(status_code=415, detail="Only PDF uploads are supported.")

    contents = await upload.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded file was empty.")
    if len(contents) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=413, detail="PDF exceeds size limit (8 MB).")

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
    with tmp:
        tmp.write(contents)
        tmp.flush()

    return UploadedPDF(path=Path(tmp.name), size=len(contents), filename=upload.filename or "resume.pdf")


def _safe_list(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(item) for item in value if isinstance(item, (str, int, float))]
    if isinstance(value, str):
        return [value]
    return []


def _collapse_summary(summary: Any) -> str:
    if isinstance(summary, str):
        return summary
    if isinstance(summary, list):
        return " ".join(str(item).strip() for item in summary if str(item).strip())
    return ""


def _format_period(start: Any, end: Any) -> str:
    start_text = str(start).strip() if start else ""
    end_text = str(end).strip() if end else "Present"
    if start_text and end_text:
        return f"{start_text} — {end_text}"
    return start_text or end_text


def _experience_entries(raw_entries: Any) -> list[Dict[str, Any]]:
    entries: list[Dict[str, Any]] = []
    if not isinstance(raw_entries, list):
        return entries
    for item in raw_entries:
        if not isinstance(item, dict):
            continue
        role = item.get("title") or item.get("role") or item.get("position") or ""
        company = item.get("organization") or item.get("company") or item.get("employer") or ""
        period = _format_period(item.get("start_date"), item.get("end_date"))
        bullets = item.get("achievements") or item.get("bullets") or item.get("highlights") or []
        entries.append(
            {
                "id": f"exp-{uuid.uuid4().hex[:8]}",
                "role": str(role),
                "company": str(company),
                "period": period,
                "bullets": [str(b).strip() for b in bullets if str(b).strip()],
            }
        )
    return entries


def _education_entries(raw_entries: Any) -> list[Dict[str, Any]]:
    entries: list[Dict[str, Any]] = []
    if not isinstance(raw_entries, list):
        return entries
    for item in raw_entries:
        if not isinstance(item, dict):
            continue
        school = item.get("institution") or item.get("school") or ""
        degree = item.get("degree") or item.get("program") or ""
        period = _format_period(item.get("start_date"), item.get("end_date"))
        entries.append(
            {
                "id": f"edu-{uuid.uuid4().hex[:8]}",
                "school": str(school),
                "degree": str(degree),
                "period": period,
            }
        )
    return entries


def _project_entries(raw_entries: Any) -> list[Dict[str, Any]]:
    entries: list[Dict[str, Any]] = []
    if not isinstance(raw_entries, list):
        return entries
    for item in raw_entries:
        if not isinstance(item, dict):
            continue
        entries.append(
            {
                "id": f"proj-{uuid.uuid4().hex[:8]}",
                "name": str(item.get("title") or item.get("name") or ""),
                "description": str(item.get("summary") or item.get("description") or ""),
                "link": str(item.get("url") or item.get("link") or ""),
            }
        )
    return entries


def _normalized_payload(parsed: Dict[str, Any]) -> Dict[str, Any]:
    contact = parsed.get("contact") if isinstance(parsed.get("contact"), dict) else {}
    emails = _safe_list(contact.get("emails") if contact else parsed.get("emails"))
    phones = _safe_list(contact.get("phones") if contact else parsed.get("phones"))
    urls = _safe_list(contact.get("urls") if contact else parsed.get("urls"))

    payload = {
        "name": parsed.get("name") or "",
        "summary": _collapse_summary(parsed.get("summary")),
        "experience": _experience_entries(parsed.get("experience")),
        "education": _education_entries(parsed.get("education")),
        "projects": _project_entries(parsed.get("projects")),
        "skills": _safe_list(parsed.get("skills")),
        "contact": {
            "emails": emails,
            "phones": phones,
            "urls": urls,
        },
        "embedded_links": parsed.get("embedded_links") or [],
        "themes": {
            "selected": parsed.get("theme") or THEME_OPTIONS[0]["id"],
            "options": THEME_OPTIONS,
        },
        "raw": parsed,
    }

    payload["themes"]["options"] = copy.deepcopy(THEME_OPTIONS)

    return payload


def _ensure_theme_structure(payload: Dict[str, Any]) -> None:
    themes = payload.setdefault("themes", {})
    options = themes.get("options")
    if not isinstance(options, list) or not options:
        themes["options"] = copy.deepcopy(THEME_OPTIONS)
    else:
        themes["options"] = copy.deepcopy(options)
    if not themes.get("selected"):
        themes["selected"] = THEME_OPTIONS[0]["id"]


def _enrich_with_metadata(data: Dict[str, Any], resume_id: uuid.UUID, portfolio_id: uuid.UUID) -> Dict[str, Any]:
    enriched = copy.deepcopy(data)
    meta = enriched.setdefault("meta", {})
    meta["resume_id"] = str(resume_id)
    meta["portfolio_id"] = str(portfolio_id)
    meta.setdefault("status", "draft")
    meta.setdefault("visibility", "private")
    return enriched


async def _persist_resume(
    session: AsyncSession,
    upload: UploadedPDF,
    parsed: Dict[str, Any],
    normalized: Dict[str, Any],
    model_name: str,
    dry_run: bool,
) -> Dict[str, Any]:
    resume_id = uuid.uuid4()
    portfolio_id = uuid.uuid4()

    normalized_copy = _enrich_with_metadata(normalized, resume_id, portfolio_id)
    _ensure_theme_structure(normalized_copy)

    resume_record = ResumeDocument(
        id=resume_id,
        original_filename=upload.filename,
        file_size=upload.size,
        llm_model=model_name,
        dry_run=dry_run,
        parsed_payload=copy.deepcopy(parsed),
        normalized_payload=copy.deepcopy(normalized_copy),
    )

    theme_choice = normalized_copy.get("themes", {}).get("selected") or THEME_OPTIONS[0]["id"]
    portfolio_record = PortfolioDraft(
        id=portfolio_id,
        resume_id=resume_id,
        theme=theme_choice,
        content=copy.deepcopy(normalized_copy),
    )

    session.add_all([resume_record, portfolio_record])
    await session.commit()

    return copy.deepcopy(normalized_copy)


async def _process_resume_request(
    file: UploadFile,
    session: AsyncSession,
    model: str | None,
    dry_run: bool | None,
) -> Dict[str, Any]:
    upload_payload = await _read_upload(file)
    effective_model = model or DEFAULT_MODEL
    effective_dry_run = DEFAULT_DRY_RUN if dry_run is None else dry_run
    try:
        parsed = label_with_llm(
            pdf_path=upload_payload.path,
            model=effective_model,
            dry_run=effective_dry_run,
            base_url=DEFAULT_BASE_URL,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover - catch-all for demo hardening
        raise HTTPException(status_code=500, detail="Failed to parse resume.") from exc
    else:
        normalized = _normalized_payload(parsed)
        return await _persist_resume(
            session=session,
            upload=upload_payload,
            parsed=parsed,
            normalized=normalized,
            model_name=effective_model,
            dry_run=effective_dry_run,
        )
    finally:
        try:
            upload_payload.path.unlink(missing_ok=True)
        except Exception:
            pass


@app.post("/api/parse")
async def parse_resume(
    file: UploadFile = File(...),
    model: str | None = None,
    dry_run: bool | None = None,
    session: AsyncSession = Depends(get_session),
) -> Dict[str, Any]:
    normalized = await _process_resume_request(file, session=session, model=model, dry_run=dry_run)
    return {"data": normalized}


@app.post("/api/resumes")
async def create_resume(
    file: UploadFile = File(...),
    model: str | None = None,
    dry_run: bool | None = None,
    session: AsyncSession = Depends(get_session),
) -> Dict[str, Any]:
    normalized = await _process_resume_request(file, session=session, model=model, dry_run=dry_run)
    return {"data": normalized}


@app.put("/api/portfolios/{portfolio_id}")
async def update_portfolio(
    portfolio_id: uuid.UUID,
    payload: PortfolioUpdatePayload,
    session: AsyncSession = Depends(get_session),
) -> Dict[str, Any]:
    portfolio = await session.get(PortfolioDraft, portfolio_id)
    if portfolio is None:
        raise HTTPException(status_code=404, detail="Portfolio not found.")

    if payload.slug is not None:
        slug_value = payload.slug.strip()
        if slug_value:
            slug_conflict = await session.execute(
                select(PortfolioDraft.id).where(
                    PortfolioDraft.slug == slug_value,
                    PortfolioDraft.id != portfolio.id,
                )
            )
            if slug_conflict.scalar_one_or_none():
                raise HTTPException(status_code=409, detail="Slug already in use.")
            portfolio.slug = slug_value
        else:
            portfolio.slug = None

    if payload.visibility is not None:
        portfolio.visibility = payload.visibility

    if payload.status is not None:
        portfolio.status = payload.status
        if payload.status == "published":
            portfolio.published_at = portfolio.published_at or datetime.now(timezone.utc)
        else:
            portfolio.published_at = None

    updated_content = copy.deepcopy(payload.data)
    _ensure_theme_structure(updated_content)
    meta = updated_content.setdefault("meta", {})
    meta.setdefault("resume_id", str(portfolio.resume_id))
    meta["portfolio_id"] = str(portfolio.id)
    meta["status"] = portfolio.status
    meta["visibility"] = portfolio.visibility
    if portfolio.slug:
        meta["slug"] = portfolio.slug
    elif "slug" in meta:
        del meta["slug"]

    theme_choice = updated_content.get("themes", {}).get("selected")
    if theme_choice:
        portfolio.theme = theme_choice

    portfolio.content = updated_content

    resume = await session.get(ResumeDocument, portfolio.resume_id)
    if resume:
        resume.normalized_payload = copy.deepcopy(updated_content)

    await session.commit()
    return {"data": updated_content}


@app.get("/api/portfolios/{portfolio_id}")
async def read_portfolio(
    portfolio_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
) -> Dict[str, Any]:
    portfolio = await session.get(PortfolioDraft, portfolio_id)
    if portfolio is None:
        raise HTTPException(status_code=404, detail="Portfolio not found.")
    return {"data": copy.deepcopy(portfolio.content)}


@app.get("/api/portfolios/by-slug/{slug}")
async def read_portfolio_by_slug(
    slug: str,
    session: AsyncSession = Depends(get_session),
) -> Dict[str, Any]:
    result = await session.execute(
        select(PortfolioDraft).where(
            PortfolioDraft.slug == slug,
            PortfolioDraft.status == "published",
            PortfolioDraft.visibility != "private",
        )
    )
    portfolio = result.scalar_one_or_none()
    if portfolio is None:
        raise HTTPException(status_code=404, detail="Portfolio not found.")
    return {"data": copy.deepcopy(portfolio.content)}


@app.get("/health", tags=["meta"])
async def healthcheck() -> Dict[str, str]:
    return {"status": "ok"}
