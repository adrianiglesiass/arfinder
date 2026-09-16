"""user_terms_consent

Revision ID: b7e4d2a91c35
Revises: 3c8f2a4b9e10
Create Date: 2026-09-16 12:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = "b7e4d2a91c35"
down_revision: Union[str, None] = "3c8f2a4b9e10"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "user",
        sa.Column("terms_accepted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "user",
        sa.Column("terms_version", sa.String(length=50), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("user", "terms_version")
    op.drop_column("user", "terms_accepted_at")
