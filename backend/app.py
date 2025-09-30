from __future__ import annotations

import os
import sys
import tempfile
import uuid
from pathlib import Path
from typing import Any, Dict

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

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


def _read_upload(upload: UploadFile) -> Path:
    if upload.content_type not in {"application/pdf", "application/octet-stream"}:
        raise HTTPException(status_code=415, detail="Only PDF uploads are supported.")

    contents = upload.file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded file was empty.")
    if len(contents) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=413, detail="PDF exceeds size limit (8 MB).")

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
    with tmp:
        tmp.write(contents)
        tmp.flush()
    return Path(tmp.name)


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

    return {
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


@app.post("/api/parse")
async def parse_resume(
    file: UploadFile = File(...),
    model: str | None = None,
    dry_run: bool | None = None,
) -> Dict[str, Any]:
    temp_path = _read_upload(file)
    try:
        parsed = label_with_llm(
            pdf_path=temp_path,
            model=model or DEFAULT_MODEL,
            dry_run=DEFAULT_DRY_RUN if dry_run is None else dry_run,
            base_url=DEFAULT_BASE_URL,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover - catch-all for demo hardening
        raise HTTPException(status_code=500, detail="Failed to parse resume.") from exc
    finally:
        try:
            temp_path.unlink(missing_ok=True)
        except Exception:
            pass

    normalized = _normalized_payload(parsed)
    return {"data": normalized}


@app.get("/health", tags=["meta"])
async def healthcheck() -> Dict[str, str]:
    return {"status": "ok"}
