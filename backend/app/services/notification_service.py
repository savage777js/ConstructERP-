from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from app.models.core import Notification, NotificationType, NotificationPriority, Employee, Project, ProjectAssignment
from datetime import datetime, timedelta

class NotificationService:
    _last_run = None

    @staticmethod
    def get_notifications(db: Session, role: str = None, skip: int = 0, limit: int = 50):
        # Triggers the smart check before returning
        NotificationService.run_smart_checks(db)
        
        query = db.query(Notification)
        
        if role and role not in ["ADMIN", "MANAGEMENT"]:
            if role == "HR_MANAGER":
                query = query.filter(Notification.type.in_([
                    NotificationType.CONTRACT_EXPIRING,
                    NotificationType.UNPAID_SALARY,
                    NotificationType.SYSTEM_INFO,
                    NotificationType.VACATION_ALERT,
                    NotificationType.VACATION_APPROVED
                ]))
            elif role == "PROJECT_MANAGER":
                query = query.filter(Notification.type.in_([
                    NotificationType.PROJECT_ENDING,
                    NotificationType.STOCK_ALERT,
                    NotificationType.SYSTEM_INFO,
                    NotificationType.VACATION_REQUEST,
                    NotificationType.PROFITABILITY_ALERT
                ]))
            elif role == "INVENTORY_MANAGER":
                query = query.filter(Notification.type.in_([
                    NotificationType.STOCK_ALERT,
                    NotificationType.SYSTEM_INFO
                ]))
                
        return query.order_by(Notification.created_at.desc()).offset(skip).limit(limit).all()

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
        now = datetime.utcnow()
        if NotificationService._last_run and (now - NotificationService._last_run) < timedelta(minutes=5):
            return
        NotificationService._last_run = now

        NotificationService._check_employee_contracts(db)
        NotificationService._check_project_deadlines(db)
        NotificationService._check_project_profitability(db)
        NotificationService._check_addendum_expirations(db)
        NotificationService._check_accumulated_vacations(db)

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

    @staticmethod
    def _check_project_profitability(db: Session):
        active_projects = db.query(Project).filter(Project.status == "ACTIVE").all()
        for proj in active_projects:
            if proj.budget and proj.budget > 0:
                from sqlalchemy import func
                from app.models.core import Expense
                expenses = db.query(func.sum(Expense.amount)).filter(Expense.project_id == proj.id).scalar() or 0
                
                # Convertir a float para evitar TypeError entre decimal.Decimal y float con PostgreSQL
                budget_float = float(proj.budget)
                expenses_float = float(expenses)
                
                if expenses_float > (budget_float * 0.85):
                    margin = ((budget_float - expenses_float) / budget_float) * 100
                    priority = NotificationPriority.CRITICAL if expenses_float >= budget_float else NotificationPriority.WARNING
                    NotificationService._create_notification_if_not_exists(
                        db,
                        NotificationType.PROFITABILITY_ALERT,
                        proj.id,
                        title=f"Margen Crítico: {proj.name}",
                        message=f"Los gastos de la obra '{proj.name}' (${expenses_float:,.0f}) representan el {expenses_float/budget_float*100:.1f}% del presupuesto (${budget_float:,.0f}). El margen de utilidad proyectado es del {margin:.1f}% (menor al 15%).",
                        priority=priority,
                        link=f"/projects/{proj.id}"
                    )

    @staticmethod
    def _check_addendum_expirations(db: Session):
        threshold = datetime.utcnow() + timedelta(days=30)
        expiring_assignments = db.query(ProjectAssignment).filter(
            ProjectAssignment.is_active == True,
            ProjectAssignment.end_date != None,
            ProjectAssignment.end_date <= threshold,
            ProjectAssignment.end_date >= datetime.utcnow()
        ).all()
        
        for assign in expiring_assignments:
            days_left = (assign.end_date - datetime.utcnow()).days
            priority = NotificationPriority.CRITICAL if days_left < 7 else NotificationPriority.WARNING
            NotificationService._create_notification_if_not_exists(
                db,
                NotificationType.CONTRACT_EXPIRING,
                assign.id,
                title=f"Vencimiento de Anexo: {assign.worker.first_name} en {assign.project.name}",
                message=f"El anexo de contrato de {assign.worker.first_name} {assign.worker.last_name} para la obra '{assign.project.name}' vence en {days_left} días ({assign.end_date.strftime('%Y-%m-%d')}).",
                priority=priority,
                link=f"/projects/{assign.project.id}"
            )

    @staticmethod
    def _check_accumulated_vacations(db: Session):
        from app.models.core import Employee
        all_active = db.query(Employee).filter(Employee.status == "ACTIVE").all()
        workers = [emp for emp in all_active if emp.vacation_balance >= 30.0]
        
        for emp in workers:
            NotificationService._create_notification_if_not_exists(
                db,
                NotificationType.VACATION_ALERT,
                emp.id,
                title=f"Vacaciones Acumuladas: {emp.first_name} {emp.last_name}",
                message=f"El trabajador tiene {emp.vacation_balance} días de vacaciones acumulados (límite recomendado: 30 días). Se sugiere coordinar descanso.",
                priority=NotificationPriority.WARNING,
                link="/workers"
            )
