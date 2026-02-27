from sqlalchemy import Column, Integer, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Conversation(Base):
    __tablename__ = "conversation"

    id = Column(Integer, primary_key=True, index=True)
    user1_id = Column(
        Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False
    )
    user2_id = Column(
        Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False
    )
    created_at = Column(DateTime, server_default=func.now())

    __table_args__ = (
        UniqueConstraint("user1_id", "user2_id", name="unique_conversation"),
    )

    user1 = relationship(
        "User", foreign_keys=[user1_id], back_populates="conversations_as_user1"
    )
    user2 = relationship(
        "User", foreign_keys=[user2_id], back_populates="conversations_as_user2"
    )
    messages = relationship("Message", back_populates="conversation")
