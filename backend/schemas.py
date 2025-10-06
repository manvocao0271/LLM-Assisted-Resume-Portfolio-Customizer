from __future__ import annotations

from typing import Any, Dict, Literal, Optional

from pydantic import BaseModel, Field


class PortfolioUpdatePayload(BaseModel):
    data: Dict[str, Any] = Field(..., description="Updated portfolio content payload.")
    slug: Optional[str] = Field(default=None, max_length=160)
    status: Optional[Literal["draft", "published"]] = None
    visibility: Optional[Literal["private", "unlisted", "public"]] = None