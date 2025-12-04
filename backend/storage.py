from __future__ import annotations

import asyncio
import logging
import os
import unicodedata
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from functools import lru_cache
from time import sleep
from pathlib import Path
from typing import Any, Optional

try:  # pragma: no cover - optional dependency guard
    from supabase import create_client
except ModuleNotFoundError:  # pragma: no cover
    create_client = None  # type: ignore[assignment]

logger = logging.getLogger(__name__)

DEFAULT_SIGNED_URL_TTL = 3600  # seconds (1 hour)


@dataclass(slots=True)
class SupabaseSettings:
    url: str
    service_key: str
    resume_bucket: str
    artifact_bucket: str


@dataclass(slots=True)
class UploadedAsset:
    bucket: str
    path: str
    signed_url: Optional[str] = None
    expires_in: int = DEFAULT_SIGNED_URL_TTL


@lru_cache(maxsize=1)
def _load_settings() -> Optional[SupabaseSettings]:
    url = (os.getenv("SUPABASE_URL") or "").strip()
    key = (os.getenv("SUPABASE_SERVICE_ROLE_KEY") or "").strip()
    if not url or not key or create_client is None:
        if not url or not key:
            logger.debug("Supabase configuration missing; storage integration disabled")
        elif create_client is None:
            logger.warning("Supabase SDK not installed; storage integration disabled")
        return None

    resume_bucket = (os.getenv("SUPABASE_RESUME_BUCKET") or "resumes").strip() or "resumes"
    artifact_bucket = (os.getenv("SUPABASE_ARTIFACT_BUCKET") or "artifacts").strip() or "artifacts"
    return SupabaseSettings(
        url=url,
        service_key=key,
        resume_bucket=resume_bucket,
        artifact_bucket=artifact_bucket,
    )


_client: Any = None


def _ensure_client() -> Any | None:
    global _client
    settings = _load_settings()
    if not settings:
        return None
    if _client is None:
        try:
            _client = create_client(settings.url, settings.service_key)
            logger.info("Supabase client initialized for project %s", settings.url)
        except Exception as exc:  # pragma: no cover - network/setup failures
            logger.exception("Failed to initialize Supabase client: %s", exc)
            return None
    return _client


def _reset_client() -> None:
    """Force re-creation of the Supabase client (e.g., after idle or 401)."""
    global _client
    _client = None


def is_enabled() -> bool:
    """Return True when Supabase credentials are present and the SDK is available."""

    return _load_settings() is not None and _ensure_client() is not None


def get_resume_bucket() -> Optional[str]:
    settings = _load_settings()
    return settings.resume_bucket if settings else None


def _slugify_filename(filename: str) -> str:
    stem = filename.rsplit(".", 1)[0]
    normalized = unicodedata.normalize("NFKD", stem)
    ascii_only = normalized.encode("ascii", "ignore").decode("ascii")
    safe = [ch.lower() if ch.isalnum() else "-" for ch in ascii_only]
    slug = "".join(safe).strip("-")
    return slug or "resume"


def _safe_json(response: Any) -> dict[str, Any]:
    if response is None:
        return {}
    if isinstance(response, dict):
        return response
    data = getattr(response, "data", None)
    if isinstance(data, dict):
        return data
    json_method = getattr(response, "json", None)
    if callable(json_method):
        try:
            json_data = json_method()
            if isinstance(json_data, dict):
                return json_data
        except Exception:  # pragma: no cover - defensive
            return {}
    return {}


def _ensure_success(label: str, response: Any) -> None:
    status_code = getattr(response, "status_code", None)
    if status_code is not None and status_code >= 400:
        payload = _safe_json(response)
        raise RuntimeError(f"Supabase {label} failed with status {status_code}: {payload}")
    payload = _safe_json(response)
    if payload.get("error"):
        raise RuntimeError(f"Supabase {label} failed: {payload['error']}")


def _should_reinit(status_code: Optional[int]) -> bool:
    """Return True if the error suggests our client/auth is invalid or expired."""
    if status_code is None:
        return False
    # 401 Unauthorized, 403 Forbidden, 404 Not Found (bucket/path issues) may benefit from re-init
    return status_code in (401, 403) or status_code == 404


def _upload_sync(file_path: Path, original_filename: str) -> Optional[UploadedAsset]:
    client = _ensure_client()
    settings = _load_settings()
    if not client or not settings:
        return None

    object_key = f"uploads/{datetime.now(timezone.utc):%Y/%m/%d}/{uuid.uuid4().hex}-{_slugify_filename(original_filename)}.pdf"

    with file_path.open("rb") as fp:
        file_bytes = fp.read()

    retries = 3
    delay = 0.5
    last_exc: Optional[Exception] = None
    for attempt in range(1, retries + 1):
        try:
            client = _ensure_client()
            if not client:
                raise RuntimeError("Supabase client unavailable")
            storage_client = client.storage.from_(settings.resume_bucket)
            response = storage_client.upload(
                object_key,
                file_bytes,
                file_options={"contentType": "application/pdf", "upsert": False},
            )
            status_code = getattr(response, "status_code", None)
            if status_code is not None and status_code >= 400:
                # If auth/bucket errors, try a client reset once
                if _should_reinit(status_code):
                    logger.warning("Supabase upload returned %s; reinitializing client and retrying (attempt %d)", status_code, attempt)
                    _reset_client()
                payload = _safe_json(response)
                raise RuntimeError(f"Supabase upload failed with status {status_code}: {payload}")
            # success path
            break
        except Exception as exc:
            last_exc = exc
            if attempt < retries:
                sleep(delay)
                delay *= 2
                continue
            logger.exception("Supabase upload failed for %s after %d attempts: %s", object_key, attempt, exc)
            raise

    signed_url = None
    try:
        signed_response = storage_client.create_signed_url(object_key, DEFAULT_SIGNED_URL_TTL)
        _ensure_success("create_signed_url", signed_response)
        signed_payload = _safe_json(signed_response)
        signed_url = signed_payload.get("signedURL") or signed_payload.get("signed_url")
    except Exception as exc:  # pragma: no cover - signed URLs are best-effort
        logger.warning("Unable to generate signed URL for %s: %s", object_key, exc)

    return UploadedAsset(
        bucket=settings.resume_bucket,
        path=object_key,
        signed_url=signed_url,
        expires_in=DEFAULT_SIGNED_URL_TTL,
    )


async def upload_resume_pdf(file_path: Path, original_filename: str) -> Optional[UploadedAsset]:
    """Upload the provided PDF to Supabase Storage when configured."""

    if _load_settings() is None:
        return None
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, _upload_sync, file_path, original_filename)


def _create_signed_sync(bucket: str, path: str, expires_in: int) -> Optional[str]:
    client = _ensure_client()
    if not client:
        return None

    storage_client = client.storage.from_(bucket)
    response = storage_client.create_signed_url(path, expires_in)
    _ensure_success("create_signed_url", response)
    payload = _safe_json(response)
    return payload.get("signedURL") or payload.get("signed_url")


async def create_signed_url(bucket: str, path: str, *, expires_in: int = DEFAULT_SIGNED_URL_TTL) -> Optional[str]:
    if _load_settings() is None:
        return None
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, _create_signed_sync, bucket, path, expires_in)


__all__ = (
    "DEFAULT_SIGNED_URL_TTL",
    "UploadedAsset",
    "create_signed_url",
    "get_resume_bucket",
    "is_enabled",
    "upload_resume_pdf",
)
