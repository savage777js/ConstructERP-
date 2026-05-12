from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.core import EmployeeStatus

class EmployeeBase(BaseModel):
    first_name: str
    last_name: str
    rut: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    role: Optional[str] = None
    salary: int = 0
    hire_date: Optional[datetime] = None
    contract_end_date: Optional[datetime] = None
    status: EmployeeStatus = EmployeeStatus.ACTIVE
    user_id: Optional[int] = None
    project_id: Optional[int] = None

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

    class Config:
        from_attributes = True
