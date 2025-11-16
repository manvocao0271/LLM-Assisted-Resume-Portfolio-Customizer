from __future__ import annotations

import copy
import logging
import os
import sys
import tempfile
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional
from uuid import UUID

from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from backend import storage
from backend.database import get_session, init_models_if_needed
from backend.models import PortfolioDraft, ResumeDocument
from backend.schemas import (
    PortfolioUpdatePayload,
    GenerativePreviewRequest,
    GenerativePreviewResponse,
    SchemaSpec,
    SchemaSection,
)
from llm_label_resume import label_with_llm, generate_tailored_summary, generate_tailored_highlights

MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024  # 8 MB demo guard
MAX_JOB_DESCRIPTION_LENGTH = 8 * 1024  # limit stored prompt context to 8 KB
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

logger = logging.getLogger(__name__)

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


def _normalize_job_description(value: Any) -> str:
    if value is None:
        return ""
    text = " ".join(str(value).strip().splitlines())
    if not text:
        return ""
    if len(text) > MAX_JOB_DESCRIPTION_LENGTH:
        text = text[:MAX_JOB_DESCRIPTION_LENGTH].rstrip()
    return text


def _safe_list(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(item) for item in value if isinstance(item, (str, int, float))]
    if isinstance(value, str):
        return [value]
    return []


def _split_lines(values: Any) -> list[str]:
    lines: list[str] = []
    for raw in _safe_list(values):
        for part in str(raw).replace("\r", "\n").split("\n"):
            cleaned = part.strip().lstrip("•·-•")
            if cleaned:
                lines.append(cleaned)
    return lines


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
        bullets = _split_lines(
            item.get("bullets")
            or item.get("highlights")
            or item.get("achievements")
            or item.get("details")
        )
        description_source = item.get("summary") or item.get("description") or ""
        description_text = str(description_source).strip()
        if not description_text and bullets:
            description_text = "\n".join(bullets)
        entries.append(
            {
                "id": f"proj-{uuid.uuid4().hex[:8]}",
                "name": str(item.get("title") or item.get("name") or ""),
                "description": description_text,
                "link": str(item.get("url") or item.get("link") or ""),
                "bullets": bullets,
            }
        )
    return entries


def _normalized_payload(parsed: Dict[str, Any]) -> Dict[str, Any]:
    contact = parsed.get("contact") if isinstance(parsed.get("contact"), dict) else {}

    # Start with common keys
    emails = _safe_list(contact.get("emails") if contact else parsed.get("emails"))
    phones = _safe_list(contact.get("phones") if contact else parsed.get("phones"))
    urls = _safe_list(contact.get("urls") if contact else parsed.get("urls"))

    # Consider alternate keys sometimes returned by models
    emails += _safe_list(parsed.get("email"))
    phones += _safe_list(parsed.get("phone"))
    phones += _safe_list(parsed.get("phone_number"))
    urls += _safe_list(parsed.get("links"))
    urls += _safe_list(parsed.get("profiles"))
    urls += _safe_list(parsed.get("websites"))

    # Recover contact details from embedded PDF links when available
    embedded_links = parsed.get("embedded_links") or []
    for link in embedded_links if isinstance(embedded_links, list) else []:
        try:
            href = str(link.get("url", "")).strip()
        except Exception:
            continue
        if not href:
            continue
        lower = href.lower()
        if lower.startswith("mailto:"):
            addr = href.split(":", 1)[1].split("?")[0].strip()
            if addr:
                emails.append(addr)
        elif lower.startswith("tel:"):
            num = href.split(":", 1)[1].split("?")[0].strip()
            if num:
                phones.append(num)
        else:
            urls.append(href)

    # De-duplicate while preserving order
    def _dedupe(items: list[str], key=lambda s: s.strip().lower()):
        seen: set[str] = set()
        result: list[str] = []
        for it in items:
            if not isinstance(it, str):
                continue
            k = key(it)
            if not k or k in seen:
                continue
            seen.add(k)
            result.append(it.strip())
        return result

    # For phones, dedupe by digits only to avoid format variations
    def _digits_only(s: str) -> str:
        return "".join(ch for ch in s if ch.isdigit())

    emails = _dedupe(emails)
    phones = _dedupe(phones, key=lambda s: _digits_only(str(s)))
    urls = _dedupe(urls)

    payload = {
        "name": parsed.get("name") or "",
        "summary": _collapse_summary(parsed.get("summary")),
        "job_description": _normalize_job_description(parsed.get("job_description")),
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


def _apply_storage_metadata(
    payload: Dict[str, Any],
    *,
    bucket: str,
    path: str,
    signed_url: str | None = None,
    uploaded_at: datetime | None = None,
) -> None:
    meta = payload.setdefault("meta", {})
    storage_meta = meta.setdefault("storage", {})
    storage_meta["provider"] = "supabase"
    storage_meta["bucket"] = bucket
    storage_meta["path"] = path

    if uploaded_at is not None:
        storage_meta["uploaded_at"] = uploaded_at.astimezone(timezone.utc).isoformat()
    else:
        storage_meta.pop("uploaded_at", None)

    if signed_url:
        storage_meta["signed_url"] = signed_url
        storage_meta["expires_in"] = storage.DEFAULT_SIGNED_URL_TTL
    else:
        storage_meta.pop("signed_url", None)
        storage_meta.pop("expires_in", None)


async def _apply_storage_metadata_from_resume(resume: ResumeDocument | None, payload: Dict[str, Any]) -> None:
    if not resume or not resume.storage_bucket or not resume.storage_path:
        return

    signed_url: str | None = None
    if storage.is_enabled():
        try:
            signed_url = await storage.create_signed_url(resume.storage_bucket, resume.storage_path)
        except Exception as exc:  # pragma: no cover - remote call failure
            logger.warning("Unable to refresh Supabase signed URL for resume %s: %s", resume.id, exc)

    _apply_storage_metadata(
        payload,
        bucket=resume.storage_bucket,
        path=resume.storage_path,
        signed_url=signed_url,
        uploaded_at=resume.storage_uploaded_at,
    )


async def _maybe_upload_to_supabase(upload: UploadedPDF) -> storage.UploadedAsset | None:
    if not storage.is_enabled():
        return None
    try:
        return await storage.upload_resume_pdf(upload.path, upload.filename)
    except Exception as exc:
        logger.exception("Supabase upload failed for %s: %s", upload.filename, exc)
        raise HTTPException(status_code=502, detail="Failed to persist PDF to storage.") from exc


async def _persist_resume(
    session: AsyncSession,
    upload: UploadedPDF,
    parsed: Dict[str, Any],
    normalized: Dict[str, Any],
    model_name: str,
    dry_run: bool,
    job_description: str | None,
) -> Dict[str, Any]:
    resume_id = uuid.uuid4()
    portfolio_id = uuid.uuid4()

    normalized_copy = _enrich_with_metadata(normalized, resume_id, portfolio_id)
    _ensure_theme_structure(normalized_copy)

    storage_result = await _maybe_upload_to_supabase(upload)
    storage_uploaded_at = datetime.now(timezone.utc) if storage_result else None
    if storage_result:
        _apply_storage_metadata(
            normalized_copy,
            bucket=storage_result.bucket,
            path=storage_result.path,
            signed_url=storage_result.signed_url,
            uploaded_at=storage_uploaded_at,
        )

    resume_record = ResumeDocument(
        id=resume_id,
        original_filename=upload.filename,
        file_size=upload.size,
        storage_bucket=storage_result.bucket if storage_result else None,
        storage_path=storage_result.path if storage_result else None,
        storage_uploaded_at=storage_uploaded_at,
        llm_model=model_name,
        dry_run=dry_run,
        job_description=job_description,
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
    job_description: str | None,
) -> Dict[str, Any]:
    upload_payload = await _read_upload(file)
    effective_model = model or DEFAULT_MODEL
    effective_dry_run = DEFAULT_DRY_RUN if dry_run is None else dry_run
    job_description_text = _normalize_job_description(job_description)
    try:
        parsed = label_with_llm(
            pdf_path=upload_payload.path,
            model=effective_model,
            dry_run=effective_dry_run,
            base_url=DEFAULT_BASE_URL,
            job_description=job_description_text or None,
        )
        tailored_summary = (
            generate_tailored_summary(
                parsed,
                job_description_text,
                model=effective_model,
                base_url=DEFAULT_BASE_URL,
                dry_run=effective_dry_run,
            )
            if job_description_text
            else ""
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover - catch-all for demo hardening
        raise HTTPException(status_code=500, detail="Failed to parse resume.") from exc
    else:
        if job_description_text:
            parsed.setdefault("job_description", job_description_text)
        normalized = _normalized_payload(parsed)
        if tailored_summary:
            normalized["original_summary"] = normalized.get("summary", "")
            normalized["summary"] = tailored_summary
            normalized.setdefault("meta", {})["tailored_summary"] = True

        highlights = generate_tailored_highlights(
            normalized,
            job_description_text,
            model=effective_model,
            base_url=DEFAULT_BASE_URL,
            dry_run=effective_dry_run,
        )
        if highlights:
            normalized.setdefault("experience", [])
            normalized.setdefault("projects", [])
            exp_updates = highlights.get("experience", [])
            proj_updates = highlights.get("projects", [])
            experience_map = {item.get("id"): item for item in normalized["experience"] if item.get("id")}
            for update in exp_updates:
                if not update.get("id"):
                    continue
                target = experience_map.get(update["id"])
                if target and isinstance(update.get("bullets"), list):
                    target["bullets"] = update["bullets"]
            project_map = {item.get("id"): item for item in normalized["projects"] if item.get("id")}
            for update in proj_updates:
                if not update.get("id"):
                    continue
                target = project_map.get(update["id"])
                if target and isinstance(update.get("bullets"), list):
                    target["bullets"] = update["bullets"]
        return await _persist_resume(
            session=session,
            upload=upload_payload,
            parsed=parsed,
            normalized=normalized,
            model_name=effective_model,
            dry_run=effective_dry_run,
            job_description=job_description_text or None,
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
    job_description: str | None = Form(None),
    session: AsyncSession = Depends(get_session),
) -> Dict[str, Any]:
    normalized = await _process_resume_request(
        file,
        session=session,
        model=model,
        dry_run=dry_run,
        job_description=job_description,
    )
    return {"data": normalized}


@app.post("/api/resumes")
async def create_resume(
    file: UploadFile = File(...),
    model: str | None = None,
    dry_run: bool | None = None,
    job_description: str | None = Form(None),
    session: AsyncSession = Depends(get_session),
) -> Dict[str, Any]:
    normalized = await _process_resume_request(
        file,
        session=session,
        model=model,
        dry_run=dry_run,
        job_description=job_description,
    )
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

    resume = await session.get(ResumeDocument, portfolio.resume_id)
    if resume:
        await _apply_storage_metadata_from_resume(resume, updated_content)

    portfolio.content = updated_content

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
    content = copy.deepcopy(portfolio.content)
    resume = await session.get(ResumeDocument, portfolio.resume_id)
    await _apply_storage_metadata_from_resume(resume, content)
    return {"data": content}


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
    content = copy.deepcopy(portfolio.content)
    resume = await session.get(ResumeDocument, portfolio.resume_id)
    await _apply_storage_metadata_from_resume(resume, content)
    return {"data": content}


@app.get("/api/portfolios/preview/{slug}")
async def read_portfolio_draft_preview(
    slug: str,
    portfolio_id: UUID,
    session: AsyncSession = Depends(get_session),
) -> Dict[str, Any]:
    """Draft preview by slug + id. Returns content regardless of publish/visibility.

    This endpoint is intended for client-side previews before publishing. It requires both
    slug and portfolio_id to avoid leaking unrelated drafts.
    """
    result = await session.execute(
        select(PortfolioDraft).where(
            PortfolioDraft.slug == slug,
            PortfolioDraft.id == portfolio_id,
        )
    )
    portfolio = result.scalar_one_or_none()
    if portfolio is None:
        raise HTTPException(status_code=404, detail="Portfolio not found.")
    content = copy.deepcopy(portfolio.content)
    resume = await session.get(ResumeDocument, portfolio.resume_id)
    await _apply_storage_metadata_from_resume(resume, content)
    return {"data": content}


@app.get("/health", tags=["meta"])
async def healthcheck() -> Dict[str, str]:
    return {"status": "ok"}


# -------- Generative preview (experimental, safe/schema-first) --------

def _truncate(s: str, max_len: int = 280) -> str:
    s = (s or "").strip()
    return s[:max_len]


def _deterministic_spec_from_prompt(prompt: str, data: Dict[str, Any]) -> SchemaSpec:
    """Produce a constrained UI schema without external calls.

    The spec is intentionally simple and safe. It never returns arbitrary code or HTML.
    """
    name = str(data.get("name") or "").strip()
    summary = str(data.get("summary") or "").strip()
    skills = [str(s) for s in (data.get("skills") or []) if str(s).strip()]
    projects = [p for p in (data.get("projects") or []) if isinstance(p, dict)]
    experience = [e for e in (data.get("experience") or []) if isinstance(e, dict)]
    contact = data.get("contact") or {}

    # Choose a lightweight layout based on a few prompt keywords
    p = prompt.lower()
    emphasize_projects = any(k in p for k in ["project", "work", "showcase"])
    minimal = any(k in p for k in ["minimal", "clean", "airy", "simple"]) 

    sections: list[SchemaSection] = []

    # Hero
    sections.append(SchemaSection(type="hero", props={
        "title": _truncate(name or "Your Name"),
        "subtitle": _truncate(summary or "Professional summary goes here."),
    }))

    # Skills (compact when minimal)
    if skills:
        sections.append(SchemaSection(type="list", props={
            "title": "Skills",
            "variant": "tags" if minimal else "bullets",
            "items": skills[:12],
        }))

    # Projects first when emphasized
    def project_sections() -> list[SchemaSection]:
        cards = []
        for proj in projects[:6]:
            cards.append({
                "title": _truncate(str(proj.get("name") or "Project"), 80),
                "body": _truncate(str(proj.get("description") or ""), 220),
                "link": str(proj.get("link") or ""),
            })
        if not cards:
            return []
        return [SchemaSection(type="grid", props={
            "title": "Projects",
            "items": cards,
            "columns": 2 if minimal else 3,
        })]

    def experience_sections() -> list[SchemaSection]:
        items = []
        for e in experience[:6]:
            head = " ".join([
                str(e.get("role") or "").strip(),
                "·" if e.get("company") else "",
                str(e.get("company") or "").strip(),
            ]).strip()
            body = _truncate("\n".join([b for b in (e.get("bullets") or []) if str(b).strip()]) or str(e.get("period") or ""), 220)
            items.append({"title": _truncate(head, 120), "body": body})
        if not items:
            return []
        return [SchemaSection(type="list", props={
            "title": "Experience",
            "variant": "bullets",
            "items": items,
        })]

    if emphasize_projects:
        sections.extend(project_sections())
        sections.extend(experience_sections())
    else:
        sections.extend(experience_sections())
        sections.extend(project_sections())

    # Contact
    urls = [u for u in (contact.get("urls") or []) if isinstance(u, str) and u.startswith("https://")]
    emails = [e for e in (contact.get("emails") or []) if isinstance(e, str)]
    phones = [ph for ph in (contact.get("phones") or []) if isinstance(ph, str)]
    chips: list[dict[str, str]] = []
    chips.extend([{ "type": "url", "label": u, "href": u } for u in urls[:5]])
    chips.extend([{ "type": "email", "label": e, "href": f"mailto:{e}" } for e in emails[:2]])
    chips.extend([{ "type": "phone", "label": ph, "href": f"tel:{ph}" } for ph in phones[:2]])
    if chips:
        sections.append(SchemaSection(type="contact", props={ "items": chips }))

    return SchemaSpec(page={"layout": "minimal" if minimal else "default"}, sections=sections)


@app.post("/api/generative/preview", response_model=GenerativePreviewResponse)
async def generative_preview(payload: GenerativePreviewRequest) -> GenerativePreviewResponse:
    # Keep it deterministic and local – no external LLM calls here.
    spec = _deterministic_spec_from_prompt(payload.prompt, payload.data or {})
    return GenerativePreviewResponse(
        uiSpec=spec,
        info={
            "version": "0",
            "generatedAt": datetime.now(timezone.utc).isoformat(),
        },
    )
