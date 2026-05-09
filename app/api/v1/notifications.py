from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.schemas.notification import NotificationOut, NotificationUpdate
from app.services.notification_service import NotificationService
from app.api.deps import RoleChecker
from app.models.core import UserRole

router = APIRouter()

# Todos los roles con acceso al sistema pueden ver notificaciones
allow_all_roles = RoleChecker([
    UserRole.ADMIN, 
    UserRole.HR_MANAGER, 
    UserRole.PROJECT_MANAGER, 
    UserRole.INVENTORY_MANAGER, 
    UserRole.MANAGEMENT
])

@router.get("/", response_model=List[NotificationOut], dependencies=[Depends(allow_all_roles)])
def list_notifications(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    return NotificationService.get_notifications(db, skip, limit)

@router.get("/unread-count", dependencies=[Depends(allow_all_roles)])
def get_unread_count(db: Session = Depends(get_db)):
    from app.models.core import Notification
    count = db.query(Notification).filter(Notification.is_read == False).count()
    return {"count": count}

@router.patch("/{notification_id}/read", response_model=NotificationOut, dependencies=[Depends(allow_all_roles)])
def mark_read(notification_id: int, db: Session = Depends(get_db)):
    notification = NotificationService.mark_as_read(db, notification_id)
    if not notification:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")
    return notification

@router.post("/read-all", dependencies=[Depends(allow_all_roles)])
def mark_all_read(db: Session = Depends(get_db)):
    NotificationService.mark_all_as_read(db)
    return {"message": "Todas las notificaciones marcadas como leídas"}
