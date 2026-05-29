from typing import List, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api import deps
from app.schemas.task import TaskOut, TaskCreate, TaskUpdate, TaskDetail, TaskCommentOut, TaskCommentCreate
from app.models import core

router = APIRouter()

allow_write_tasks = deps.RoleChecker([core.UserRole.ADMIN, core.UserRole.PROJECT_MANAGER, core.UserRole.HR_MANAGER])

@router.get("/", response_model=List[TaskOut])
def read_tasks(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    project_id: int = None,
    current_user: core.User = Depends(deps.get_current_user),
) -> Any:
    query = db.query(core.Task)
    if project_id:
        query = query.filter(core.Task.project_id == project_id)
    return query.offset(skip).limit(limit).all()

@router.post("/", response_model=TaskOut, dependencies=[Depends(allow_write_tasks)])
def create_task(
    *,
    db: Session = Depends(deps.get_db),
    task_in: TaskCreate,
    current_user: core.User = Depends(deps.get_current_user),
) -> Any:
    task = core.Task(
        **task_in.dict(),
        created_by=current_user.id
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task

@router.get("/{task_id}", response_model=TaskDetail)
def read_task(
    *,
    db: Session = Depends(deps.get_db),
    task_id: str,
    current_user: core.User = Depends(deps.get_current_user),
) -> Any:
    task = db.query(core.Task).filter(core.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    return task

@router.post("/{task_id}/comments", response_model=TaskCommentOut, dependencies=[Depends(allow_write_tasks)])
def create_task_comment(
    *,
    db: Session = Depends(deps.get_db),
    task_id: str,
    comment_in: TaskCommentCreate,
    current_user: core.User = Depends(deps.get_current_user),
) -> Any:
    comment = core.TaskComment(
        **comment_in.dict(),
        user_id=current_user.id
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment
