"""Uvicorn entrypoint for running the FastAPI backend from the repository root.

This file exposes the FastAPI instance as ``app`` so commands like
``uvicorn app:app --host 0.0.0.0 --port $PORT`` work from the repo root
(as used by Render and local development).
"""

from __future__ import annotations

import sys
from pathlib import Path

# Ensure the project root is on sys.path so ``backend`` can be imported
BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
	sys.path.insert(0, str(BASE_DIR))

# Re-export the FastAPI application
from backend.app import app  # noqa: E402,F401


__all__ = ["app"]

