from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.core import Project, Employee, ProjectAssignment, ProjectLog, Document
from app.schemas.project import ProjectCreate, ProjectUpdate, WorkerAssignment
from app.services.notification_service import NotificationService
from app.services.pdf_service import ContractService
from datetime import datetime
import uuid
import os

class ProjectService:
    @staticmethod
    def list_projects(db: Session, skip: int = 0, limit: int = 100, organization_id: str = None):
        query = db.query(Project)
        if organization_id:
            query = query.filter(Project.organization_id == organization_id)
        return query.order_by(Project.id.desc()).offset(skip).limit(limit).all()

    @staticmethod
    def get_project(db: Session, project_id: int, organization_id: str = None):
        query = db.query(Project).filter(Project.id == project_id)
        if organization_id:
            query = query.filter(Project.organization_id == organization_id)
        project = query.first()
        if not project:
            raise HTTPException(status_code=404, detail="Proyecto no encontrado")
        return project

    @staticmethod
    def create_project(db: Session, project_in: ProjectCreate, user_id: int = None, organization_id: str = None):
        if not project_in.code:
            current_year = datetime.utcnow().year
            prefix = f"OBRA-{current_year}-"
            query_existing = db.query(Project).filter(Project.code.like(f"{prefix}%"))
            if organization_id:
                query_existing = query_existing.filter(Project.organization_id == organization_id)
            existing_projects = query_existing.all()
            
            max_num = 0
            for proj in existing_projects:
                try:
                    num_str = proj.code.replace(prefix, "")
                    num = int(num_str)
                    if num > max_num:
                        max_num = num
                except ValueError:
                    continue
            
            next_num = max_num + 1
            project_in.code = f"{prefix}{next_num:03d}"
        else:
            query_code = db.query(Project).filter(Project.code == project_in.code)
            if organization_id:
                query_code = query_code.filter(Project.organization_id == organization_id)
            db_project = query_code.first()
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
        new_project.organization_id = organization_id
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

        from app.utils.audit import log_audit
        log_audit(
            db=db,
            user_id=user_id,
            action="CREATE",
            table_name="projects",
            record_id=str(new_project.id),
            new_values=project_in.model_dump()
        )

        return new_project

    @staticmethod
    def update_project(db: Session, project_id: int, project_in: ProjectUpdate, user_id: int = None, organization_id: str = None):
        project = ProjectService.get_project(db, project_id, organization_id)
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

        # Capturar valores anteriores antes de modificar
        old_values = {}
        for field in update_data.keys():
            old_val = getattr(project, field)
            old_values[field] = old_val.strftime("%Y-%m-%d") if isinstance(old_val, datetime) else old_val

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
            "observations": "Observaciones",
            "budget": "Presupuesto",
            "progress": "Avance del Proyecto"
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

        if changes:
            from app.utils.audit import log_audit
            log_audit(
                db=db,
                user_id=user_id,
                action="UPDATE",
                table_name="projects",
                record_id=str(project.id),
                old_values=old_values,
                new_values=update_data
            )

        # Recalculate progress after update
        ProjectService.recalculate_project_progress(db, project.id)

        return project

    @staticmethod
    def delete_project(db: Session, project_id: int, user_id: int = None, organization_id: str = None):
        project = ProjectService.get_project(db, project_id, organization_id)
        old_status = getattr(project, "status", "ACTIVE")
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

        from app.utils.audit import log_audit
        log_audit(
            db=db,
            user_id=user_id,
            action="DELETE",
            table_name="projects",
            record_id=str(project.id),
            old_values={"status": old_status},
            new_values={"status": "INACTIVE"}
        )

        return project

    @staticmethod
    def assign_worker(db: Session, project_id: int, assignment: WorkerAssignment, user_id: int = None, organization_id: str = None):
        project = ProjectService.get_project(db, project_id, organization_id)
        
        query_worker = db.query(Employee).filter(Employee.id == assignment.worker_id)
        if organization_id:
            query_worker = query_worker.filter(Employee.organization_id == organization_id)
        worker = query_worker.first()
        
        if not worker:
            raise HTTPException(status_code=404, detail="Trabajador no encontrado en su organización")
        
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
            assigned_at=datetime.utcnow(),
            end_date=assignment.end_date
        )
        
        db.add(new_assignment)
        
        # --- Generar automáticamente Anexo de Contrato PDF ---
        try:
            worker_data = {
                "first_name": worker.first_name,
                "last_name": worker.last_name,
                "rut": worker.rut,
                "role": worker.role,
                "salary": worker.salary,
                "hire_date": worker.hire_date
            }
            project_data = {
                "name": project.name,
                "code": project.code,
                "address": project.address
            }
            
            # Generar bytes PDF
            pdf_bytes = ContractService.generate_contract_addendum(
                worker_data=worker_data,
                project_data=project_data,
                assignment_role=assignment.role,
                start_date=datetime.utcnow(),
                end_date=assignment.end_date
            )
            
            # Crear directorio si no existe
            os.makedirs("uploads/documents", exist_ok=True)
            unique_filename = f"anexo_{worker.id}_{project_id}_{uuid.uuid4().hex[:8]}.pdf"
            file_path = f"uploads/documents/{unique_filename}"
            
            # Escribir archivo a disco
            with open(file_path, "wb") as f:
                f.write(pdf_bytes)
                
            # Registrar documento en BD
            db_doc = Document(
                organization_id=project.organization_id or worker.organization_id,
                title=f"Anexo de Contrato - Obra {project.name}",
                file_path=f"/uploads/documents/{unique_filename}",
                file_type="application/pdf",
                file_size=len(pdf_bytes),
                category="anexo_contrato",
                employee_id=worker.id,
                project_id=project_id,
                created_by=user_id
            )
            db.add(db_doc)
            print(f"[OK] Anexo de contrato generado automáticamente para {worker.first_name} en {project.name}.")
        except Exception as pdf_err:
            print(f"[ERROR] Error generando anexo de contrato PDF: {pdf_err}")

        # Copy worker's existing documents to the project folder/records
        try:
            worker_docs = db.query(Document).filter(
                Document.employee_id == worker.id,
                Document.project_id == None
            ).all()
            
            import shutil
            for w_doc in worker_docs:
                w_doc.ensure_local_file(db)
                local_path = w_doc.file_path.lstrip('/')
                if os.path.exists(local_path):
                    ext = os.path.splitext(local_path)[1].lower()
                    unique_name = f"project_copied_{project_id}_{uuid.uuid4().hex[:8]}{ext}"
                    new_path = f"uploads/documents/{unique_name}"
                    
                    shutil.copy2(local_path, new_path)
                    
                    new_doc = Document(
                        organization_id=project.organization_id or worker.organization_id,
                        title=f"[{worker.first_name} {worker.last_name}] {w_doc.title}",
                        file_path=f"/uploads/documents/{unique_name}",
                        file_type=w_doc.file_type,
                        file_size=w_doc.file_size,
                        category=w_doc.category,
                        project_id=project_id,
                        created_by=user_id,
                        ocr_status=w_doc.ocr_status,
                        ocr_content=w_doc.ocr_content,
                        extracted_data=w_doc.extracted_data
                    )
                    db.add(new_doc)
                    db.flush()
                    print(f"[OK] Copied worker doc {w_doc.title} to project {project_id}")
        except Exception as copy_err:
            print(f"[ERROR] Error copying worker documents to project folder: {copy_err}")

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
    def create_project_log(db: Session, project_id: int, content: str, user_id: int, log_type: str = "NOTE", organization_id: str = None):
        project = ProjectService.get_project(db, project_id, organization_id)
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

    @staticmethod
    def approve_assignment(db: Session, project_id: int, assignment_id: int, user_id: int, organization_id: str = None):
        from app.models.core import User
        # Validar proyecto pertenencia a la org
        project = ProjectService.get_project(db, project_id, organization_id)
        
        assignment = db.query(ProjectAssignment).filter(
            ProjectAssignment.id == assignment_id,
            ProjectAssignment.project_id == project_id
        ).first()
        if not assignment:
            raise HTTPException(status_code=404, detail="Asignación no encontrada")
        
        assignment.approved_by_manager = True
        
        user = db.query(User).filter(User.id == user_id).first()
        worker = db.query(Employee).filter(Employee.id == assignment.worker_id).first()
        
        # Log approval
        log = ProjectLog(
            project_id=project_id,
            user_id=user_id,
            log_type="SYSTEM",
            content=f"Visto Bueno otorgado para la asignación de {worker.first_name} {worker.last_name}."
        )
        db.add(log)
        db.commit()
        db.refresh(assignment)
        return assignment

    @staticmethod
    def update_assignment_notes(db: Session, project_id: int, assignment_id: int, notes: str, user_id: int, organization_id: str = None):
        from app.models.core import User
        # Validar proyecto pertenencia a la org
        project = ProjectService.get_project(db, project_id, organization_id)
        
        assignment = db.query(ProjectAssignment).filter(
            ProjectAssignment.id == assignment_id,
            ProjectAssignment.project_id == project_id
        ).first()
        if not assignment:
            raise HTTPException(status_code=404, detail="Asignación no encontrada")
        
        assignment.manager_notes = notes
        
        user = db.query(User).filter(User.id == user_id).first()
        worker = db.query(Employee).filter(Employee.id == assignment.worker_id).first()
        
        # Log note change
        log = ProjectLog(
            project_id=project_id,
            user_id=user_id,
            log_type="SYSTEM",
            content=f"Nota del Gerente sobre la asignación de {worker.first_name} {worker.last_name}: \"{notes}\"."
        )
        db.add(log)
        db.commit()
        db.refresh(assignment)
        return assignment

    @staticmethod
    def unassign_worker(db: Session, project_id: int, worker_id: int, user_id: int = None, organization_id: str = None):
        project = ProjectService.get_project(db, project_id, organization_id)
        
        query_worker = db.query(Employee).filter(Employee.id == worker_id)
        if organization_id:
            query_worker = query_worker.filter(Employee.organization_id == organization_id)
        worker = query_worker.first()
        if not worker:
            raise HTTPException(status_code=404, detail="Trabajador no encontrado en su organización")
            
        assignment = db.query(ProjectAssignment).filter(
            ProjectAssignment.project_id == project_id,
            ProjectAssignment.worker_id == worker_id,
            ProjectAssignment.is_active == True
        ).first()
        
        if not assignment:
            raise HTTPException(status_code=404, detail="El trabajador no está asignado activamente a esta obra")
            
        assignment.is_active = False
        assignment.unassigned_at = datetime.utcnow()
        
        # Log unassignment
        log = ProjectLog(
            project_id=project_id,
            user_id=user_id,
            log_type="SYSTEM",
            content=f"Asignación de personal finalizada: {worker.first_name} {worker.last_name} liberado de la obra."
        )
        db.add(log)
        db.commit()
        return {"message": f"Trabajador {worker.first_name} liberado de la obra {project.name}."}

    @staticmethod
    def add_mini_budget(db: Session, project_id: int, description: str, amount: float):
        from app.models.core import MiniBudget
        project = ProjectService.get_project(db, project_id)
        mini = MiniBudget(
            project_id=project_id,
            description=description,
            amount=amount
        )
        db.add(mini)
        
        # Log in project history
        log = ProjectLog(
            project_id=project_id,
            log_type="SYSTEM",
            content=f"Sub-presupuesto añadido: '{description}' por ${amount:,.0f}."
        )
        db.add(log)
        db.commit()
        db.refresh(mini)
        
        # Recalculate progress after budget change
        ProjectService.recalculate_project_progress(db, project_id)
        
        return mini

    @staticmethod
    def delete_mini_budget(db: Session, project_id: int, mini_budget_id: str):
        from app.models.core import MiniBudget
        mini = db.query(MiniBudget).filter(
            MiniBudget.id == mini_budget_id,
            MiniBudget.project_id == project_id
        ).first()
        if not mini:
            raise HTTPException(status_code=404, detail="Sub-presupuesto no encontrado")
            
        # Log in project history
        log = ProjectLog(
            project_id=project_id,
            log_type="SYSTEM",
            content=f"Sub-presupuesto eliminado: '{mini.description}' por ${mini.amount:,.0f}."
        )
        db.add(log)
        db.delete(mini)
        db.commit()
        
        # Recalculate progress after budget change
        ProjectService.recalculate_project_progress(db, project_id)
        
        return {"message": "Sub-presupuesto eliminado"}

    @staticmethod
    def download_project_folder(db: Session, project_id: int, organization_id: str = None):
        import io
        import zipfile
        from app.models.core import Document
        
        project = ProjectService.get_project(db, project_id, organization_id)
        
        # 1. Fetch direct project documents
        proj_docs = db.query(Document).filter(Document.project_id == project_id).all()
        
        # 2. Fetch assigned workers' documents
        active_worker_ids = db.query(ProjectAssignment.worker_id).filter(
            ProjectAssignment.project_id == project_id,
            ProjectAssignment.is_active == True
        ).all()
        worker_ids = [w[0] for w in active_worker_ids]
        
        worker_docs = []
        if worker_ids:
            worker_docs = db.query(Document).filter(Document.employee_id.in_(worker_ids)).all()
            
        # Create Zip in-memory
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "a", zipfile.ZIP_DEFLATED, False) as zip_file:
            # Write project specific docs
            for doc in proj_docs:
                doc.ensure_local_file(db)
                local_path = doc.file_path.lstrip('/')
                if os.path.exists(local_path):
                    filename = os.path.basename(local_path)
                    ext = os.path.splitext(filename)[1].lower()
                    
                    if ext in [".jpg", ".jpeg", ".png"]:
                        try:
                            with open(local_path, "rb") as img_f:
                                img_bytes = img_f.read()
                            compressed_bytes = ProjectService.compress_image_bytes(img_bytes)
                            zip_file.writestr(f"documentos_proyecto/{filename}", compressed_bytes)
                        except Exception:
                            zip_file.write(local_path, f"documentos_proyecto/{filename}")
                    else:
                        zip_file.write(local_path, f"documentos_proyecto/{filename}")
                        
            # Write worker specific docs
            for doc in worker_docs:
                doc.ensure_local_file(db)
                local_path = doc.file_path.lstrip('/')
                if os.path.exists(local_path):
                    worker_name = "desconocido"
                    if doc.employee:
                        worker_name = f"{doc.employee.first_name}_{doc.employee.last_name}".replace(" ", "_")
                    filename = os.path.basename(local_path)
                    ext = os.path.splitext(filename)[1].lower()
                    
                    if ext in [".jpg", ".jpeg", ".png"]:
                        try:
                            with open(local_path, "rb") as img_f:
                                img_bytes = img_f.read()
                            compressed_bytes = ProjectService.compress_image_bytes(img_bytes)
                            zip_file.writestr(f"documentos_trabajadores/{worker_name}/{filename}", compressed_bytes)
                        except Exception:
                            zip_file.write(local_path, f"documentos_trabajadores/{worker_name}/{filename}")
                    else:
                        zip_file.write(local_path, f"documentos_trabajadores/{worker_name}/{filename}")
                        
        zip_buffer.seek(0)
        return zip_buffer.getvalue()

    @staticmethod
    def compress_image_bytes(image_bytes: bytes, max_size=(1600, 1600), quality=75) -> bytes:
        import io
        from PIL import Image
        try:
            img = Image.open(io.BytesIO(image_bytes))
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")
            img.thumbnail(max_size, Image.Resampling.LANCZOS)
            out_bytes = io.BytesIO()
            img.save(out_bytes, format="JPEG", quality=quality, optimize=True)
            return out_bytes.getvalue()
        except Exception as e:
            print(f"Error compressing image: {e}")
            return image_bytes

    @staticmethod
    def recalculate_project_progress(db: Session, project_id: int):
        from app.models.core import Project, Expense
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            return
        
        from app.models.core import MiniBudget
        from sqlalchemy import func
        
        # Calculate sum of mini_budgets (partidas)
        mini_budget_sum = db.query(func.sum(MiniBudget.amount)).filter(MiniBudget.project_id == project_id).scalar() or 0
        ref_budget = float(mini_budget_sum) if mini_budget_sum > 0 else float(project.budget or 0)
        
        # If both are 0 or undefined, progress is 0
        if ref_budget <= 0:
            project.progress = 0
            db.commit()
            return
            
        # Sum of paid expenses and paid invoices
        from app.models.core import Invoice
        paid_expenses = db.query(
            func.sum(Expense.amount)
        ).filter(
            Expense.project_id == project_id,
            Expense.is_paid == True
        ).scalar() or 0
        
        paid_invoices = db.query(
            func.sum(Invoice.total_amount)
        ).filter(
            Invoice.project_id == project_id,
            Invoice.status == "PAID"
        ).scalar() or 0
        
        total_paid = float(paid_expenses) + float(paid_invoices)
        
        # Calculate percentage
        percentage = int((total_paid / ref_budget) * 100)
        percentage = max(0, min(100, percentage))
        
        project.progress = percentage
        db.commit()


