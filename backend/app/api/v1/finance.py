from typing import List, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api import deps
from app.schemas.finance import ExpenseOut, ExpenseCreate, InvoiceOut, InvoiceCreate
from app.models import core

router = APIRouter()

allow_write_finance = deps.RoleChecker([core.UserRole.ADMIN, core.UserRole.PROJECT_MANAGER, core.UserRole.INVENTORY_MANAGER])
allow_read_finance = deps.RoleChecker([core.UserRole.ADMIN, core.UserRole.PROJECT_MANAGER, core.UserRole.INVENTORY_MANAGER, core.UserRole.MANAGEMENT])

@router.get("/expenses", response_model=List[ExpenseOut], dependencies=[Depends(allow_read_finance)])
def read_expenses(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    project_id: int = None,
    current_user: core.User = Depends(deps.get_current_user),
) -> Any:
    query = db.query(core.Expense)
    if current_user.organization_id:
        query = query.filter(core.Expense.organization_id == current_user.organization_id)
    if project_id:
        query = query.filter(core.Expense.project_id == project_id)
    return query.offset(skip).limit(limit).all()

@router.post("/expenses", response_model=ExpenseOut, dependencies=[Depends(allow_write_finance)])
def create_expense(
    *,
    db: Session = Depends(deps.get_db),
    expense_in: ExpenseCreate,
    current_user: core.User = Depends(deps.get_current_user),
) -> Any:
    expense = core.Expense(
        **expense_in.dict(),
        created_by=current_user.id,
        organization_id=current_user.organization_id
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense

@router.get("/invoices", response_model=List[InvoiceOut], dependencies=[Depends(allow_read_finance)])
def read_invoices(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    project_id: int = None,
    current_user: core.User = Depends(deps.get_current_user),
) -> Any:
    query = db.query(core.Invoice)
    if current_user.organization_id:
        query = query.filter(core.Invoice.organization_id == current_user.organization_id)
    if project_id:
        query = query.filter(core.Invoice.project_id == project_id)
    return query.offset(skip).limit(limit).all()

@router.post("/invoices", response_model=InvoiceOut, dependencies=[Depends(allow_write_finance)])
def create_invoice(
    *,
    db: Session = Depends(deps.get_db),
    invoice_in: InvoiceCreate,
    current_user: core.User = Depends(deps.get_current_user),
) -> Any:
    invoice = core.Invoice(
        **invoice_in.dict(),
        organization_id=current_user.organization_id
    )
    db.add(invoice)
    db.commit()
    db.refresh(invoice)
    return invoice

@router.patch("/invoices/{invoice_id}/status", response_model=InvoiceOut, dependencies=[Depends(allow_write_finance)])
def update_invoice_status(
    invoice_id: str,
    status_in: str,
    db: Session = Depends(deps.get_db),
    current_user: core.User = Depends(deps.get_current_user),
) -> Any:
    query = db.query(core.Invoice).filter(core.Invoice.id == invoice_id)
    if current_user.organization_id:
        query = query.filter(core.Invoice.organization_id == current_user.organization_id)
    invoice = query.first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Factura no encontrada o no pertenece a su organización")
    invoice.status = status_in
    db.commit()
    db.refresh(invoice)
    return invoice

@router.patch("/expenses/{expense_id}/status", response_model=ExpenseOut, dependencies=[Depends(allow_write_finance)])
def update_expense_status(
    expense_id: str,
    is_paid: bool,
    db: Session = Depends(deps.get_db),
    current_user: core.User = Depends(deps.get_current_user),
) -> Any:
    query = db.query(core.Expense).filter(core.Expense.id == expense_id)
    if current_user.organization_id:
        query = query.filter(core.Expense.organization_id == current_user.organization_id)
    expense = query.first()
    if not expense:
        raise HTTPException(status_code=404, detail="Gasto no encontrado o no pertenece a su organización")
    expense.is_paid = is_paid
    db.commit()
    db.refresh(expense)
    return expense
