"""profile_search_indexes

Revision ID: 3c8f2a4b9e10
Revises: 70c066be0088
Create Date: 2026-05-06 12:00:00.000000

"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "3c8f2a4b9e10"
down_revision: Union[str, None] = "70c066be0088"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


INDEXES = [
    ("ix_profile_age", "age"),
    ("ix_profile_max_budget", "max_budget"),
    ("ix_profile_has_pets", "has_pets"),
    ("ix_profile_is_smoker", "is_smoker"),
    ("ix_profile_schedule", "schedule"),
    ("ix_profile_gender", "gender"),
    ("ix_profile_type", "type"),
]


def upgrade() -> None:
    for name, column in INDEXES:
        op.create_index(name, "profile", [column])


def downgrade() -> None:
    for name, _ in reversed(INDEXES):
        op.drop_index(name, table_name="profile")
