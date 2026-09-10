"""create_user_block

Revision ID: 9a1b2c3d4e5f
Revises: 8e5f4c3a2b1d
Create Date: 2026-09-10 22:05:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "9a1b2c3d4e5f"
down_revision: Union[str, None] = "8e5f4c3a2b1d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "user_block",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("blocker_user_id", sa.Integer(), nullable=False),
        sa.Column("blocked_user_id", sa.Integer(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=True
        ),
        sa.ForeignKeyConstraint(["blocker_user_id"], ["user.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["blocked_user_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "blocker_user_id", "blocked_user_id", name="uq_user_block_blocker_target"
        ),
    )
    op.create_index("ix_user_block_id", "user_block", ["id"])
    op.create_index("ix_user_block_blocked_user_id", "user_block", ["blocked_user_id"])
    op.create_index("ix_user_block_blocker_user_id", "user_block", ["blocker_user_id"])


def downgrade() -> None:
    op.drop_index("ix_user_block_blocker_user_id", table_name="user_block")
    op.drop_index("ix_user_block_blocked_user_id", table_name="user_block")
    op.drop_index("ix_user_block_id", table_name="user_block")
    op.drop_table("user_block")
