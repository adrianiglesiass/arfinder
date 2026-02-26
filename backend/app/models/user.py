from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class User(Base):
    __tablename__ = "user"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    profile = relationship("Profile", back_populates="user", uselist=False)
    sent_messages = relationship("Message", back_populates="sender")
    conversations_as_user1 = relationship(
        "Conversation", foreign_keys="Conversation.user1_id", back_populates="user1")
    conversations_as_user2 = relationship(
        "Conversation", foreign_keys="Conversation.user2_id", back_populates="user2")
