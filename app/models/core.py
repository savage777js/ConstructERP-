from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.db.session import Base
import enum
from datetime import datetime

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

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.ADMIN)
    is_active = Column(Boolean(), default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class EmployeeStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    ON_VACATION = "ON_VACATION"
    TERMINATED = "TERMINATED"

class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
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
    
    # Relationships
    assignments = relationship("ProjectAssignment", back_populates="worker")

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    code = Column(String, unique=True, index=True) # Código de obra
    client_name = Column(String)
    description = Column(String)
    address = Column(String)
    status = Column(String, default="ACTIVE")
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    observations = Column(String)

    assignments = relationship("ProjectAssignment", back_populates="project")
    movements = relationship("InventoryMovement", back_populates="project")

class ProjectAssignment(Base):
    __tablename__ = "project_assignments"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    worker_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    role = Column(String)  # Especifico para la obra (ej: Capataz, Jornalero)
    assigned_at = Column(DateTime, default=datetime.utcnow)
    unassigned_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)

    project = relationship("Project", back_populates="assignments")
    worker = relationship("Employee", back_populates="assignments")

class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    sku = Column(String, unique=True, index=True)
    category = Column(String, index=True)  # Herramientas, Materiales, EPP, etc.
    description = Column(String)
    unit = Column(String)  # un, kg, m, etc.
    quantity_total = Column(Integer, default=0)
    quantity_available = Column(Integer, default=0)
    min_stock = Column(Integer, default=0)  # Alerta de stock crítico
    location = Column(String)  # Bodega Central, Rack A1, etc.
    status = Column(String, default="ACTIVE") # ACTIVE, INACTIVE (logical delete)

    movements = relationship("InventoryMovement", back_populates="item")

class MovementType(str, enum.Enum):
    IN = "IN"
    OUT = "OUT"
    ASSIGN = "ASSIGN"
    RETURN = "RETURN"

class InventoryMovement(Base):
    __tablename__ = "inventory_movements"

    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("inventory_items.id"))
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    type = Column(Enum(MovementType))
    quantity = Column(Integer, nullable=False)
    date = Column(DateTime, default=datetime.utcnow)
    comment = Column(String)

    item = relationship("InventoryItem", back_populates="movements")
    project = relationship("Project", back_populates="movements")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(Enum(NotificationType))
    priority = Column(Enum(NotificationPriority), default=NotificationPriority.INFO)
    title = Column(String, nullable=False)
    message = Column(String, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Referencias opcionales
    link = Column(String, nullable=True)  # URL para redirigir al her de la notificación
    reference_id = Column(Integer, nullable=True) # ID genérico
