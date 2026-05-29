from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum, JSON, Numeric, Text, Table
from sqlalchemy.orm import relationship
from app.db.session import Base
from sqlalchemy.types import TypeDecorator, CHAR
from sqlalchemy.dialects.postgresql import UUID as pgUUID
import enum
from datetime import datetime
import uuid

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
    ADMIN = "ADMIN"
    HR_MANAGER = "HR_MANAGER"
    PROJECT_MANAGER = "PROJECT_MANAGER"
    INVENTORY_MANAGER = "INVENTORY_MANAGER"
    MANAGEMENT = "MANAGEMENT"

class NotificationType(str, enum.Enum):
    CONTRACT_EXPIRING = "CONTRACT_EXPIRING"
    STOCK_ALERT = "STOCK_ALERT"
    PROJECT_ENDING = "PROJECT_ENDING"
    SYSTEM_INFO = "SYSTEM_INFO"

class NotificationPriority(str, enum.Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"

# --- Multi-tenancy ---
class Organization(Base):
    __tablename__ = "organizations"
    id = Column(GUID, primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    tax_id = Column(String(50), unique=True)
    address = Column(Text)
    logo_url = Column(String)
    settings = Column(JSON, default={})
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    users = relationship("User", back_populates="organization")
    projects = relationship("Project", back_populates="organization")
    employees = relationship("Employee", back_populates="organization")
    documents = relationship("Document", back_populates="organization")

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
    organization_id = Column(GUID, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True)
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
    organization_id = Column(GUID, ForeignKey("organizations.id"), nullable=True)
    full_name = Column(String, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.ADMIN)
    is_active = Column(Boolean(), default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    organization = relationship("Organization", back_populates="users")
    employee = relationship("Employee", back_populates="user", uselist=False)

class EmployeeStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    ON_VACATION = "ON_VACATION"
    TERMINATED = "TERMINATED"

class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(GUID, ForeignKey("organizations.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    rut = Column(String, unique=True, index=True, nullable=False)  # Chile ID
    email = Column(String, index=True)
    phone = Column(String)
    address = Column(String)
    role = Column(String)  # Cargo del trabajador
    salary = Column(Integer, default=0)  # Sueldo
    hire_date = Column(DateTime, default=datetime.utcnow)
    contract_end_date = Column(DateTime, nullable=True)  # Vencimiento contrato
    status = Column(Enum(EmployeeStatus), default=EmployeeStatus.ACTIVE)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    organization = relationship("Organization", back_populates="employees")
    user = relationship("User", back_populates="employee")
    assignments = relationship("ProjectAssignment", back_populates="worker")
    tasks = relationship("Task", back_populates="assigned_employee")
    documents = relationship("Document", back_populates="employee")

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(GUID, ForeignKey("organizations.id"), nullable=True)
    name = Column(String, index=True, nullable=False)
    code = Column(String, unique=True, index=True) # Código de obra
    client_name = Column(String)
    description = Column(String)
    address = Column(String)
    status = Column(String, default="ACTIVE")
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    observations = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    organization = relationship("Organization", back_populates="projects")
    assignments = relationship("ProjectAssignment", back_populates="project")
    tasks = relationship("Task", back_populates="project")
    expenses = relationship("Expense", back_populates="project")
    invoices = relationship("Invoice", back_populates="project")
    documents = relationship("Document", back_populates="project")
    logs = relationship("ProjectLog", back_populates="project", cascade="all, delete-orphan")

class ProjectAssignment(Base):
    __tablename__ = "project_assignments"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    worker_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    role = Column(String)  # Especifico para la obra (ej: Capataz, Jornalero)
    assigned_at = Column(DateTime, default=datetime.utcnow)
    unassigned_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project = relationship("Project", back_populates="assignments")
    worker = relationship("Employee", back_populates="assignments")

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
    organization_id = Column(GUID, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
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

    organization = relationship("Organization", back_populates="documents")
    employee = relationship("Employee", back_populates="documents")
    project = relationship("Project", back_populates="documents")

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
    organization_id = Column(GUID, ForeignKey("organizations.id"), nullable=True)
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
    organization_id = Column(GUID, ForeignKey("organizations.id"), nullable=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    category = Column(String(100))
    description = Column(Text)
    amount = Column(Numeric(15, 2), nullable=False)
    expense_date = Column(DateTime, default=datetime.utcnow)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project = relationship("Project", back_populates="expenses")

class Invoice(Base):
    __tablename__ = "invoices"
    id = Column(GUID, primary_key=True, default=generate_uuid)
    organization_id = Column(GUID, ForeignKey("organizations.id"), nullable=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    client_name = Column(String(255), nullable=False)
    total_amount = Column(Numeric(15, 2), nullable=False)
    status = Column(String(50), default="DRAFT")
    issue_date = Column(DateTime, default=datetime.utcnow)
    due_date = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project = relationship("Project", back_populates="invoices")


