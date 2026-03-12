"""chore: nullable booleans profile

Revision ID: c997acefdc22
Revises: 0004
Create Date: 2026-03-12 15:18:02.889861

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0005"
down_revision: Union[str, None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("profile", "mascotas", existing_type=sa.Boolean(), nullable=False)
    op.alter_column("profile", "fumador", existing_type=sa.Boolean(), nullable=False)


def downgrade() -> None:
    op.alter_column("profile", "fumador", existing_type=sa.Boolean(), nullable=True)
    op.alter_column("profile", "mascotas", existing_type=sa.Boolean(), nullable=True)
