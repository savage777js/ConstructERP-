from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.schemas.notification import NotificationOut, NotificationUpdate
from app.services.notification_service import NotificationService
from app.api.deps import RoleChecker, get_current_user
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

@router.get("/", response_model=List[NotificationOut])
def list_notifications(
    skip: int = 0, 
    limit: int = 50, 
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return NotificationService.get_notifications(db, current_user.role, skip, limit)

@router.get("/unread-count")
def get_unread_count(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    from app.models.core import Notification, NotificationType
    # Ejecutar chequeos primero
    NotificationService.run_smart_checks(db)
    
    query = db.query(Notification).filter(Notification.is_read == False)
    
    role = current_user.role
    if role and role not in ["ADMIN", "MANAGEMENT"]:
        if role == "HR_MANAGER":
            query = query.filter(Notification.type.in_([
                NotificationType.CONTRACT_EXPIRING,
                NotificationType.UNPAID_SALARY,
                NotificationType.SYSTEM_INFO,
                NotificationType.VACATION_ALERT,
                NotificationType.VACATION_APPROVED,
                NotificationType.VACATION_REQUEST
            ]))
        elif role == "PROJECT_MANAGER":
            query = query.filter(Notification.type.in_([
                NotificationType.PROJECT_ENDING,
                NotificationType.STOCK_ALERT,
                NotificationType.SYSTEM_INFO,
                NotificationType.PROFITABILITY_ALERT
            ]))
        elif role == "INVENTORY_MANAGER":
            query = query.filter(Notification.type.in_([
                NotificationType.STOCK_ALERT,
                NotificationType.SYSTEM_INFO
            ]))
            
    count = query.count()
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
