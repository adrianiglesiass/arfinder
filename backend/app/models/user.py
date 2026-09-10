from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base


class User(Base):
    __tablename__ = "user"

    id = Column(Integer, primary_key=True, index=True)
    insforge_id = Column(String(255), unique=True, nullable=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    profile = relationship(
        "Profile", back_populates="user", uselist=False, passive_deletes=True
    )
    sent_messages = relationship(
        "Message", back_populates="sender", passive_deletes=True
    )
    conversations_as_user1 = relationship(
        "Conversation",
        foreign_keys="Conversation.user1_id",
        back_populates="user1",
        passive_deletes=True,
    )
    conversations_as_user2 = relationship(
        "Conversation",
        foreign_keys="Conversation.user2_id",
        back_populates="user2",
        passive_deletes=True,
    )
    favorites_given = relationship(
        "Favorite",
        foreign_keys="Favorite.user_id",
        back_populates="user",
        passive_deletes=True,
    )
    favorites_received = relationship(
        "Favorite",
        foreign_keys="Favorite.target_user_id",
        back_populates="target_user",
        passive_deletes=True,
    )
    blocks_given = relationship(
        "UserBlock",
        foreign_keys="UserBlock.blocker_user_id",
        back_populates="blocker",
        passive_deletes=True,
    )
    blocks_received = relationship(
        "UserBlock",
        foreign_keys="UserBlock.blocked_user_id",
        back_populates="blocked",
        passive_deletes=True,
    )
    reports_given = relationship(
        "UserReport",
        foreign_keys="UserReport.reporter_user_id",
        back_populates="reporter",
        passive_deletes=True,
    )
    reports_received = relationship(
        "UserReport",
        foreign_keys="UserReport.reported_user_id",
        back_populates="reported",
        passive_deletes=True,
    )
