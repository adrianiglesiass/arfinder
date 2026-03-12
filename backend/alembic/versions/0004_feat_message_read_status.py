"""feat: add message read status

Revision ID: 0f35c63a4a78
Revises: 0003
Create Date: 2026-03-12 14:54:47.662745

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("message", "leido", existing_type=sa.Boolean(), nullable=False)
    op.add_column("message", sa.Column("leido_at", sa.DateTime(), nullable=True))
    op.create_index("idx_conversation_leido", "message", ["conversation_id", "leido"])


def downgrade() -> None:
    op.drop_index("idx_conversation_leido", table_name="message")
    op.drop_column("message", "leido_at")
    op.alter_column("message", "leido", existing_type=sa.Boolean(), nullable=True)
