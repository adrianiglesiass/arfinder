"""create base tables

Revision ID: 0000_create_base_tables
Revises:
Create Date: 2026-03-03 00:00:00.000000
"""

import sqlalchemy as sa
from alembic import op

revision = "0000_base"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "user",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("email", sa.String(255), unique=True, nullable=False, index=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP")
        ),
    )

    op.create_table(
        "profile",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("user.id", ondelete="CASCADE"),
            unique=True,
            nullable=False,
        ),
        sa.Column("nombre", sa.String(100), nullable=False),
        sa.Column("edad", sa.Integer(), nullable=False),
        sa.Column("ciudad", sa.String(100), nullable=False, index=True),
        sa.Column("bio", sa.Text(), nullable=True),
        sa.Column("presupuesto_max", sa.Integer(), nullable=True),
        sa.Column("mascotas", sa.Boolean(), default=False),
        sa.Column("fumador", sa.Boolean(), default=False),
        sa.Column(
            "horario",
            sa.Enum("manana", "tarde", "noche", "flexible", name="horarioenum"),
            default="flexible",
        ),
        sa.Column("genero", sa.String(50), nullable=True),
        sa.Column("disponibilidad_desde", sa.Date(), nullable=True),
        sa.Column(
            "tipo",
            sa.Enum("busco_piso", "busco_companero", name="tipoenum"),
            nullable=False,
        ),
        sa.Column("descripcion_habitacion", sa.Text(), nullable=True),
    )

    op.create_table(
        "conversation",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column(
            "user1_id",
            sa.Integer(),
            sa.ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user2_id",
            sa.Integer(),
            sa.ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP")
        ),
        sa.UniqueConstraint("user1_id", "user2_id", name="unique_conversation"),
    )

    op.create_table(
        "message",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column(
            "conversation_id",
            sa.Integer(),
            sa.ForeignKey("conversation.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "sender_id",
            sa.Integer(),
            sa.ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("contenido", sa.Text(), nullable=False),
        sa.Column("fecha", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("leido", sa.Boolean(), default=False),
    )


def downgrade() -> None:
    op.drop_table("message")
    op.drop_table("conversation")
    op.drop_table("profile")
    op.drop_table("user")
