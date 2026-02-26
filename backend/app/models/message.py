from sqlalchemy import Column, Integer, ForeignKey, DateTime, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


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
    leido = Column(Boolean, default=False)

    conversation = relationship("Conversation", back_populates="messages")
    sender = relationship("User", back_populates="sent_messages")
