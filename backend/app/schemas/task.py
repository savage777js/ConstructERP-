from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class TaskBase(BaseModel):
    project_id: int
    assigned_to: Optional[int] = None
    title: str
    description: Optional[str] = None
    status: str = "PENDING"
    priority: str = "MEDIUM"
    due_date: Optional[datetime] = None

class TaskCreate(TaskBase):
    pass

class TaskUpdate(TaskBase):
    project_id: Optional[int] = None
    title: Optional[str] = None

class TaskCommentBase(BaseModel):
    task_id: str
    comment: str

class TaskCommentCreate(TaskCommentBase):
    pass

class TaskCommentOut(TaskCommentBase):
    id: str
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class TaskOut(TaskBase):
    id: str
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class TaskDetail(TaskOut):
    comments: List[TaskCommentOut] = []
