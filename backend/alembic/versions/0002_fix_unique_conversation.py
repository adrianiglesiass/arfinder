"""fix: enforce unique conversation constraint

Revision ID: f4eeda686102
Revises: 0001_profile_photo
Create Date: 2026-03-11 13:46:07.445589

"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "0002"
down_revision: Union[str, None] = "0001_profile_photo"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_check_constraint(
        "check_user1_less_than_user2",
        "conversation",
        "user1_id < user2_id",
    )


def downgrade() -> None:
    op.drop_constraint(
        "check_user1_less_than_user2",
        "conversation",
        type_="check",
    )
