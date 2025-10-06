"""Add Supabase storage metadata columns

Revision ID: 20241012_01
Revises: 20241002_01
Create Date: 2025-10-12 00:00:00
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20241012_01"
down_revision: Union[str, None] = "20241002_01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "resume_documents",
        sa.Column("storage_bucket", sa.String(length=128), nullable=True),
    )
    op.add_column(
        "resume_documents",
        sa.Column("storage_path", sa.String(length=512), nullable=True),
    )
    op.add_column(
        "resume_documents",
        sa.Column("storage_uploaded_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("resume_documents", "storage_uploaded_at")
    op.drop_column("resume_documents", "storage_path")
    op.drop_column("resume_documents", "storage_bucket")
