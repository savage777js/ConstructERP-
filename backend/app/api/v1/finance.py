from typing import List, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api import deps
from app.schemas.finance import ExpenseOut, ExpenseCreate, InvoiceOut, InvoiceCreate
from app.models import core

router = APIRouter()

@router.get("/expenses", response_model=List[ExpenseOut])
def read_expenses(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    project_id: int = None,
    current_user: core.User = Depends(deps.get_current_user),
) -> Any:
    query = db.query(core.Expense)
    if project_id:
        query = query.filter(core.Expense.project_id == project_id)
    return query.offset(skip).limit(limit).all()

@router.post("/expenses", response_model=ExpenseOut)
def create_expense(
    *,
    db: Session = Depends(deps.get_db),
    expense_in: ExpenseCreate,
    current_user: core.User = Depends(deps.get_current_user),
) -> Any:
    expense = core.Expense(
        **expense_in.dict(),
        created_by=current_user.id
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense

@router.get("/invoices", response_model=List[InvoiceOut])
def read_invoices(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    project_id: int = None,
    current_user: core.User = Depends(deps.get_current_user),
) -> Any:
    query = db.query(core.Invoice)
    if project_id:
        query = query.filter(core.Invoice.project_id == project_id)
    return query.offset(skip).limit(limit).all()

@router.post("/invoices", response_model=InvoiceOut)
def create_invoice(
    *,
    db: Session = Depends(deps.get_db),
    invoice_in: InvoiceCreate,
    current_user: core.User = Depends(deps.get_current_user),
) -> Any:
    invoice = core.Invoice(**invoice_in.dict())
    db.add(invoice)
    db.commit()
    db.refresh(invoice)
    return invoice
