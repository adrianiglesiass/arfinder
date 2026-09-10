from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base


class UserBlock(Base):
    __tablename__ = "user_block"
    __table_args__ = (
        UniqueConstraint(
            "blocker_user_id", "blocked_user_id", name="uq_user_block_blocker_target"
        ),
        Index("ix_user_block_blocker_user_id", "blocker_user_id"),
        Index("ix_user_block_blocked_user_id", "blocked_user_id"),
    )

    id = Column(Integer, primary_key=True, index=True)
    blocker_user_id = Column(
        Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False
    )
    blocked_user_id = Column(
        Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False
    )
    created_at = Column(DateTime, server_default=func.now())

    blocker = relationship(
        "User", foreign_keys=[blocker_user_id], back_populates="blocks_given"
    )
    blocked = relationship(
        "User", foreign_keys=[blocked_user_id], back_populates="blocks_received"
    )
