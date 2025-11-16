from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


class PortfolioUpdatePayload(BaseModel):
    data: Dict[str, Any] = Field(..., description="Updated portfolio content payload.")
    slug: Optional[str] = Field(default=None, max_length=160)
    status: Optional[Literal["draft", "published"]] = None
    visibility: Optional[Literal["private", "unlisted", "public"]] = None


# --- Generative preview (experimental) ---

SectionType = Literal["hero", "heading", "paragraph", "list", "grid", "contact"]


class SchemaSection(BaseModel):
    type: SectionType
    props: Dict[str, Any] = Field(default_factory=dict)


class SchemaSpec(BaseModel):
    page: Dict[str, Any] = Field(default_factory=dict)
    sections: List[SchemaSection] = Field(default_factory=list)


class GenerativePreviewRequest(BaseModel):
    prompt: str = Field(..., max_length=2000)
    data: Optional[Dict[str, Any]] = None


class GenerativePreviewResponse(BaseModel):
    uiSpec: SchemaSpec
    info: Dict[str, Any]