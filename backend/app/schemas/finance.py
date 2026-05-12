from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from decimal import Decimal

class ExpenseBase(BaseModel):
    project_id: int
    category: Optional[str] = None
    description: Optional[str] = None
    amount: Decimal
    expense_date: Optional[datetime] = None

class ExpenseCreate(ExpenseBase):
    pass

class ExpenseUpdate(ExpenseBase):
    project_id: Optional[int] = None
    amount: Optional[Decimal] = None

class ExpenseOut(ExpenseBase):
    id: str
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class InvoiceBase(BaseModel):
    project_id: Optional[int] = None
    client_name: str
    total_amount: Decimal
    status: str = "DRAFT"
    issue_date: Optional[datetime] = None
    due_date: Optional[datetime] = None

class InvoiceCreate(InvoiceBase):
    pass

class InvoiceUpdate(InvoiceBase):
    client_name: Optional[str] = None
    total_amount: Optional[Decimal] = None

class InvoiceOut(InvoiceBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
