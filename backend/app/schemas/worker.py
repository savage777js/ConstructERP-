from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from app.models.core import EmployeeStatus
import enum

class WorkerRole(str, enum.Enum):
    """Cargos predefinidos para trabajadores de construcción"""
    JORNALERO = "JORNALERO"
    CAPATAZ = "CAPATAZ"
    ALBANIL = "ALBAÑIL"
    CARPINTERO = "CARPINTERO"
    ELECTRICISTA = "ELECTRICISTA"
    PLOMERO = "PLOMERO"
    SOLDADOR = "SOLDADOR"
    BODEGUERO = "BODEGUERO"
    ADMINISTRATIVO = "ADMINISTRATIVO"
    GUARDIA = "GUARDIA"
    OTRO = "OTRO"

class EmployeeBase(BaseModel):
    first_name: str
    last_name: str
    rut: Optional[str] = None
    age: Optional[int] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    role: Optional[str] = None  # Se acepta texto libre o usar WorkerRole Enum
    salary: int = Field(553553, ge=553553, description="Sueldo mínimo: $553.553")
    hire_date: Optional[datetime] = None
    contract_end_date: Optional[datetime] = None
    status: EmployeeStatus = EmployeeStatus.ACTIVE
    user_id: Optional[int] = None
    project_id: Optional[int] = None
    contract_type: Optional[str] = "INDEFINIDO"
    vacation_balance: Optional[float] = 15.0
    afp: Optional[str] = None
    health_system: Optional[str] = None
    colacion: Optional[int] = 0
    movilizacion: Optional[int] = 0
    bonos: Optional[int] = 0

class EmployeeCreate(EmployeeBase):
    pass

class EmployeeUpdate(EmployeeBase):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    rut: Optional[str] = None

class EmployeeOut(EmployeeBase):
    id: int
    hire_date: datetime
    updated_at: datetime
    active_project: Optional[str] = None

    class Config:
        from_attributes = True

class VacationRequestBase(BaseModel):
    employee_id: int
    start_date: datetime
    end_date: datetime
    days_requested: int

class VacationRequestCreate(VacationRequestBase):
    pass

class VacationRequestOut(VacationRequestBase):
    id: str
    status: str
    document_path: Optional[str] = None
    is_signed: bool = False
    approved_by: Optional[int] = None
    rebated_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    employee: Optional[EmployeeOut] = None

    class Config:
        from_attributes = True
