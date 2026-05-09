from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class InventoryItemBase(BaseModel):
    name: str
    sku: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    unit: str = "un"
    quantity_total: int = 0
    quantity_available: int = 0
    min_stock: int = 0
    location: Optional[str] = None
    status: str = "ACTIVE"

class InventoryItemCreate(InventoryItemBase):
    pass

class InventoryItemUpdate(InventoryItemBase):
    name: Optional[str] = None
    unit: Optional[str] = None

class InventoryItemOut(InventoryItemBase):
    id: int

    class Config:
        from_attributes = True

class MovementBase(BaseModel):
    item_id: int
    project_id: Optional[int] = None
    type: str # IN, OUT, ASSIGN, RETURN
    quantity: int
    comment: Optional[str] = None

class MovementOut(MovementBase):
    id: int
    date: datetime

    class Config:
        from_attributes = True
