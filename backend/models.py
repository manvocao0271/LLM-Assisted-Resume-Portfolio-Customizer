from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Dict, Optional

from sqlalchemy import JSON, Boolean, DateTime, Enum, ForeignKey, Integer, String, Uuid, func
from sqlalchemy.ext.mutable import MutableDict
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database import Base

PORTFOLIO_STATUS = ("draft", "published")
PORTFOLIO_VISIBILITY = ("private", "unlisted", "public")


class ResumeDocument(Base):
    __tablename__ = "resume_documents"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_size: Mapped[Optional[int]] = mapped_column(Integer)
    storage_bucket: Mapped[Optional[str]] = mapped_column(String(128))
    storage_path: Mapped[Optional[str]] = mapped_column(String(512))
    storage_uploaded_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    llm_model: Mapped[Optional[str]] = mapped_column(String(120))
    dry_run: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    parsed_payload: Mapped[Dict[str, Any]] = mapped_column(
        MutableDict.as_mutable(JSON), default=dict, nullable=False
    )
    normalized_payload: Mapped[Dict[str, Any]] = mapped_column(
        MutableDict.as_mutable(JSON), default=dict, nullable=False
    )

    portfolio: Mapped["PortfolioDraft"] = relationship(
        back_populates="resume", cascade="all, delete-orphan", uselist=False
    )


class PortfolioDraft(Base):
    __tablename__ = "portfolio_drafts"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    resume_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("resume_documents.id", ondelete="CASCADE"), nullable=False, index=True
    )
    slug: Mapped[Optional[str]] = mapped_column(String(160), unique=True)
    status: Mapped[str] = mapped_column(
        Enum(*PORTFOLIO_STATUS, name="portfolio_status"), default="draft", nullable=False
    )
    visibility: Mapped[str] = mapped_column(
        Enum(*PORTFOLIO_VISIBILITY, name="portfolio_visibility"), default="private", nullable=False
    )
    theme: Mapped[str] = mapped_column(String(64), default="aurora", nullable=False)
    content: Mapped[Dict[str, Any]] = mapped_column(
        MutableDict.as_mutable(JSON), default=dict, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    resume: Mapped[ResumeDocument] = relationship(back_populates="portfolio")


__all__ = ("PortfolioDraft", "ResumeDocument", "PORTFOLIO_STATUS", "PORTFOLIO_VISIBILITY")
