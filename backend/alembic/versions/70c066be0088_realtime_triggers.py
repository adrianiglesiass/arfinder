"""realtime_triggers

Revision ID: 70c066be0088
Revises: fd88b8d3e737
Create Date: 2026-04-15 21:52:43.218767

"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "70c066be0088"
down_revision: Union[str, None] = "fd88b8d3e737"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Crear el esquema realtime y la función de mock para publicación
    op.execute("CREATE SCHEMA IF NOT EXISTS realtime;")
    op.execute("""
        CREATE TABLE IF NOT EXISTS realtime.channels (
            id SERIAL PRIMARY KEY,
            pattern TEXT UNIQUE NOT NULL,
            description TEXT,
            enabled BOOLEAN DEFAULT true
        );
    """)
    op.execute(
        "INSERT INTO realtime.channels (pattern, description) VALUES ('conversation:%', 'Mensajería de conversaciones') ON CONFLICT DO NOTHING;"
    )
    op.execute("""
        CREATE OR REPLACE FUNCTION realtime.publish(
            channel_name text,
            event_name text,
            payload jsonb
        ) RETURNS void AS $$
        BEGIN
            -- Emitir una notificación asíncrona que el backend capturará
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

    # 2. Función de trigger para nuevos mensajes
    op.execute("""
        CREATE OR REPLACE FUNCTION notify_new_message()
        RETURNS TRIGGER AS $$
        BEGIN
            PERFORM realtime.publish(
                'conversation:' || NEW.conversation_id::text,
                'new_message',
                jsonb_build_object(
                    'id', NEW.id,
                    'sender_id', NEW.sender_id,
                    'content', NEW.content,
                    'sent_at', NEW.sent_at
                )
            );
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)

    # 3. Función de trigger para estado de lectura (is_read cambiado a true)
    op.execute("""
        CREATE OR REPLACE FUNCTION notify_message_read()
        RETURNS TRIGGER AS $$
        BEGIN
            IF OLD.is_read IS DISTINCT FROM NEW.is_read AND NEW.is_read = true THEN
                PERFORM realtime.publish(
                    'conversation:' || NEW.conversation_id::text,
                    'message_read',
                    jsonb_build_object(
                        'id', NEW.id,
                        'read_at', NEW.read_at
                    )
                );
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)

    # 4. Asociar triggers a la tabla message
    op.execute("""
        CREATE TRIGGER trg_new_message
        AFTER INSERT ON message
        FOR EACH ROW EXECUTE FUNCTION notify_new_message();
    """)
    op.execute("""
        CREATE TRIGGER trg_message_read
        AFTER UPDATE ON message
        FOR EACH ROW EXECUTE FUNCTION notify_message_read();
    """)


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS trg_message_read ON message;")
    op.execute("DROP TRIGGER IF EXISTS trg_new_message ON message;")
    op.execute("DROP FUNCTION IF EXISTS notify_message_read();")
    op.execute("DROP FUNCTION IF EXISTS notify_new_message();")
    op.execute("DROP FUNCTION IF EXISTS realtime.publish(text, text, jsonb);")
    op.execute("DROP SCHEMA IF EXISTS realtime;")
