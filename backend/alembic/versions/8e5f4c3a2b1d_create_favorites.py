"""create_favorites

Revision ID: 8e5f4c3a2b1d
Revises: 3c8f2a4b9e10
Create Date: 2026-09-10 20:40:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "8e5f4c3a2b1d"
down_revision: Union[str, None] = "3c8f2a4b9e10"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "favorite",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("target_user_id", sa.Integer(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=True
        ),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["target_user_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "user_id", "target_user_id", name="uq_favorite_user_target"
        ),
    )
    op.create_index("ix_favorite_id", "favorite", ["id"])
    op.create_index("ix_favorite_target_user_id", "favorite", ["target_user_id"])
    op.create_index("ix_favorite_user_id", "favorite", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_favorite_user_id", table_name="favorite")
    op.drop_index("ix_favorite_target_user_id", table_name="favorite")
    op.drop_index("ix_favorite_id", table_name="favorite")
    op.drop_table("favorite")
