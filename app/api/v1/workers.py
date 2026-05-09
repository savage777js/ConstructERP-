from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.models.core import Employee, UserRole, ProjectAssignment
from app.schemas.worker import EmployeeCreate, EmployeeOut, EmployeeUpdate
from app.utils.rut import validate_rut, format_rut
from app.services.pdf_service import ContractService
from app.api.deps import get_current_user, RoleChecker

router = APIRouter()

# Dependencias de rol
allow_manage_hr = RoleChecker([UserRole.ADMIN, UserRole.HR_MANAGER])
allow_read_hr = RoleChecker([UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.PROJECT_MANAGER, UserRole.MANAGEMENT])

@router.get("/{worker_id}/contract", dependencies=[Depends(allow_manage_hr)])
def get_worker_contract(worker_id: int, db: Session = Depends(get_db)):
    worker = db.query(Employee).filter(Employee.id == worker_id).first()
    if not worker:
        raise HTTPException(status_code=404, detail="Trabajador no encontrado")
    
    # Preparamos los datos para el servicio de PDF
    worker_data = {
        "first_name": worker.first_name,
        "last_name": worker.last_name,
        "rut": worker.rut,
        "role": worker.role,
        "salary": worker.salary,
        "hire_date": worker.hire_date
    }
    
    pdf_content = ContractService.generate_worker_contract(worker_data)
    
    return Response(
        content=pdf_content,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=contrato_{worker.rut}.pdf"
        }
    )

@router.get("/", response_model=List[EmployeeOut], dependencies=[Depends(allow_read_hr)])
def read_workers(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    workers = db.query(Employee).offset(skip).limit(limit).all()
    return workers

@router.post("/", response_model=EmployeeOut, dependencies=[Depends(allow_manage_hr)])
def create_worker(worker_in: EmployeeCreate, db: Session = Depends(get_db)):
    if not validate_rut(worker_in.rut):
        raise HTTPException(status_code=400, detail="RUT inválido")
    
    worker_in.rut = format_rut(worker_in.rut)
    
    db_worker = db.query(Employee).filter(Employee.rut == worker_in.rut).first()
    if db_worker:
        raise HTTPException(status_code=400, detail="El trabajador ya está registrado")
    
    new_worker = Employee(**worker_in.model_dump())
    db.add(new_worker)
    db.commit()
    db.refresh(new_worker)
    return new_worker

@router.get("/{worker_id}", response_model=EmployeeOut, dependencies=[Depends(allow_read_hr)])
def read_worker(worker_id: int, db: Session = Depends(get_db)):
    worker = db.query(Employee).filter(Employee.id == worker_id).first()
    if not worker:
        raise HTTPException(status_code=404, detail="Trabajador no encontrado")
    return worker

@router.put("/{worker_id}", response_model=EmployeeOut, dependencies=[Depends(allow_manage_hr)])
def update_worker(worker_id: int, worker_in: EmployeeUpdate, db: Session = Depends(get_db)):
    db_worker = db.query(Employee).filter(Employee.id == worker_id).first()
    if not db_worker:
        raise HTTPException(status_code=404, detail="Trabajador no encontrado")
    
    update_data = worker_in.model_dump(exclude_unset=True)
    
    if "rut" in update_data:
        if not validate_rut(update_data["rut"]):
            raise HTTPException(status_code=400, detail="RUT inválido")
        update_data["rut"] = format_rut(update_data["rut"])
    
    for field, value in update_data.items():
        setattr(db_worker, field, value)
    
    db.commit()
    db.refresh(db_worker)
    return db_worker

@router.delete("/{worker_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(allow_manage_hr)])
def delete_worker(worker_id: int, force: bool = False, db: Session = Depends(get_db)):
    db_worker = db.query(Employee).filter(Employee.id == worker_id).first()
    if not db_worker:
        raise HTTPException(status_code=404, detail="Trabajador no encontrado")
        
    # Verificar si tiene asignaciones activas
    active_assignments = db.query(ProjectAssignment).filter(
        ProjectAssignment.worker_id == worker_id,
        ProjectAssignment.is_active == True
    ).all()
    
    if len(active_assignments) > 0 and not force:
        projects_list = [a.project.name for a in active_assignments]
        raise HTTPException(
            status_code=409,
            detail={
                "code": "ACTIVE_ASSIGNMENTS_WARNING",
                "message": f"El trabajador está asignado a obras activas: {', '.join(projects_list)}.",
                "count": len(active_assignments)
            }
        )
    
    # Liberar asignaciones
    from datetime import datetime
    for assignment in active_assignments:
        assignment.is_active = False
        assignment.unassigned_at = datetime.utcnow()
    
    # Desactivación lógica en lugar de borrado físico
    db_worker.status = "INACTIVE"
    db.commit()
    return None
