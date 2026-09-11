"""realtime_notify_size_guard

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-09-11 20:30:00.000000

"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        CREATE OR REPLACE FUNCTION realtime.publish(
            channel_name text,
            event_name text,
            payload jsonb
        ) RETURNS void AS $$
        DECLARE
            message text;
        BEGIN
            message := jsonb_build_object(
                'channel', channel_name,
                'event', event_name,
                'payload', payload
            )::text;
            IF octet_length(message) > 7900 AND payload ? 'content' THEN
                message := jsonb_build_object(
                    'channel', channel_name,
                    'event', event_name,
                    'payload', (payload - 'content')
                        || jsonb_build_object('content_omitted', true)
                )::text;
            END IF;
            PERFORM pg_notify('insforge_realtime', message);
        END;
        $$ LANGUAGE plpgsql;
    """)


def downgrade() -> None:
    op.execute("""
        CREATE OR REPLACE FUNCTION realtime.publish(
            channel_name text,
            event_name text,
            payload jsonb
        ) RETURNS void AS $$
        BEGIN
            PERFORM pg_notify(
                'insforge_realtime',
                jsonb_build_object(
                    'channel', channel_name,
                    'event', event_name,
                    'payload', payload
                )::text
            );
        END;
        $$ LANGUAGE plpgsql;
    """)
