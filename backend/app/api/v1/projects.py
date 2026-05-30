from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from app.db.session import get_db
from app.schemas.project import ProjectCreate, ProjectOut, ProjectUpdate, ProjectDetail, WorkerAssignment, ProjectLogOut, ProjectLogCreate
from app.services.project_service import ProjectService

from app.models.core import UserRole
from app.api.deps import RoleChecker, get_current_user, RoleChecker as role_checker_type

router = APIRouter()

# Dependencias de rol
allow_manage_proj = RoleChecker([UserRole.ADMIN, UserRole.PROJECT_MANAGER])
allow_read_proj = RoleChecker([UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.MANAGEMENT, UserRole.HR_MANAGER, UserRole.INVENTORY_MANAGER])
allow_assign_worker = RoleChecker([UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.HR_MANAGER])

@router.get("/", response_model=List[ProjectOut], dependencies=[Depends(allow_read_proj)])
def list_projects(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return ProjectService.list_projects(db, skip, limit)

@router.post("/", response_model=ProjectOut, dependencies=[Depends(allow_manage_proj)])
def create_project(project_in: ProjectCreate, db: Session = Depends(get_db)):
    return ProjectService.create_project(db, project_in)

@router.get("/{project_id}", response_model=ProjectDetail, dependencies=[Depends(allow_read_proj)])
def get_project(project_id: int, db: Session = Depends(get_db)):
    return ProjectService.get_project(db, project_id)

@router.put("/{project_id}", response_model=ProjectOut, dependencies=[Depends(allow_manage_proj)])
def update_project(
    project_id: int, 
    project_in: ProjectUpdate, 
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return ProjectService.update_project(db, project_id, project_in, current_user.id)

@router.post("/{project_id}/assign-worker", dependencies=[Depends(allow_assign_worker)])
def assign_worker(
    project_id: int, 
    assignment: WorkerAssignment, 
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return ProjectService.assign_worker(db, project_id, assignment, current_user.id)

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(allow_manage_proj)])
def delete_project(
    project_id: int, 
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    ProjectService.delete_project(db, project_id, current_user.id)
    return None

@router.post("/{project_id}/logs", response_model=ProjectLogOut, dependencies=[Depends(allow_read_proj)])
def create_project_log(
    project_id: int,
    log_in: ProjectLogCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return ProjectService.create_project_log(db, project_id, log_in.content, current_user.id, "NOTE")

@router.patch("/{project_id}/assignments/{assignment_id}/approve")
def approve_worker_assignment(
    project_id: int,
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Solo ADMIN o MANAGEMENT pueden dar visto bueno
    if current_user.role not in [UserRole.ADMIN, UserRole.MANAGEMENT]:
         raise HTTPException(status_code=403, detail="No tiene permisos para dar visto bueno")
    return ProjectService.approve_assignment(db, project_id, assignment_id, current_user.id)

class AssignmentNotesInput(BaseModel):
    notes: str

@router.patch("/{project_id}/assignments/{assignment_id}/notes")
def update_worker_assignment_notes(
    project_id: int,
    assignment_id: int,
    notes_in: AssignmentNotesInput,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Solo ADMIN o MANAGEMENT pueden editar notas de asignación
    if current_user.role not in [UserRole.ADMIN, UserRole.MANAGEMENT]:
         raise HTTPException(status_code=403, detail="No tiene permisos para modificar notas de gerencia")
    return ProjectService.update_assignment_notes(db, project_id, assignment_id, notes_in.notes, current_user.id)
