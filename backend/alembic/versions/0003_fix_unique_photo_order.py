"""fix: enforce unique photo order per profile

Revision ID: ad6a60cc1e30
Revises: 0002
Create Date: 2026-03-11 14:13:29.318135

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "profile_photo", "order", existing_type=sa.Integer(), nullable=False
    )
    op.alter_column(
        "profile_photo", "is_main", existing_type=sa.Boolean(), nullable=False
    )
    op.create_unique_constraint(
        "unique_profile_photo_order", "profile_photo", ["profile_id", "order"]
    )


def downgrade() -> None:
    op.drop_constraint("unique_profile_photo_order", "profile_photo", type_="unique")
    op.alter_column("profile_photo", "is_main", nullable=True)
    op.alter_column("profile_photo", "order", nullable=True)
