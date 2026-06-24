from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime

class AuditLogOut(BaseModel):
    id: str
    user_id: Optional[int] = None
    action: str
    table_name: str
    record_id: str
    old_values: Optional[Any] = None
    new_values: Optional[Any] = None
    created_at: datetime
    user_email: Optional[str] = None
    user_full_name: Optional[str] = None

    class Config:
        from_attributes = True
