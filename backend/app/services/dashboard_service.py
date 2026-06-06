from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.core import Employee, Project, Notification, ProjectAssignment
from datetime import datetime, timedelta

class DashboardService:
    @staticmethod
    def get_summary_metrics(db: Session):
        # 1. Trabajadores
        total_workers = db.query(Employee).filter(Employee.status == "ACTIVE").count()
        
        # Trabajadores con contrato por vencer (próximos 30 días)
        threshold_contract = datetime.utcnow() + timedelta(days=30)
        expiring_contracts = db.query(Employee).filter(
            Employee.contract_end_date <= threshold_contract,
            Employee.contract_end_date >= datetime.utcnow(),
            Employee.status == "ACTIVE"
        ).count()

        # Calcular sueldos totales
        total_salary = db.query(func.sum(Employee.salary)).filter(Employee.status == "ACTIVE").scalar() or 0

        # 2. Proyectos
        total_projects = db.query(Project).filter(Project.status == "ACTIVE").count()
        
        # Proyectos por finalizar (próximos 15 días)
        threshold_project = datetime.utcnow() + timedelta(days=15)
        ending_projects = db.query(Project).filter(
            Project.end_date <= threshold_project,
            Project.end_date >= datetime.utcnow(),
            Project.status == "ACTIVE"
        ).count()

        # Presupuesto total de obras activas
        total_budget = db.query(func.sum(Project.budget)).filter(Project.status == "ACTIVE").scalar() or 0

        # Gastos totales y utilidad proyectada
        from app.models.core import Expense
        total_expenses = db.query(func.sum(Expense.amount))\
                           .join(Project, Project.id == Expense.project_id)\
                           .filter(Project.status == "ACTIVE").scalar() or 0
        projected_utility = total_budget - total_expenses

        # 4. Notificaciones
        unread_notifications = db.query(Notification).filter(Notification.is_read == False).count()

        return {
            "workers": {
                "total": total_workers,
                "expiring": expiring_contracts,
                "total_salary": float(total_salary)
            },
            "projects": {
                "total": total_projects,
                "ending": ending_projects,
                "total_budget": float(total_budget),
                "projected_utility": float(projected_utility)
            },
            "notifications": {
                "unread": unread_notifications
            }
        }

    @staticmethod
    def get_chart_data(db: Session):
        # 1. Trabajadores por proyecto
        workers_per_project = db.query(
            Project.name,
            func.count(ProjectAssignment.id).label("count")
        ).join(ProjectAssignment, Project.id == ProjectAssignment.project_id)\
         .filter(ProjectAssignment.is_active == True)\
         .group_by(Project.name).all()
        
        # 2. Resumen de Alertas por Prioridad
        alerts_priority = db.query(
            Notification.priority,
            func.count(Notification.id).label("count")
        ).filter(Notification.is_read == False)\
         .group_by(Notification.priority).all()

        return {
            "workers_project": [{"name": r[0], "workers": r[1]} for r in workers_per_project],
            "alerts_priority": [{"name": r[0], "value": r[1]} for r in alerts_priority]
        }
