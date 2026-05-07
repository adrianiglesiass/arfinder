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

    content = Column(Text, nullable=False)
    sent_at = Column(DateTime, server_default=func.now())
    is_read = Column(Boolean, nullable=False, default=False)
    read_at = Column(DateTime, nullable=True)

    conversation = relationship("Conversation", back_populates="messages")
    sender = relationship("User", back_populates="sent_messages")

    __table_args__ = (Index("idx_conversation_is_read", "conversation_id", "is_read"),)
