from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from app.models.core import Employee, Project, ProjectAssignment, Notification, UserRole, EmployeeStatus
from datetime import datetime
from typing import List, Optional

STATUS_TRANSLATIONS = {
    "ACTIVE": "ACTIVO",
    "INACTIVE": "INACTIVO",
    "ON_VACATION": "EN VACACIONES",
    "TERMINATED": "FINIQUITADO"
}

PROJECT_STATUS_TRANSLATIONS = {
    "ACTIVE": "EN EJECUCIÓN",
    "INACTIVE": "CERRADO"
}

PRIORITY_TRANSLATIONS = {
    "INFO": "INFORMATIVA",
    "WARNING": "ADVERTENCIA",
    "CRITICAL": "CRÍTICA"
}

TYPE_TRANSLATIONS = {
    "CONTRACT_EXPIRING": "VENCIMIENTO CONTRATO",
    "STOCK_ALERT": "ALERTA BODEGA",
    "PROJECT_ENDING": "TÉRMINO PROYECTO",
    "SYSTEM_INFO": "INFO SISTEMA",
    "UNPAID_SALARY": "SUELDO IMPAGO"
}

class ReportService:
    @staticmethod
    def get_workers_report(db: Session, current_user_role: str):
        workers = db.query(Employee).all()
        report_data = []
        
        # Check if user can see salaries
        can_see_salary = current_user_role in [UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.MANAGEMENT]
        
        for w in workers:
            status_val = w.status.value if hasattr(w.status, "value") else str(w.status) if w.status else "ACTIVE"
            item = {
                "Nombre": f"{w.first_name} {w.last_name}",
                "RUT": w.rut,
                "Cargo": w.role,
                "Fecha Ingreso": w.hire_date.strftime('%d/%m/%Y') if w.hire_date else "N/A",
                "Estado": STATUS_TRANSLATIONS.get(status_val, status_val)
            }
            if can_see_salary:
                item["Sueldo Base"] = f"${w.salary:,}".replace(',', '.')
            else:
                item["Sueldo Base"] = "********"
            
            report_data.append(item)
            
        return report_data

    @staticmethod
    def get_assignments_report(db: Session, project_id: Optional[int] = None):
        query = db.query(ProjectAssignment).filter(ProjectAssignment.is_active == True)
        if project_id:
            query = query.filter(ProjectAssignment.project_id == project_id)
            
        assignments = query.all()
        report_data = []
        
        for a in assignments:
            report_data.append({
                "Obra": a.project.name,
                "Código Obra": a.project.code,
                "Trabajador": f"{a.worker.first_name} {a.worker.last_name}",
                "RUT": a.worker.rut,
                "Rol en Obra": a.role,
                "Fecha Asignación": a.assigned_at.strftime('%d/%m/%Y %H:%M')
            })
        return report_data



    @staticmethod
    def get_projects_report(db: Session, status: Optional[str] = None):
        query = db.query(Project)
        if status:
            query = query.filter(Project.status == status)
            
        projects = query.all()
        report_data = []
        
        for p in projects:
            report_data.append({
                "Código": p.code,
                "Nombre Obra": p.name,
                "Cliente": p.client_name,
                "Fecha Inicio": p.start_date.strftime('%d/%m/%Y') if p.start_date else "N/A",
                "Fecha Término Est.": p.end_date.strftime('%d/%m/%Y') if p.end_date else "N/A",
                "Estado": PROJECT_STATUS_TRANSLATIONS.get(p.status, p.status),
                "Dirección": p.address
            })
        return report_data

    @staticmethod
    def get_notifications_report(db: Session, start_date: Optional[datetime] = None, end_date: Optional[datetime] = None):
        query = db.query(Notification)
        
        if start_date:
            query = query.filter(Notification.created_at >= start_date)
        if end_date:
            query = query.filter(Notification.created_at <= end_date)
            
        notifications = query.order_by(Notification.created_at.desc()).all()
        report_data = []
        
        for n in notifications:
            report_data.append({
                "Fecha": n.created_at.strftime('%d/%m/%Y %H:%M'),
                "Prioridad": PRIORITY_TRANSLATIONS.get(n.priority.value, n.priority.value),
                "Tipo": TYPE_TRANSLATIONS.get(n.type.value, n.type.value),
                "Título": n.title,
                "Mensaje": n.message,
                "Estado": "Leída" if n.is_read else "Pendiente"
            })
        return report_data

    @staticmethod
    def get_expiring_contracts_report(db: Session, days: int = 30):
        # En una versión real, calcularíamos la diferencia con datetime.now()
        # Por ahora, traemos trabajadores con contract_end_date próximamente
        # Para este ejemplo, traeremos los que tienen contract_end_date seteado.
        workers = db.query(Employee).filter(
            Employee.contract_end_date != None,
            Employee.status == EmployeeStatus.ACTIVE
        ).all()
        
        report_data = []
        for w in workers:
            report_data.append({
                "Trabajador": f"{w.first_name} {w.last_name}",
                "RUT": w.rut,
                "Cargo": w.role,
                "Fecha Vencimiento": w.contract_end_date.strftime('%d/%m/%Y')
            })
        return report_data
