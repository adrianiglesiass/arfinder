"""chore: normalize column names to english

Revision ID: 3374bd140c17
Revises: 0005
Create Date: 2026-03-12 16:20:58.206528

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0006"
down_revision: Union[str, None] = "0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # profile
    op.alter_column(
        "profile",
        "nombre",
        new_column_name="name",
        existing_type=sa.String(100),
        nullable=False,
    )
    op.alter_column(
        "profile",
        "edad",
        new_column_name="age",
        existing_type=sa.Integer(),
        nullable=False,
    )
    op.alter_column(
        "profile",
        "ciudad",
        new_column_name="city",
        existing_type=sa.String(100),
        nullable=False,
    )
    op.alter_column(
        "profile",
        "presupuesto_max",
        new_column_name="max_budget",
        existing_type=sa.Integer(),
    )
    op.alter_column(
        "profile",
        "mascotas",
        new_column_name="has_pets",
        existing_type=sa.Boolean(),
        nullable=False,
    )
    op.alter_column(
        "profile",
        "fumador",
        new_column_name="is_smoker",
        existing_type=sa.Boolean(),
        nullable=False,
    )
    op.alter_column(
        "profile", "genero", new_column_name="gender", existing_type=sa.String(50)
    )
    op.alter_column(
        "profile",
        "disponibilidad_desde",
        new_column_name="available_from",
        existing_type=sa.Date(),
    )
    op.alter_column(
        "profile",
        "descripcion_habitacion",
        new_column_name="room_description",
        existing_type=sa.Text(),
    )
    op.alter_column(
        "profile",
        "horario",
        new_column_name="schedule",
        existing_type=sa.Enum(
            "manana", "tarde", "noche", "flexible", name="horarioenum"
        ),
        type_=sa.Enum("morning", "afternoon", "night", "flexible", name="horarioenum"),
    )
    op.alter_column(
        "profile",
        "tipo",
        new_column_name="type",
        existing_type=sa.Enum("busco_piso", "busco_companero", name="tipoenum"),
        type_=sa.Enum("looking_for_flat", "looking_for_roommate", name="tipoenum"),
    )

    # profile_photo
    op.alter_column(
        "profile_photo",
        "foto_url",
        new_column_name="photo_url",
        existing_type=sa.String(500),
        nullable=False,
    )


def downgrade() -> None:
    # profile_photo
    op.alter_column(
        "profile_photo",
        "photo_url",
        new_column_name="foto_url",
        existing_type=sa.String(500),
        nullable=False,
    )

    # profile
    op.alter_column(
        "profile",
        "type",
        new_column_name="tipo",
        existing_type=sa.Enum(
            "looking_for_flat", "looking_for_roommate", name="tipoenum"
        ),
        type_=sa.Enum("busco_piso", "busco_companero", name="tipoenum"),
    )
    op.alter_column(
        "profile",
        "schedule",
        new_column_name="horario",
        existing_type=sa.Enum(
            "morning", "afternoon", "night", "flexible", name="horarioenum"
        ),
        type_=sa.Enum("manana", "tarde", "noche", "flexible", name="horarioenum"),
    )
    op.alter_column(
        "profile",
        "room_description",
        new_column_name="descripcion_habitacion",
        existing_type=sa.Text(),
    )
    op.alter_column(
        "profile",
        "available_from",
        new_column_name="disponibilidad_desde",
        existing_type=sa.Date(),
    )
    op.alter_column(
        "profile", "gender", new_column_name="genero", existing_type=sa.String(50)
    )
    op.alter_column(
        "profile",
        "is_smoker",
        new_column_name="fumador",
        existing_type=sa.Boolean(),
        nullable=False,
    )
    op.alter_column(
        "profile",
        "has_pets",
        new_column_name="mascotas",
        existing_type=sa.Boolean(),
        nullable=False,
    )
    op.alter_column(
        "profile",
        "max_budget",
        new_column_name="presupuesto_max",
        existing_type=sa.Integer(),
    )
    op.alter_column(
        "profile",
        "city",
        new_column_name="ciudad",
        existing_type=sa.String(100),
        nullable=False,
    )
    op.alter_column(
        "profile",
        "age",
        new_column_name="edad",
        existing_type=sa.Integer(),
        nullable=False,
    )
    op.alter_column(
        "profile",
        "name",
        new_column_name="nombre",
        existing_type=sa.String(100),
        nullable=False,
    )
