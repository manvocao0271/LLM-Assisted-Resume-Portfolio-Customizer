from __future__ import annotations

import os
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

RAW_DATABASE_URL = os.getenv("DATABASE_URL")


def _resolve_database_url(raw: str | None) -> str:
    if not raw:
        return "sqlite+aiosqlite:///./resumeparser.db"
    normalized = raw.strip()
    if normalized.startswith("postgres://"):
        normalized = normalized.replace("postgres://", "postgresql+asyncpg://", 1)
    elif normalized.startswith("postgresql://") and "+asyncpg" not in normalized:
        normalized = normalized.replace("postgresql://", "postgresql+asyncpg://", 1)
    return normalized


DATABASE_URL = _resolve_database_url(RAW_DATABASE_URL)
ECHO_SQL = os.getenv("SQL_ECHO", "0").strip() in {"1", "true", "True"}


class Base(DeclarativeBase):
    pass


def _create_engine(url: str):
    suppress_prepared_statements = {
        "statement_cache_size": 0,
        "prepared_statement_cache_size": 0,
    }
    return create_async_engine(
        url,
        future=True,
        echo=ECHO_SQL,
        pool_pre_ping=True,
        connect_args=suppress_prepared_statements,
    )


def _create_session_factory(url: str):
    engine = _create_engine(url)
    return engine, async_sessionmaker(engine, expire_on_commit=False, autoflush=False)


engine, async_session_maker = _create_session_factory(DATABASE_URL)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:  # type: ignore[misc]
        yield session


async def init_models_if_needed() -> None:
    """Ensures tables exist for lightweight environments (e.g., SQLite dev)."""
    # Avoid automatic schema creation for managed databases—expect Alembic migrations instead.
    if DATABASE_URL.startswith("sqlite"):
        async with engine.begin() as connection:
            from backend import models  # noqa: WPS433  (runtime import to register metadata)

            await connection.run_sync(Base.metadata.create_all)


__all__ = (
    "Base",
    "DATABASE_URL",
    "RAW_DATABASE_URL",
    "engine",
    "async_session_maker",
    "get_session",
    "init_models_if_needed",
)