from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.core import NotificationType, NotificationPriority

class NotificationBase(BaseModel):
    type: NotificationType
    priority: NotificationPriority
    title: str
    message: str
    user_id: Optional[int] = None
    link: Optional[str] = None
    reference_id: Optional[int] = None

class NotificationUpdate(BaseModel):
    is_read: bool

class NotificationOut(NotificationBase):
    id: int
    is_read: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
