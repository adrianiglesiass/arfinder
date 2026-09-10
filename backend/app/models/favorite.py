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


class Favorite(Base):
    __tablename__ = "favorite"
    __table_args__ = (
        UniqueConstraint("user_id", "target_user_id", name="uq_favorite_user_target"),
        Index("ix_favorite_user_id", "user_id"),
        Index("ix_favorite_target_user_id", "target_user_id"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False)
    target_user_id = Column(
        Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False
    )
    created_at = Column(DateTime, server_default=func.now())

    user = relationship(
        "User", foreign_keys=[user_id], back_populates="favorites_given"
    )
    target_user = relationship(
        "User", foreign_keys=[target_user_id], back_populates="favorites_received"
    )
