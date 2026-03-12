from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Index,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base


class ProfilePhoto(Base):
    __tablename__ = "profile_photo"

    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(
        Integer, ForeignKey("profile.id", ondelete="CASCADE"), nullable=False
    )
    photo_url = Column(String(500), nullable=False)
    order = Column(Integer, default=0)
    is_main = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())

    profile = relationship("Profile", back_populates="photos")

    __table_args__ = (
        Index("idx_profile_order", "profile_id", "order"),
        UniqueConstraint("profile_id", "order", name="unique_profile_photo_order"),
    )
