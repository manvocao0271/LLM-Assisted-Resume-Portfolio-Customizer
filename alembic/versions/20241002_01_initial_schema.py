"""Initial database schema

Revision ID: 20241002_01
Revises:
Create Date: 2025-10-02 00:00:00
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20241002_01"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


portfolio_status = sa.Enum("draft", "published", name="portfolio_status")
portfolio_visibility = sa.Enum("private", "unlisted", "public", name="portfolio_visibility")


def upgrade() -> None:
    bind = op.get_bind()
    op.execute("DROP TYPE IF EXISTS portfolio_status CASCADE")
    op.execute("DROP TYPE IF EXISTS portfolio_visibility CASCADE")
    portfolio_status.create(bind, checkfirst=True)
    portfolio_visibility.create(bind, checkfirst=True)

    op.create_table(
        "resume_documents",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            server_onupdate=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column("original_filename", sa.String(length=255), nullable=False),
        sa.Column("file_size", sa.Integer(), nullable=True),
        sa.Column("llm_model", sa.String(length=120), nullable=True),
    sa.Column("dry_run", sa.Boolean(), nullable=False, server_default=sa.false()),
    sa.Column("parsed_payload", sa.JSON(), nullable=False),
    sa.Column("normalized_payload", sa.JSON(), nullable=False),
    )

    op.create_table(
        "portfolio_drafts",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("resume_id", sa.Uuid(), nullable=False),
        sa.Column("slug", sa.String(length=160), nullable=True, unique=True),
        sa.Column("status", portfolio_status, nullable=False, server_default="draft"),
        sa.Column("visibility", portfolio_visibility, nullable=False, server_default="private"),
        sa.Column("theme", sa.String(length=64), nullable=False, server_default="aurora"),
    sa.Column("content", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            server_onupdate=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["resume_id"], ["resume_documents.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_portfolio_drafts_resume_id", "portfolio_drafts", ["resume_id"], unique=False)



def downgrade() -> None:
    op.drop_index("ix_portfolio_drafts_resume_id", table_name="portfolio_drafts")
    op.drop_table("portfolio_drafts")
    op.drop_table("resume_documents")

    bind = op.get_bind()
    portfolio_visibility.drop(bind, checkfirst=True)
    portfolio_status.drop(bind, checkfirst=True)
