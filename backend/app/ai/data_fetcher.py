from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.core import Expense, Invoice, Employee, Project, ProjectAssignment
from typing import Dict, Any

class AIDataFetcher:
    def __init__(self, db: Session, organization_id: str):
        self.db = db
        self.org_id = organization_id

    def get_financial_summary(self) -> Dict[str, Any]:
        """Obtiene un resumen financiero global de la organización."""
        total_expenses = self.db.query(func.sum(Expense.amount)).filter(Expense.organization_id == self.org_id).scalar() or 0
        total_invoiced = self.db.query(func.sum(Invoice.total_amount)).filter(Invoice.organization_id == self.org_id).scalar() or 0
        
        return {
            "total_gastos": float(total_expenses),
            "total_facturado": float(total_invoiced),
            "balance": float(total_invoiced - total_expenses)
        }

    def get_project_stats(self, project_name: str = None) -> Dict[str, Any]:
        """Obtiene estadísticas de proyectos o de uno específico."""
        query = self.db.query(Project).filter(Project.organization_id == self.org_id)
        
        if project_name:
            query = query.filter(Project.name.ilike(f"%{project_name}%"))
        
        projects = query.all()
        result = []
        
        for p in projects:
            expenses = self.db.query(func.sum(Expense.amount)).filter(Expense.project_id == p.id).scalar() or 0
            workers_count = self.db.query(func.count(ProjectAssignment.id)).filter(
                ProjectAssignment.project_id == p.id, 
                ProjectAssignment.is_active == True
            ).scalar()
            
            result.append({
                "nombre": p.name,
                "estado": p.status,
                "gastos_totales": float(expenses),
                "trabajadores_asignados": workers_count,
                "fecha_inicio": p.start_date.isoformat() if p.start_date else None
            })
            
        return {"proyectos": result}

    def get_employee_stats(self) -> Dict[str, Any]:
        """Obtiene métricas de personal."""
        total_employees = self.db.query(func.count(Employee.id)).filter(Employee.organization_id == self.org_id).scalar()
        active_employees = self.db.query(func.count(Employee.id)).filter(
            Employee.organization_id == self.org_id, 
            Employee.status == "ACTIVE"
        ).scalar()
        
        return {
            "total_trabajadores": total_employees,
            "activos": active_employees,
            "disponibles": total_employees - active_employees
        }
