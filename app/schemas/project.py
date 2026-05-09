from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.schemas.worker import EmployeeOut
from app.schemas.inventory import InventoryItemOut, MovementOut

class ProjectBase(BaseModel):
    name: str
    code: Optional[str] = None
    client_name: Optional[str] = None
    description: Optional[str] = None
    address: Optional[str] = None
    status: str = "ACTIVE"
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    observations: Optional[str] = None

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(ProjectBase):
    name: Optional[str] = None

class ProjectOut(ProjectBase):
    id: int
    
    class Config:
        from_attributes = True

class ProjectAssignmentOut(BaseModel):
    id: int
    worker: EmployeeOut
    role: Optional[str] = None
    assigned_at: datetime
    unassigned_at: Optional[datetime] = None
    is_active: bool

    class Config:
        from_attributes = True

class ProjectDetail(ProjectOut):
    assignments: List[ProjectAssignmentOut] = []
    movements: List[MovementOut] = []
    
class WorkerAssignment(BaseModel):
    worker_id: int
    role: Optional[str] = "Worker"

class InventoryAssignment(BaseModel):
    item_id: int
    quantity: int
    comment: Optional[str] = None
    force_critical: bool = False
