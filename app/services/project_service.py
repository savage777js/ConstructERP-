from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.core import Project, Employee, InventoryItem, InventoryMovement, MovementType, ProjectAssignment
from app.schemas.project import ProjectCreate, ProjectUpdate, WorkerAssignment, InventoryAssignment
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
        
        new_project = Project(**project_in.model_dump())
        db.add(new_project)
        db.commit()
        db.refresh(new_project)
        return new_project

    @staticmethod
    def update_project(db: Session, project_id: int, project_in: ProjectUpdate):
        project = ProjectService.get_project(db, project_id)
        update_data = project_in.model_dump(exclude_unset=True)
        
        for field, value in update_data.items():
            setattr(project, field, value)
            
        db.commit()
        db.refresh(project)
        return project

    @staticmethod
    def delete_project(db: Session, project_id: int):
        project = ProjectService.get_project(db, project_id)
        project.status = "INACTIVE"
        
        # Opcional: También podríamos dar de baja las asignaciones activas de trabajadores
        active_assignments = db.query(ProjectAssignment).filter(
            ProjectAssignment.project_id == project_id,
            ProjectAssignment.is_active == True
        ).all()
        for assignment in active_assignments:
            assignment.is_active = False
            assignment.unassigned_at = datetime.utcnow()
            
        db.commit()
        return project

    @staticmethod
    def assign_worker(db: Session, project_id: int, assignment: WorkerAssignment):
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

        # Opcional: Desactivar asignaciones previas en otras obras si queremos que solo esté en una
        # db.query(ProjectAssignment).filter(
        #     ProjectAssignment.worker_id == assignment.worker_id,
        #     ProjectAssignment.is_active == True
        # ).update({"is_active": False, "unassigned_at": datetime.utcnow()})

        new_assignment = ProjectAssignment(
            project_id=project_id,
            worker_id=assignment.worker_id,
            role=assignment.role,
            assigned_at=datetime.utcnow()
        )
        
        db.add(new_assignment)
        db.commit()
        return {"message": f"Trabajador {worker.first_name} asignado como {assignment.role} a {project.name}"}

    @staticmethod
    def assign_inventory(db: Session, project_id: int, assignment: InventoryAssignment):
        project = ProjectService.get_project(db, project_id)
        item = db.query(InventoryItem).filter(InventoryItem.id == assignment.item_id).first()
        
        if not item:
            raise HTTPException(status_code=404, detail="Material no encontrado")
        
        if assignment.quantity <= 0:
            raise HTTPException(status_code=400, detail="La cantidad debe ser mayor a 0")
        
        if item.quantity_available < assignment.quantity:
            raise HTTPException(status_code=400, detail="Stock insuficiente en bodega")
            
        resulting_stock = item.quantity_available - assignment.quantity
        
        # Validar Stock Crítico
        if resulting_stock <= item.min_stock and not assignment.force_critical:
            raise HTTPException(
                status_code=409, 
                detail={
                    "code": "CRITICAL_STOCK_WARNING",
                    "message": "La operación dejará el ítem en stock crítico.",
                    "current": item.quantity_available,
                    "request": assignment.quantity,
                    "resulting": resulting_stock,
                    "min_stock": item.min_stock
                }
            )
        
        movement = InventoryMovement(
            item_id=item.id,
            project_id=project_id,
            type=MovementType.ASSIGN,
            quantity=assignment.quantity,
            comment=assignment.comment or f"Asignación a obra: {project.name}"
        )
        
        item.quantity_available = resulting_stock
        db.add(movement)
        db.commit()
        
        # Forzar el check manual de notificaciones para generar la alerta inmediata si aplica
        NotificationService._check_inventory_stock(db)
        
        return {"message": f"Asignados {assignment.quantity} {item.unit} de {item.name} a {project.name}"}
