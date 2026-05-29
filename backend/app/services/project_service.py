from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.core import Project, Employee, ProjectAssignment, ProjectLog
from app.schemas.project import ProjectCreate, ProjectUpdate, WorkerAssignment
from app.services.notification_service import NotificationService
from datetime import datetime

class ProjectService:
    @staticmethod
    def list_projects(db: Session, skip: int = 0, limit: int = 100):
        # Ordenar por id descendente, u operar sobre todos para mostrar historial
        return db.query(Project).order_by(Project.id.desc()).offset(skip).limit(limit).all()

    @staticmethod
    def get_project(db: Session, project_id: int):
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Proyecto no encontrado")
        return project

    @staticmethod
    def create_project(db: Session, project_in: ProjectCreate):
        if project_in.code:
            db_project = db.query(Project).filter(Project.code == project_in.code).first()
            if db_project:
                raise HTTPException(status_code=400, detail="El código de obra ya existe")
        
        # Validar fechas
        if project_in.start_date and project_in.end_date:
            if project_in.end_date < project_in.start_date:
                raise HTTPException(
                    status_code=400,
                    detail="La fecha de término no puede ser anterior a la fecha de inicio"
                )

        new_project = Project(**project_in.model_dump())
        db.add(new_project)
        db.commit()
        db.refresh(new_project)

        # Log system creation
        log = ProjectLog(
            project_id=new_project.id,
            log_type="SYSTEM",
            content="Obra / Proyecto creado en el sistema."
        )
        db.add(log)
        db.commit()
        db.refresh(new_project)
        return new_project

    @staticmethod
    def update_project(db: Session, project_id: int, project_in: ProjectUpdate, user_id: int = None):
        project = ProjectService.get_project(db, project_id)
        update_data = project_in.model_dump(exclude_unset=True)

        # Validar fechas
        start_date = update_data.get("start_date") or project.start_date
        end_date = update_data.get("end_date") or project.end_date
        if start_date and end_date:
            if end_date < start_date:
                raise HTTPException(
                    status_code=400,
                    detail="La fecha de término no puede ser anterior a la fecha de inicio"
                )

        # Rastrear cambios
        changes = []
        field_labels = {
            "name": "Nombre de Obra",
            "code": "Código de Obra",
            "client_name": "Cliente / Mandante",
            "description": "Descripción",
            "address": "Dirección / Ubicación",
            "status": "Estado",
            "start_date": "Fecha de Inicio",
            "end_date": "Fecha de Término",
            "observations": "Observaciones"
        }

        for field, new_value in update_data.items():
            old_value = getattr(project, field)
            if old_value != new_value:
                old_str = old_value.strftime("%Y-%m-%d") if isinstance(old_value, datetime) else str(old_value or "Sin definir")
                new_str = new_value.strftime("%Y-%m-%d") if isinstance(new_value, datetime) else str(new_value or "Sin definir")
                
                label = field_labels.get(field, field)
                changes.append(f"- {label}: de '{old_str}' a '{new_str}'")
                setattr(project, field, new_value)

        if changes:
            log_content = "Modificaciones en el proyecto:\n" + "\n".join(changes)
            log = ProjectLog(
                project_id=project.id,
                user_id=user_id,
                log_type="SYSTEM",
                content=log_content
            )
            db.add(log)

        db.commit()
        db.refresh(project)
        return project

    @staticmethod
    def delete_project(db: Session, project_id: int, user_id: int = None):
        project = ProjectService.get_project(db, project_id)
        project.status = "INACTIVE"
        
        # También podríamos dar de baja las asignaciones activas de trabajadores
        active_assignments = db.query(ProjectAssignment).filter(
            ProjectAssignment.project_id == project_id,
            ProjectAssignment.is_active == True
        ).all()
        for assignment in active_assignments:
            assignment.is_active = False
            assignment.unassigned_at = datetime.utcnow()
        
        # Log system closing
        log = ProjectLog(
            project_id=project.id,
            user_id=user_id,
            log_type="SYSTEM",
            content="Obra finalizada oficialmente. Se desactivaron todas las dotaciones asignadas."
        )
        db.add(log)
            
        db.commit()
        return project

    @staticmethod
    def assign_worker(db: Session, project_id: int, assignment: WorkerAssignment, user_id: int = None):
        project = ProjectService.get_project(db, project_id)
        worker = db.query(Employee).filter(Employee.id == assignment.worker_id).first()
        
        if not worker:
            raise HTTPException(status_code=404, detail="Trabajador no encontrado")
        
        # Verificar si ya está asignado activamente a esta obra
        existing = db.query(ProjectAssignment).filter(
            ProjectAssignment.project_id == project_id,
            ProjectAssignment.worker_id == assignment.worker_id,
            ProjectAssignment.is_active == True
        ).first()
        
        if existing:
            raise HTTPException(status_code=400, detail="El trabajador ya está asignado a este proyecto")

        new_assignment = ProjectAssignment(
            project_id=project_id,
            worker_id=assignment.worker_id,
            role=assignment.role,
            assigned_at=datetime.utcnow()
        )
        
        db.add(new_assignment)
        
        # Log assignment
        log = ProjectLog(
            project_id=project_id,
            user_id=user_id,
            log_type="SYSTEM",
            content=f"Asignación de personal: {worker.first_name} {worker.last_name} asignado como '{assignment.role}'."
        )
        db.add(log)
        
        db.commit()
        return {"message": f"Trabajador {worker.first_name} asignado como {assignment.role} a {project.name}"}

    @staticmethod
    def create_project_log(db: Session, project_id: int, content: str, user_id: int, log_type: str = "NOTE"):
        project = ProjectService.get_project(db, project_id)
        new_log = ProjectLog(
            project_id=project_id,
            user_id=user_id,
            log_type=log_type,
            content=content
        )
        db.add(new_log)
        db.commit()
        db.refresh(new_log)
        return new_log


