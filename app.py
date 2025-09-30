"""Uvicorn entrypoint for running the FastAPI backend from the repository root."""

from backend.app import app  # noqa: F401  (re-export for uvicorn)
