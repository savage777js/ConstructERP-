from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum, JSON, Numeric, Text, Table, Float, LargeBinary
from sqlalchemy.orm import relationship
from app.db.session import Base
from sqlalchemy.types import TypeDecorator, CHAR
from sqlalchemy.dialects.postgresql import UUID as pgUUID
import enum
from datetime import datetime
import uuid
import os
from sqlalchemy import event, text

class GUID(TypeDecorator):
    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            return dialect.type_descriptor(pgUUID())
        else:
            return dialect.type_descriptor(CHAR(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        return str(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        return str(value)

def generate_uuid():
    return str(uuid.uuid4())

# --- Enums ---
class UserRole(str, enum.Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    ADMIN = "ADMIN"               # Legacy — same as SUPER_ADMIN
    HR_MANAGER = "HR_MANAGER"     # Recursos Humanos
    PROJECT_MANAGER = "PROJECT_MANAGER"  # Encargado de Proyecto
    INVENTORY_MANAGER = "INVENTORY_MANAGER"
    MANAGEMENT = "MANAGEMENT"     # Gerente General (solo lectura)

class NotificationType(str, enum.Enum):
    CONTRACT_EXPIRING = "CONTRACT_EXPIRING"
    STOCK_ALERT = "STOCK_ALERT"
    PROJECT_ENDING = "PROJECT_ENDING"
    SYSTEM_INFO = "SYSTEM_INFO"
    UNPAID_SALARY = "UNPAID_SALARY"
    VACATION_ALERT = "VACATION_ALERT"
    VACATION_REQUEST = "VACATION_REQUEST"
    VACATION_APPROVED = "VACATION_APPROVED"
    PROFITABILITY_ALERT = "PROFITABILITY_ALERT"

class NotificationPriority(str, enum.Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"

# --- Single-Tenant (No Multi-tenancy) ---


# --- Role Based Access Control (RBAC) ---
class Permission(Base):
    __tablename__ = "permissions"
    id = Column(GUID, primary_key=True, default=generate_uuid)
    name = Column(String(100), unique=True, nullable=False)
    slug = Column(String(100), unique=True, nullable=False)
    module = Column(String(50), nullable=False)
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

role_permissions = Table(
    "role_permissions",
    Base.metadata,
    Column("role_id", GUID, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    Column("permission_id", GUID, ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True),
)

class Role(Base):
    __tablename__ = "roles"
    id = Column(GUID, primary_key=True, default=generate_uuid)
    organization_id = Column(GUID, nullable=True)
    name = Column(String(50), unique=True, nullable=False)
    slug = Column(String(50))
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    permissions = relationship("Permission", secondary=role_permissions)

class UserRoleRel(Base):
    __tablename__ = "user_roles"
    id = Column(GUID, primary_key=True, default=generate_uuid)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    role_id = Column(GUID, ForeignKey("roles.id", ondelete="CASCADE"))
    assigned_at = Column(DateTime, default=datetime.utcnow)

# --- Core Entities ---
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    auth_id = Column(String, unique=True, index=True, nullable=True) # UUID from Supabase Auth
    organization_id = Column(GUID, nullable=True)
    full_name = Column(String, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.ADMIN)
    is_active = Column(Boolean(), default=True)
    ai_quota = Column(Integer, default=50) # Cuota de consultas gratuitas a la IA
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    rut = Column(String(50), nullable=True) # RUT del usuario administrativo

    employee = relationship("Employee", back_populates="user", uselist=False)

class EmployeeStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    ON_VACATION = "ON_VACATION"
    TERMINATED = "TERMINATED"

class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(GUID, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    rut = Column(String, unique=True, index=True, nullable=True)  # Chile ID (ahora opcional)
    age = Column(Integer, nullable=True)  # Edad del trabajador
    email = Column(String, index=True)
    phone = Column(String)
    address = Column(String)
    role = Column(String)  # Cargo del trabajador
    salary = Column(Integer, default=0)  # Sueldo
    hire_date = Column(DateTime, default=datetime.utcnow)
    contract_end_date = Column(DateTime, nullable=True)  # Vencimiento contrato
    status = Column(Enum(EmployeeStatus), default=EmployeeStatus.ACTIVE)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    contract_type = Column(String(50), default="INDEFINIDO") # 'INDEFINIDO', 'PLAZO_FIJO'
    vacation_balance_db = Column("vacation_balance", Float, default=15.0)
    afp = Column(String(50), nullable=True)
    health_system = Column(String(50), nullable=True)
    colacion = Column(Integer, default=0)
    movilizacion = Column(Integer, default=0)
    bonos = Column(Integer, default=0)

    @property
    def vacation_balance(self) -> float:
        # Calculate days of service
        start_date = self.hire_date or datetime.utcnow()
        if start_date.tzinfo is not None:
            start_date = start_date.replace(tzinfo=None)
            
        end_date = datetime.utcnow()
        if self.contract_end_date:
            contract_end = self.contract_end_date
            if contract_end.tzinfo is not None:
                contract_end = contract_end.replace(tzinfo=None)
            if contract_end < end_date:
                end_date = contract_end
            
        days_employed = (end_date - start_date).days
        if days_employed < 0:
            days_employed = 0
            
        # Accumulate 15 days per year (365 days)
        accumulated = days_employed * (15.0 / 365.0)
        
        # Cap accumulated at 30.0
        capped_accumulated = min(30.0, accumulated)
        
        # Calculate taken/rebated days
        taken_days = 0.0
        if self.vacations:
            taken_days = sum(v.days_requested for v in self.vacations if v.status == 'REBATED')
            
        # Available balance
        available = capped_accumulated - taken_days
        return max(0.0, round(available, 1))

    @vacation_balance.setter
    def vacation_balance(self, value):
        self.vacation_balance_db = value
    
    # Relationships
    user = relationship("User", back_populates="employee")
    assignments = relationship("ProjectAssignment", back_populates="worker")
    tasks = relationship("Task", back_populates="assigned_employee")
    documents = relationship("Document", back_populates="employee")
    vacations = relationship("VacationRequest", back_populates="employee", cascade="all, delete-orphan")

    @property
    def active_project(self):
        active_assignment = next((a for a in self.assignments if a.is_active), None)
        return active_assignment.project.name if active_assignment and active_assignment.project else None

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(GUID, nullable=True)
    name = Column(String, index=True, nullable=False)
    code = Column(String, unique=True, index=True) # Código de obra
    client_name = Column(String)
    description = Column(String)
    address = Column(String)
    status = Column(String, default="ACTIVE")
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    observations = Column(String)
    budget = Column(Numeric(15, 2), default=0.0)
    progress = Column(Integer, default=0) # Avance en porcentaje (0-100)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    assignments = relationship("ProjectAssignment", back_populates="project")
    tasks = relationship("Task", back_populates="project")
    expenses = relationship("Expense", back_populates="project")
    invoices = relationship("Invoice", back_populates="project")
    documents = relationship("Document", back_populates="project")
    logs = relationship("ProjectLog", back_populates="project", cascade="all, delete-orphan")
    mini_budgets = relationship("MiniBudget", back_populates="project", cascade="all, delete-orphan")

class ProjectAssignment(Base):
    __tablename__ = "project_assignments"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    worker_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    role = Column(String)  # Especifico para la obra (ej: Capataz, Jornalero)
    assigned_at = Column(DateTime, default=datetime.utcnow)
    unassigned_at = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True) # estimated assignment end / addendum expiration date
    is_active = Column(Boolean, default=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    approved_by_manager = Column(Boolean, default=False)
    manager_notes = Column(Text, nullable=True)

    project = relationship("Project", back_populates="assignments")
    worker = relationship("Employee", back_populates="assignments")

    @property
    def compliance_status(self):
        docs = self.worker.documents if self.worker else []
        has_contract = False
        has_permits = False
        has_epp = False
        
        for doc in docs:
            cat = (doc.category or "").lower()
            title = (doc.title or "").lower()
            
            # 1. Contrato
            if cat in ["contrato", "anexo_contrato"] or "contrato" in title or "anexo" in title:
                has_contract = True
                
            # 2. Permisos (Licencia, Cédula, Certificados)
            if cat in ["licencia", "cédula", "cedula", "certificado"] or any(x in title for x in ["licencia", "cedula", "rut", "certificado", "permiso", "antecedentes", "afiliacion"]):
                has_permits = True
                
            # 3. EPP
            if "epp" in title or "epp" in cat or any(x in title for x in ["epp", "entrega", "proteccion", "protección", "casco", "zapatos", "chaleco"]):
                has_epp = True
                
        # Overall status severity
        if has_contract and has_permits and has_epp:
            status = "GREEN"
        elif not has_contract:
            status = "RED" # Critical legal requirement
        else:
            status = "YELLOW" # Missing EPP or minor permits
            
        return {
            "has_contract": has_contract,
            "has_permits": has_permits,
            "has_epp": has_epp,
            "status": status
        }

class ProjectLog(Base):
    __tablename__ = "project_logs"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    log_type = Column(String(50), default="NOTE")  # "SYSTEM" or "NOTE"
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="logs")
    user = relationship("User")



# --- Document Management & OCR ---
class Document(Base):
    __tablename__ = "documents"
    id = Column(GUID, primary_key=True, default=generate_uuid)
    organization_id = Column(GUID, nullable=True)
    title = Column(String(255), nullable=False)
    file_path = Column(String, nullable=False)
    file_type = Column(String(50))
    file_size = Column(Integer)
    category = Column(String(100))
    
    ocr_status = Column(String(20), default="PENDING")
    ocr_content = Column(Text)
    extracted_data = Column(JSON, default={})
    
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    employee = relationship("Employee", back_populates="documents")
    project = relationship("Project", back_populates="documents")

    def ensure_local_file(self, db) -> bool:
        """Asegura que el archivo físico exista localmente en el servidor, recuperándolo de la base de datos si es necesario."""
        local_path = self.file_path.lstrip('/')
        if os.path.exists(local_path):
            return True
            
        try:
            doc_data = db.query(DocumentData).filter(DocumentData.document_id == self.id).first()
            if doc_data:
                os.makedirs(os.path.dirname(local_path), exist_ok=True)
                with open(local_path, "wb") as f:
                    f.write(doc_data.content)
                print(f"[INFO] Archivo recuperado exitosamente de la BD a {local_path}")
                return True
        except Exception as e:
            print(f"[ERROR] Error recuperando archivo {self.file_path} de la BD: {e}")
            
        return False

class DocumentData(Base):
    __tablename__ = "document_data"
    id = Column(GUID, primary_key=True, default=generate_uuid)
    document_id = Column(GUID, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, unique=True)
    content = Column(LargeBinary, nullable=False)

    document = relationship("Document", backref="binary_data")

@event.listens_for(Document, 'after_insert')
def save_document_binary(mapper, connection, target):
    """Event listener que detecta cuando un documento es creado en BD y almacena su contenido binario si el archivo existe en disco."""
    local_path = target.file_path.lstrip('/')
    if os.path.exists(local_path):
        try:
            with open(local_path, "rb") as f:
                content = f.read()
            
            connection.execute(
                text("INSERT INTO document_data (id, document_id, content) VALUES (:id, :doc_id, :content)"),
                {"id": generate_uuid(), "doc_id": str(target.id), "content": content}
            )
            print(f"[INFO] Contenido binario del documento '{target.title}' guardado en la base de datos.")
        except Exception as e:
            print(f"[ERROR] Error en event listener save_document_binary: {repr(e).encode('ascii', errors='replace').decode('ascii')}")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    type = Column(Enum(NotificationType))
    priority = Column(Enum(NotificationPriority), default=NotificationPriority.INFO)
    title = Column(String, nullable=False)
    message = Column(String, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    link = Column(String, nullable=True)
    reference_id = Column(Integer, nullable=True)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(GUID, primary_key=True, default=generate_uuid)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(20), nullable=False)
    table_name = Column(String(50), nullable=False)
    record_id = Column(String, nullable=False)
    old_values = Column(JSON)
    new_values = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)

class Task(Base):
    __tablename__ = "tasks"
    id = Column(GUID, primary_key=True, default=generate_uuid)
    organization_id = Column(GUID, nullable=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    assigned_to = Column(Integer, ForeignKey("employees.id"), nullable=True)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    status = Column(String(50), default="PENDING")
    priority = Column(String(50), default="MEDIUM")
    due_date = Column(DateTime)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project = relationship("Project", back_populates="tasks")
    assigned_employee = relationship("Employee", back_populates="tasks")
    comments = relationship("TaskComment", back_populates="task")

class TaskComment(Base):
    __tablename__ = "task_comments"
    id = Column(GUID, primary_key=True, default=generate_uuid)
    task_id = Column(GUID, ForeignKey("tasks.id", ondelete="CASCADE"))
    user_id = Column(Integer, ForeignKey("users.id"))
    comment = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    task = relationship("Task", back_populates="comments")

class Expense(Base):
    __tablename__ = "expenses"
    id = Column(GUID, primary_key=True, default=generate_uuid)
    organization_id = Column(GUID, nullable=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    category = Column(String(100))
    description = Column(Text)
    amount = Column(Numeric(15, 2), nullable=False)
    expense_date = Column(DateTime, default=datetime.utcnow)
    is_paid = Column(Boolean, default=False)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project = relationship("Project", back_populates="expenses")

class Invoice(Base):
    __tablename__ = "invoices"
    id = Column(GUID, primary_key=True, default=generate_uuid)
    organization_id = Column(GUID, nullable=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    client_name = Column(String(255), nullable=False)
    total_amount = Column(Numeric(15, 2), nullable=False)
    status = Column(String(50), default="DRAFT")
    issue_date = Column(DateTime, default=datetime.utcnow)
    due_date = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project = relationship("Project", back_populates="invoices")


class MiniBudget(Base):
    __tablename__ = "mini_budgets"
    id = Column(GUID, primary_key=True, default=generate_uuid)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    description = Column(String(255), nullable=False)
    amount = Column(Numeric(15, 2), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project = relationship("Project", back_populates="mini_budgets")


class VacationRequest(Base):
    __tablename__ = "vacation_requests"
    id = Column(GUID, primary_key=True, default=generate_uuid)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    days_requested = Column(Integer, nullable=False)
    status = Column(String(50), default="PENDING_APPROVAL")  # PENDING_APPROVAL, APPROVED, REJECTED, REBATED
    document_path = Column(String, nullable=True)
    is_signed = Column(Boolean, default=False)
    approved_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    rebated_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    employee = relationship("Employee", back_populates="vacations")
    approver = relationship("User", foreign_keys=[approved_by])
    rebater = relationship("User", foreign_keys=[rebated_by])


class AIAuditLog(Base):
    __tablename__ = "ai_audit_logs"
    id = Column(GUID, primary_key=True, default=generate_uuid)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    query = Column(Text, nullable=False)
    response = Column(Text, nullable=True)
    tool_calls = Column(JSON, default=[])  # Lista de herramientas invocadas, argumentos y retornos
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")



