from sqlalchemy import Column, Integer, ForeignKey, DateTime, Text, Boolean, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base


class Message(Base):
    __tablename__ = "message"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(
        Integer, ForeignKey("conversation.id", ondelete="CASCADE"), nullable=False
    )
    sender_id = Column(
        Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False
    )
    contenido = Column(Text, nullable=False)
    fecha = Column(DateTime, server_default=func.now())
    leido = Column(Boolean, nullable=False, default=False)
    leido_at = Column(DateTime, nullable=True)

    conversation = relationship("Conversation", back_populates="messages")
    sender = relationship("User", back_populates="sent_messages")

    __table_args__ = (Index("idx_conversation_leido", "conversation_id", "leido"),)
