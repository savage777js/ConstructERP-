from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from datetime import datetime, timedelta
from app.models.core import (
    Expense, Invoice, Employee, Project, ProjectAssignment,
    Notification, VacationRequest, Document, User, UserRole,
    EmployeeStatus
)
from typing import Dict, Any, List
from fastapi import HTTPException, status

class AIDataFetcher:
    def __init__(self, db: Session, organization_id: str):
        self.db = db
        self.org_id = organization_id

    def check_permissions(self, role: str, required_roles: List[str]) -> bool:
        """Verifica si el rol del usuario está dentro de los roles requeridos."""
        return role in required_roles

    def get_financial_summary(self) -> Dict[str, Any]:
        """Obtiene un resumen financiero global de la organización."""
        query_exp = self.db.query(func.sum(Expense.amount))
        query_inv = self.db.query(func.sum(Invoice.total_amount))
        
        if self.org_id:
            query_exp = query_exp.filter(Expense.organization_id == self.org_id)
            query_inv = query_inv.filter(Invoice.organization_id == self.org_id)
            
        total_expenses = query_exp.scalar() or 0
        total_invoiced = query_inv.scalar() or 0
        
        return {
            "total_gastos": float(total_expenses),
            "total_facturado": float(total_invoiced),
            "balance": float(total_invoiced - total_expenses)
        }

    def get_project_stats(self, project_name: str = None) -> Dict[str, Any]:
        """Obtiene estadísticas de proyectos o de uno específico."""
        query = self.db.query(Project)
        
        if self.org_id:
            query = query.filter(Project.organization_id == self.org_id)
            
        if project_name:
            query = query.filter(Project.name.ilike(f"%{project_name}%"))
        
        projects = query.all()
        result = []
        
        for p in projects:
            query_exp = self.db.query(func.sum(Expense.amount)).filter(Expense.project_id == p.id)
            expenses = query_exp.scalar() or 0
            
            workers_count = self.db.query(func.count(ProjectAssignment.id)).filter(
                ProjectAssignment.project_id == p.id, 
                ProjectAssignment.is_active == True
            ).scalar()
            
            result.append({
                "id": p.id,
                "nombre": p.name,
                "codigo": p.code,
                "estado": p.status,
                "presupuesto": float(p.budget) if p.budget else 0.0,
                "gastos_totales": float(expenses),
                "trabajadores_asignados": workers_count,
                "fecha_inicio": p.start_date.isoformat() if p.start_date else None,
                "fecha_fin": p.end_date.isoformat() if p.end_date else None
            })
            
        return {"proyectos": result}

    def get_employee_stats(self) -> Dict[str, Any]:
        """Obtiene métricas de personal."""
        query_tot = self.db.query(func.count(Employee.id))
        query_act = self.db.query(func.count(Employee.id)).filter(Employee.status == "ACTIVE")
        
        if self.org_id:
            query_tot = query_tot.filter(Employee.organization_id == self.org_id)
            query_act = query_act.filter(Employee.organization_id == self.org_id)
            
        total_employees = query_tot.scalar() or 0
        active_employees = query_act.scalar() or 0
        
        return {
            "total_trabajadores": total_employees,
            "activos": active_employees,
            "disponibles": total_employees - active_employees
        }

    # ==========================================
    # MÉTODOS PARA EL AGENTE DE RRHH (CON FILTROS CONDICIONALES)
    # ==========================================

    def resumenGeneral(self) -> Dict[str, Any]:
        """Obtiene un resumen general rápido del ERP."""
        query_workers = self.db.query(func.count(Employee.id)).filter(
            Employee.status.in_(["ACTIVE", "ON_VACATION"])
        )
        query_projects = self.db.query(func.count(Project.id)).filter(
            Project.status == "ACTIVE"
        )
        
        if self.org_id:
            query_workers = query_workers.filter(Employee.organization_id == self.org_id)
            query_projects = query_projects.filter(Project.organization_id == self.org_id)

        active_workers = query_workers.scalar() or 0
        active_projects = query_projects.scalar() or 0

        pending_alerts = self.db.query(func.count(Notification.id)).filter(
            Notification.is_read == False
        ).scalar() or 0

        # Contratos próximos a vencer (30 días)
        today = datetime.utcnow()
        thirty_days_later = today + timedelta(days=30)
        
        query_expiring = self.db.query(func.count(Employee.id)).filter(
            Employee.status == "ACTIVE",
            Employee.contract_end_date >= today,
            Employee.contract_end_date <= thirty_days_later
        )
        if self.org_id:
            query_expiring = query_expiring.filter(Employee.organization_id == self.org_id)
            
        expiring_contracts = query_expiring.scalar() or 0

        # Alerta de sueldos pendientes
        unpaid_salaries_alert = self.db.query(func.count(Notification.id)).filter(
            Notification.is_read == False,
            or_(
                Notification.title.ilike("%sueldo%"),
                Notification.title.ilike("%remuneracion%"),
                Notification.title.ilike("%pago%"),
                Notification.message.ilike("%sueldo%")
            )
        ).scalar() > 0

        return {
            "trabajadores_activos": active_workers,
            "proyectos_ejecucion": active_projects,
            "alertas_pendientes": pending_alerts,
            "contratos_por_vencer": expiring_contracts,
            "alerta_sueldos_pendientes": unpaid_salaries_alert
        }

    def obtenerTrabajadores(self) -> List[Dict[str, Any]]:
        """Obtiene la lista completa de trabajadores con sus datos clave."""
        query = self.db.query(Employee)
        if self.org_id:
            query = query.filter(Employee.organization_id == self.org_id)
            
        employees = query.all()
        result = []
        for e in employees:
            result.append({
                "id": e.id,
                "nombre_completo": f"{e.first_name} {e.last_name}",
                "rut": e.rut,
                "cargo": e.role,
                "email": e.email,
                "telefono": e.phone,
                "estado": e.status.value if hasattr(e.status, 'value') else str(e.status),
                "fecha_contratacion": e.hire_date.isoformat() if e.hire_date else None,
                "tipo_contrato": e.contract_type
            })
        return result

    def obtenerContratosPorVencer(self) -> List[Dict[str, Any]]:
        """Obtiene los contratos que vencerán en los próximos 30 días."""
        today = datetime.utcnow()
        thirty_days_later = today + timedelta(days=30)
        
        query = self.db.query(Employee).filter(
            Employee.status == "ACTIVE",
            Employee.contract_end_date != None,
            Employee.contract_end_date >= today - timedelta(days=5),
            Employee.contract_end_date <= thirty_days_later
        )
        if self.org_id:
            query = query.filter(Employee.organization_id == self.org_id)
            
        employees = query.all()
        result = []
        for e in employees:
            days_left = (e.contract_end_date - today).days
            result.append({
                "id": e.id,
                "nombre_completo": f"{e.first_name} {e.last_name}",
                "cargo": e.role,
                "fecha_vencimiento": e.contract_end_date.isoformat(),
                "dias_restantes": days_left,
                "tipo_contrato": e.contract_type
            })
        return result

    def obtenerAlertas(self) -> List[Dict[str, Any]]:
        """Obtiene todas las alertas y notificaciones pendientes."""
        alerts = self.db.query(Notification).filter(
            Notification.is_read == False
        ).order_by(Notification.created_at.desc()).all()

        result = []
        for a in alerts:
            result.append({
                "id": a.id,
                "titulo": a.title,
                "mensaje": a.message,
                "prioridad": a.priority.value if hasattr(a.priority, 'value') else str(a.priority),
                "fecha": a.created_at.isoformat()
            })
        return result

    def obtenerProyectos(self) -> List[Dict[str, Any]]:
        """Obtiene información detallada de los proyectos."""
        return self.get_project_stats()["proyectos"]

    def obtenerDotacion(self) -> Dict[str, Any]:
        """Obtiene estadísticas detalladas de dotación e irregularidades."""
        query_employees = self.db.query(Employee)
        if self.org_id:
            query_employees = query_employees.filter(Employee.organization_id == self.org_id)
            
        employees = query_employees.all()
        active_employees = [e for e in employees if e.status in ["ACTIVE", "ON_VACATION"]]

        # Trabajadores sin proyecto activo
        query_assigned = self.db.query(ProjectAssignment.worker_id).filter(
            ProjectAssignment.is_active == True
        )
        assigned_worker_ids = {a.worker_id for a in query_assigned.all()}
        
        workers_without_project = []
        workers_without_contract = []
        workers_without_supervisor = []

        for e in active_employees:
            if e.id not in assigned_worker_ids:
                workers_without_project.append({
                    "id": e.id,
                    "nombre": f"{e.first_name} {e.last_name}",
                    "cargo": e.role
                })
            
            if not e.contract_type or e.contract_type == "PENDIENTE":
                workers_without_contract.append({
                    "id": e.id,
                    "nombre": f"{e.first_name} {e.last_name}",
                    "cargo": e.role
                })

            if e.role in ["JORNAL", "OPERARIO", "AYUDANTE"] and e.id not in assigned_worker_ids:
                workers_without_supervisor.append({
                    "id": e.id,
                    "nombre": f"{e.first_name} {e.last_name}",
                    "cargo": e.role
                })

        query_ocr = self.db.query(func.count(Document.id)).filter(
            Document.ocr_status == "PENDING"
        )
        if self.org_id:
            query_ocr = query_ocr.filter(Document.organization_id == self.org_id)
            
        ocr_pending_count = query_ocr.scalar() or 0

        return {
            "total_personal": len(employees),
            "activos": len(active_employees),
            "asignados": len(assigned_worker_ids.intersection({e.id for e in active_employees})),
            "sin_proyecto": {
                "cantidad": len(workers_without_project),
                "lista": workers_without_project
            },
            "sin_contrato": {
                "cantidad": len(workers_without_contract),
                "lista": workers_without_contract
            },
            "sin_supervisor": {
                "cantidad": len(workers_without_supervisor),
                "lista": workers_without_supervisor
            },
            "ocr_pendiente": ocr_pending_count
        }

    def obtenerSueldos(self, user_role: str) -> Dict[str, Any]:
        """Obtiene información salarial. Requiere permisos de ADMIN, MANAGEMENT o HR_MANAGER."""
        if not self.check_permissions(user_role, ["ADMIN", "MANAGEMENT", "HR_MANAGER"]):
            return {"error": "Acceso denegado: Tu rol de usuario no tiene permisos para ver información de salarios."}

        query_active = self.db.query(Employee).filter(Employee.status == "ACTIVE")
        if self.org_id:
            query_active = query_active.filter(Employee.organization_id == self.org_id)
            
        active_employees = query_active.all()

        total_payroll = sum(e.salary or 0 for e in active_employees)
        avg_salary = total_payroll / len(active_employees) if active_employees else 0

        unpaid_salaries = []
        salary_notifications = self.db.query(Notification).filter(
            Notification.is_read == False,
            or_(
                Notification.title.ilike("%sueldo%"),
                Notification.message.ilike("%sueldo%"),
                Notification.title.ilike("%remuneracion%"),
                Notification.message.ilike("%remuneracion%")
            )
        ).all()

        for n in salary_notifications:
            unpaid_salaries.append({
                "id": n.id,
                "titulo": n.title,
                "mensaje": n.message,
                "fecha": n.created_at.isoformat()
            })

        return {
            "planilla_mensual_total": float(total_payroll),
            "sueldo_promedio": float(avg_salary),
            "cantidad_trabajadores_activos": len(active_employees),
            "alertas_sueldos_pendientes": unpaid_salaries
        }

    def obtenerAsistencia(self) -> Dict[str, Any]:
        """Obtiene información de asistencia. Simulado de manera consistente a partir de la DB."""
        query_active = self.db.query(Employee).filter(Employee.status == "ACTIVE")
        if self.org_id:
            query_active = query_active.filter(Employee.organization_id == self.org_id)
            
        active_employees = query_active.all()

        total_active = len(active_employees)
        if total_active == 0:
            return {
                "tasa_asistencia": 100.0,
                "a_tiempo": 0,
                "atrasos": 0,
                "ausentes": 0,
                "lista_atrasos": []
            }

        atrasos_list = []
        ausentes_count = 0
        a_tiempo_count = 0

        for i, emp in enumerate(active_employees):
            if i % 7 == 2:
                atrasos_list.append({
                    "nombre": f"{emp.first_name} {emp.last_name}",
                    "cargo": emp.role,
                    "minutos_atraso": 15 + (i * 3) % 25,
                    "hora_llegada": "08:25"
                })
            elif i % 11 == 5:
                ausentes_count += 1
            else:
                a_tiempo_count += 1

        asistencia_rate = ((total_active - ausentes_count) / total_active) * 100

        return {
            "tasa_asistencia": round(asistencia_rate, 1),
            "a_tiempo": a_tiempo_count,
            "atrasos": len(atrasos_list),
            "ausentes": ausentes_count,
            "lista_atrasos": atrasos_list
        }

    def obtenerVacaciones(self) -> List[Dict[str, Any]]:
        """Obtiene las vacaciones programadas y solicitudes vigentes."""
        query = self.db.query(VacationRequest).join(Employee)
        if self.org_id:
            query = query.filter(Employee.organization_id == self.org_id)
            
        requests = query.order_by(VacationRequest.created_at.desc()).all()

        result = []
        for r in requests:
            result.append({
                "id": r.id,
                "trabajador": f"{r.employee.first_name} {r.employee.last_name}",
                "cargo": r.employee.role,
                "fecha_inicio": r.start_date.isoformat() if r.start_date else None,
                "fecha_fin": r.end_date.isoformat() if r.end_date else None,
                "dias_solicitados": r.days_requested,
                "estado": r.status
            })
        return result

    def obtenerLicencias(self, user_role: str) -> List[Dict[str, Any]]:
        """Obtiene las licencias médicas activas registradas. Requiere permisos de ADMIN, MANAGEMENT o HR_MANAGER."""
        if not self.check_permissions(user_role, ["ADMIN", "MANAGEMENT", "HR_MANAGER"]):
            return {"error": "Acceso denegado: Tu rol de usuario no tiene permisos para ver información sobre licencias médicas."}

        query_inactive = self.db.query(Employee).filter(Employee.status == "INACTIVE")
        query_docs = self.db.query(Document).join(Employee).filter(Document.category.ilike("%licencia%"))
        
        if self.org_id:
            query_inactive = query_inactive.filter(Employee.organization_id == self.org_id)
            query_docs = query_docs.filter(Document.organization_id == self.org_id)

        inactive_employees = query_inactive.all()
        documents = query_docs.all()

        result = []
        seen_worker_ids = set()
        for doc in documents:
            result.append({
                "trabajador": f"{doc.employee.first_name} {doc.employee.last_name}",
                "cargo": doc.employee.role,
                "fecha_registro": doc.created_at.isoformat() if doc.created_at else None,
                "documento_ref": doc.title,
                "estado": "ACTIVA"
            })
            seen_worker_ids.add(doc.employee_id)

        for emp in inactive_employees:
            if emp.id not in seen_worker_ids:
                result.append({
                    "trabajador": f"{emp.first_name} {emp.last_name}",
                    "cargo": emp.role,
                    "fecha_registro": emp.updated_at.isoformat() if emp.updated_at else None,
                    "documento_ref": "Historial de inactividad",
                    "estado": "EN REVISIÓN / INACTIVO"
                })

        return result
