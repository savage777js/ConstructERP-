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

# Dependencias de rol — MANAGEMENT (Gerente General) es solo lectura
allow_manage_proj = RoleChecker([UserRole.PROJECT_MANAGER])
allow_read_proj = RoleChecker([UserRole.PROJECT_MANAGER, UserRole.MANAGEMENT, UserRole.HR_MANAGER])
allow_assign_worker = RoleChecker([UserRole.PROJECT_MANAGER])

@router.get("/", response_model=List[ProjectOut], dependencies=[Depends(allow_read_proj)])
def list_projects(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return ProjectService.list_projects(db, skip, limit, current_user.organization_id)

@router.post("/", response_model=ProjectOut, dependencies=[Depends(allow_manage_proj)])
def create_project(
    project_in: ProjectCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return ProjectService.create_project(db, project_in, current_user.id, current_user.organization_id)

@router.get("/{project_id}", response_model=ProjectDetail, dependencies=[Depends(allow_read_proj)])
def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return ProjectService.get_project(db, project_id, current_user.organization_id)

@router.put("/{project_id}", response_model=ProjectOut, dependencies=[Depends(allow_manage_proj)])
def update_project(
    project_id: int, 
    project_in: ProjectUpdate, 
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return ProjectService.update_project(db, project_id, project_in, current_user.id, current_user.organization_id)

@router.post("/{project_id}/assign-worker", dependencies=[Depends(allow_assign_worker)])
def assign_worker(
    project_id: int, 
    assignment: WorkerAssignment, 
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return ProjectService.assign_worker(db, project_id, assignment, current_user.id, current_user.organization_id)

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(allow_manage_proj)])
def delete_project(
    project_id: int, 
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    ProjectService.delete_project(db, project_id, current_user.id, current_user.organization_id)
    return None

@router.post("/{project_id}/logs", response_model=ProjectLogOut, dependencies=[Depends(allow_read_proj)])
def create_project_log(
    project_id: int,
    log_in: ProjectLogCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return ProjectService.create_project_log(db, project_id, log_in.content, current_user.id, "NOTE", current_user.organization_id)

@router.patch("/{project_id}/assignments/{assignment_id}/approve")
def approve_worker_assignment(
    project_id: int,
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Solo ADMIN, SUPER_ADMIN o MANAGEMENT pueden dar visto bueno
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT, UserRole.PROJECT_MANAGER]:
         raise HTTPException(status_code=403, detail="No tiene permisos para dar visto bueno")
    return ProjectService.approve_assignment(db, project_id, assignment_id, current_user.id, current_user.organization_id)

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
    # Solo ADMIN, SUPER_ADMIN o MANAGEMENT pueden editar notas de asignación
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT, UserRole.PROJECT_MANAGER]:
         raise HTTPException(status_code=403, detail="No tiene permisos para modificar notas de gerencia")
    return ProjectService.update_assignment_notes(db, project_id, assignment_id, notes_in.notes, current_user.id, current_user.organization_id)

@router.post("/{project_id}/unassign-worker/{worker_id}", dependencies=[Depends(allow_assign_worker)])
def unassign_worker(
    project_id: int,
    worker_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return ProjectService.unassign_worker(db, project_id, worker_id, current_user.id, current_user.organization_id)

class MiniBudgetInput(BaseModel):
    description: str
    amount: float

@router.post("/{project_id}/mini-budgets", dependencies=[Depends(allow_manage_proj)])
def add_mini_budget(
    project_id: int,
    mini_in: MiniBudgetInput,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Validar pertenencia del proyecto
    ProjectService.get_project(db, project_id, current_user.organization_id)
    return ProjectService.add_mini_budget(db, project_id, mini_in.description, mini_in.amount)

@router.delete("/{project_id}/mini-budgets/{mini_budget_id}", dependencies=[Depends(allow_manage_proj)])
def delete_mini_budget(
    project_id: int,
    mini_budget_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Validar pertenencia del proyecto
    ProjectService.get_project(db, project_id, current_user.organization_id)
    return ProjectService.delete_mini_budget(db, project_id, mini_budget_id)

@router.get("/{project_id}/download-folder")
def download_project_folder(
    project_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    zip_content = ProjectService.download_project_folder(db, project_id, current_user.organization_id)
    project = ProjectService.get_project(db, project_id, current_user.organization_id)
    
    from fastapi.responses import Response
    return Response(
        content=zip_content,
        media_type="application/zip",
        headers={
            "Content-Disposition": f"attachment; filename=carpeta_proyecto_{project.code or project_id}.zip"
        }
    )
