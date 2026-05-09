from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from app.models.core import Notification, NotificationType, NotificationPriority, Employee, InventoryItem, Project, ProjectAssignment
from datetime import datetime, timedelta

class NotificationService:
    @staticmethod
    def get_notifications(db: Session, skip: int = 0, limit: int = 50):
        # Triggers the smart check before returning
        NotificationService.run_smart_checks(db)
        return db.query(Notification).order_by(Notification.created_at.desc()).offset(skip).limit(limit).all()

    @staticmethod
    def mark_as_read(db: Session, notification_id: int):
        notification = db.query(Notification).filter(Notification.id == notification_id).first()
        if notification:
            notification.is_read = True
            db.commit()
            db.refresh(notification)
        return notification

    @staticmethod
    def mark_all_as_read(db: Session):
        db.query(Notification).filter(Notification.is_read == False).update({"is_read": True})
        db.commit()
    
    @staticmethod
    def run_smart_checks(db: Session):
        """Monitorea condiciones críticas y genera alertas si no existen."""
        NotificationService._check_inventory_stock(db)
        NotificationService._check_employee_contracts(db)
        NotificationService._check_project_deadlines(db)

    @staticmethod
    def _create_notification_if_not_exists(db: Session, n_type: NotificationType, ref_id: int, title: str, message: str, priority: NotificationPriority, link: str = None):
        # Check if an unread notification of the same type and reference exists from the last 24h
        # (to avoid spamming if the condition persists)
        yesterday = datetime.utcnow() - timedelta(days=1)
        existing = db.query(Notification).filter(
            Notification.type == n_type,
            Notification.reference_id == ref_id,
            Notification.is_read == False,
            Notification.created_at > yesterday
        ).first()
        
        if not existing:
            new_notif = Notification(
                type=n_type,
                reference_id=ref_id,
                title=title,
                message=message,
                priority=priority,
                link=link
            )
            db.add(new_notif)
            # We commit inside if needed, but usually the caller handles the main commit if multiple checks are done.
            # Here we commit per notification to be safe in this check loop.
            db.commit()

    @staticmethod
    def _check_inventory_stock(db: Session):
        low_stock_items = db.query(InventoryItem).filter(
            InventoryItem.quantity_available <= InventoryItem.min_stock,
            InventoryItem.status == "ACTIVE"
        ).all()
        
        for item in low_stock_items:
            NotificationService._create_notification_if_not_exists(
                db,
                NotificationType.STOCK_ALERT,
                item.id,
                title=f"Stock Crítico: {item.name}",
                message=f"El material '{item.name}' tiene solo {item.quantity_available} {item.unit} (Mínimo: {item.min_stock}).",
                priority=NotificationPriority.CRITICAL if item.quantity_available == 0 else NotificationPriority.WARNING,
                link=f"/inventory"
            )

    @staticmethod
    def _check_employee_contracts(db: Session):
        threshold = datetime.utcnow() + timedelta(days=30)
        expiring_employees = db.query(Employee).filter(
            Employee.contract_end_date <= threshold,
            Employee.contract_end_date >= datetime.utcnow(),
            Employee.status == "ACTIVE"
        ).all()
        
        for emp in expiring_employees:
            days_left = (emp.contract_end_date - datetime.utcnow()).days
            priority = NotificationPriority.CRITICAL if days_left < 7 else NotificationPriority.WARNING
            
            # Check if assigned to any active project
            assignment = db.query(ProjectAssignment).filter(
                ProjectAssignment.worker_id == emp.id,
                ProjectAssignment.is_active == True
            ).first()
            
            project_info = ""
            if assignment:
                project_info = f" El trabajador está asignado a la obra '{assignment.project.name}'."

            NotificationService._create_notification_if_not_exists(
                db,
                NotificationType.CONTRACT_EXPIRING,
                emp.id,
                title=f"Vencimiento de Contrato: {emp.first_name} {emp.last_name}",
                message=f"El contrato de {emp.first_name} vence en {days_left} días ({emp.contract_end_date.strftime('%Y-%m-%d')}).{project_info}",
                priority=priority,
                link=f"/workers"
            )

    @staticmethod
    def _check_project_deadlines(db: Session):
        threshold = datetime.utcnow() + timedelta(days=15)
        ending_projects = db.query(Project).filter(
            Project.end_date <= threshold,
            Project.end_date >= datetime.utcnow(),
            Project.status == "ACTIVE"
        ).all()
        
        for proj in ending_projects:
            days_left = (proj.end_date - datetime.utcnow()).days
            NotificationService._create_notification_if_not_exists(
                db,
                NotificationType.PROJECT_ENDING,
                proj.id,
                title=f"Fin de Obra Cercano: {proj.name}",
                message=f"El proyecto '{proj.name}' ({proj.code}) finaliza en {days_left} días.",
                priority=NotificationPriority.WARNING,
                link=f"/projects/{proj.id}"
            )
