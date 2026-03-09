"""add profile_photo table and remove foto_url from profile

Revision ID: 0001_add_profile_photo_and_remove_foto_url
Revises: 
Create Date: 2026-03-03 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0001_add_profile_photo_and_remove_foto_url'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # create profile_photo table
    op.create_table(
        'profile_photo',
        sa.Column('id', sa.Integer(), primary_key=True, nullable=False),
        sa.Column('profile_id', sa.Integer(), sa.ForeignKey(
            'profile.id', ondelete='CASCADE'), nullable=False),
        sa.Column('foto_url', sa.String(length=500), nullable=False),
        sa.Column('order', sa.Integer(), nullable=True,
                  server_default=sa.text('0')),
        sa.Column('is_main', sa.Boolean(), nullable=True,
                  server_default=sa.text('0')),
        sa.Column('created_at', sa.DateTime(),
                  server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('idx_profile_order', 'profile_photo',
                    ['profile_id', 'order'])

    # drop foto_url column from profile if exists
    try:
        op.drop_column('profile', 'foto_url')
    except Exception:
        # Column may not exist in some deployments; ignore
        pass


def downgrade() -> None:
    # add foto_url column back to profile
    try:
        op.add_column('profile', sa.Column(
            'foto_url', sa.String(length=500), nullable=True))
    except Exception:
        pass

    op.drop_index('idx_profile_order', table_name='profile_photo')
    op.drop_table('profile_photo')
