"""create_user_report

Revision ID: a1b2c3d4e5f6
Revises: 9a1b2c3d4e5f
Create Date: 2026-09-10 22:45:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "9a1b2c3d4e5f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "user_report",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("reporter_user_id", sa.Integer(), nullable=False),
        sa.Column("reported_user_id", sa.Integer(), nullable=False),
        sa.Column("reason", sa.String(length=50), nullable=False),
        sa.Column("detail", sa.Text(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=True
        ),
        sa.ForeignKeyConstraint(["reporter_user_id"], ["user.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["reported_user_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "reporter_user_id",
            "reported_user_id",
            name="uq_user_report_reporter_target",
        ),
    )
    op.create_index("ix_user_report_id", "user_report", ["id"])
    op.create_index(
        "ix_user_report_reported_user_id", "user_report", ["reported_user_id"]
    )
    op.create_index(
        "ix_user_report_reporter_user_id", "user_report", ["reporter_user_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_user_report_reporter_user_id", table_name="user_report")
    op.drop_index("ix_user_report_reported_user_id", table_name="user_report")
    op.drop_index("ix_user_report_id", table_name="user_report")
    op.drop_table("user_report")
