from sqlalchemy import Column, Integer, String, Boolean, Date, Text, Enum, ForeignKey
from sqlalchemy.orm import relationship
from app.db.database import Base
import enum


class HorarioEnum(str, enum.Enum):
    manana = "manana"
    tarde = "tarde"
    noche = "noche"
    flexible = "flexible"


class TipoEnum(str, enum.Enum):
    busco_piso = "busco_piso"
    busco_companero = "busco_companero"


class Profile(Base):
    __tablename__ = "profile"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer, ForeignKey("user.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    nombre = Column(String(100), nullable=False)
    edad = Column(Integer, nullable=False)
    ciudad = Column(String(100), nullable=False, index=True)
    bio = Column(Text)
    presupuesto_max = Column(Integer)
    mascotas = Column(Boolean, default=False)
    fumador = Column(Boolean, default=False)
    horario = Column(Enum(HorarioEnum), default=HorarioEnum.flexible)
    genero = Column(String(50))
    disponibilidad_desde = Column(Date)
    tipo = Column(Enum(TipoEnum), nullable=False)
    descripcion_habitacion = Column(Text, nullable=True)

    user = relationship("User", back_populates="profile")
    photos = relationship(
        "ProfilePhoto", back_populates="profile", cascade="all, delete-orphan"
    )
