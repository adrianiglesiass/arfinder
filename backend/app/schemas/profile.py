from pydantic import BaseModel, ConfigDict
from typing import Optional, ClassVar
from datetime import date
from enum import Enum


class HorarioEnum(str, Enum):
    manana = "manana"
    tarde = "tarde"
    noche = "noche"
    flexible = "flexible"


class TipoEnum(str, Enum):
    busco_piso = "busco_piso"
    busco_companero = "busco_companero"


class ProfileCreate(BaseModel):
    nombre: str
    edad: int
    ciudad: str
    bio: Optional[str] = None
    presupuesto_max: Optional[int] = None
    mascotas: bool = False
    fumador: bool = False
    horario: Optional[HorarioEnum] = None
    genero: Optional[str] = None
    disponibilidad_desde: Optional[date] = None
    tipo: TipoEnum
    descripcion_habitacion: Optional[str] = None


class ProfileUpdate(BaseModel):
    nombre: Optional[str] = None
    edad: Optional[int] = None
    ciudad: Optional[str] = None
    bio: Optional[str] = None
    presupuesto_max: Optional[int] = None
    mascotas: Optional[bool] = None
    fumador: Optional[bool] = None
    horario: Optional[HorarioEnum] = None
    genero: Optional[str] = None
    disponibilidad_desde: Optional[date] = None
    tipo: Optional[TipoEnum] = None
    descripcion_habitacion: Optional[str] = None


class ProfileResponse(BaseModel):
    id: int
    user_id: int
    nombre: str
    edad: int
    ciudad: str
    bio: Optional[str] = None
    presupuesto_max: Optional[int] = None
    mascotas: bool
    fumador: bool
    horario: Optional[HorarioEnum] = None
    genero: Optional[str] = None
    disponibilidad_desde: Optional[date] = None
    foto_url: Optional[str] = None
    tipo: TipoEnum
    descripcion_habitacion: Optional[str] = None

    ConfigDict: ClassVar = ConfigDict(from_attributes=True)
