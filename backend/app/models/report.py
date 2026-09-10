from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base


class UserReport(Base):
    __tablename__ = "user_report"
    __table_args__ = (
        UniqueConstraint(
            "reporter_user_id",
            "reported_user_id",
            name="uq_user_report_reporter_target",
        ),
        Index("ix_user_report_reporter_user_id", "reporter_user_id"),
        Index("ix_user_report_reported_user_id", "reported_user_id"),
    )

    id = Column(Integer, primary_key=True, index=True)
    reporter_user_id = Column(
        Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False
    )
    reported_user_id = Column(
        Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False
    )
    reason = Column(String(50), nullable=False)
    detail = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    reporter = relationship(
        "User", foreign_keys=[reporter_user_id], back_populates="reports_given"
    )
    reported = relationship(
        "User", foreign_keys=[reported_user_id], back_populates="reports_received"
    )
