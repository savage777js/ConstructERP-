from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.schemas.project import ProjectCreate, ProjectOut, ProjectUpdate, ProjectDetail, WorkerAssignment, InventoryAssignment
from app.services.project_service import ProjectService

from app.models.core import UserRole
from app.api.deps import RoleChecker

router = APIRouter()

# Dependencias de rol
allow_manage_proj = RoleChecker([UserRole.ADMIN, UserRole.PROJECT_MANAGER])
allow_read_proj = RoleChecker([UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.MANAGEMENT, UserRole.HR_MANAGER, UserRole.INVENTORY_MANAGER])
allow_assign_worker = RoleChecker([UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.HR_MANAGER])
allow_assign_inv = RoleChecker([UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.INVENTORY_MANAGER])

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
def update_project(project_id: int, project_in: ProjectUpdate, db: Session = Depends(get_db)):
    return ProjectService.update_project(db, project_id, project_in)

@router.post("/{project_id}/assign-worker", dependencies=[Depends(allow_assign_worker)])
def assign_worker(project_id: int, assignment: WorkerAssignment, db: Session = Depends(get_db)):
    return ProjectService.assign_worker(db, project_id, assignment)

@router.post("/{project_id}/assign-inventory", dependencies=[Depends(allow_assign_inv)])
def assign_inventory(project_id: int, assignment: InventoryAssignment, db: Session = Depends(get_db)):
    return ProjectService.assign_inventory(db, project_id, assignment)

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(allow_manage_proj)])
def delete_project(project_id: int, db: Session = Depends(get_db)):
    ProjectService.delete_project(db, project_id)
    return None
