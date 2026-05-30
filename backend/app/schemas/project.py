from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.schemas.worker import EmployeeOut
from app.schemas.user import UserOut


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
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class ProjectAssignmentOut(BaseModel):
    id: int
    worker: EmployeeOut
    role: Optional[str] = None
    assigned_at: datetime
    unassigned_at: Optional[datetime] = None
    is_active: bool
    updated_at: datetime
    approved_by_manager: bool = False
    manager_notes: Optional[str] = None

    class Config:
        from_attributes = True

class ProjectLogOut(BaseModel):
    id: int
    project_id: int
    user_id: Optional[int] = None
    log_type: str
    content: str
    created_at: datetime
    user: Optional[UserOut] = None

    class Config:
        from_attributes = True

class ProjectLogCreate(BaseModel):
    content: str

class ProjectDetail(ProjectOut):
    assignments: List[ProjectAssignmentOut] = []
    logs: List[ProjectLogOut] = []
    
class WorkerAssignment(BaseModel):
    worker_id: int
    role: Optional[str] = "Worker"


