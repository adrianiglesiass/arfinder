from sqlalchemy import Column, Integer, String, Boolean, Date, Text, Enum, ForeignKey
from sqlalchemy.orm import relationship
from app.db.database import Base
import enum


class ScheduleEnum(str, enum.Enum):
    morning = "morning"
    afternoon = "afternoon"
    night = "night"
    flexible = "flexible"


class TypeEnum(str, enum.Enum):
    looking_for_flat = "looking_for_flat"
    looking_for_roommate = "looking_for_roommate"


class Profile(Base):
    __tablename__ = "profile"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer, ForeignKey("user.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    name = Column(String(100), nullable=False)
    age = Column(Integer, nullable=False, index=True)
    city = Column(String(100), nullable=False, index=True)
    bio = Column(Text)
    max_budget = Column(Integer, index=True)
    has_pets = Column(Boolean, nullable=False, default=False, index=True)
    is_smoker = Column(Boolean, nullable=False, default=False, index=True)
    schedule = Column(Enum(ScheduleEnum), default=ScheduleEnum.flexible, index=True)
    gender = Column(String(50), index=True)
    available_from = Column(Date)
    type = Column(Enum(TypeEnum), nullable=False, index=True)
    room_description = Column(Text, nullable=True)

    user = relationship("User", back_populates="profile")
    photos = relationship(
        "ProfilePhoto", back_populates="profile", cascade="all, delete-orphan"
    )
