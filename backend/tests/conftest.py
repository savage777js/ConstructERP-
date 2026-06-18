import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.db.session import Base, get_db
from app.models.core import Organization, User, UserRole
from app.core import security

# Crear una base de datos SQLite en memoria para las pruebas
SQLALCHEMY_DATABASE_URL = "sqlite://"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def db():
    # Crear las tablas
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        # Eliminar las tablas
        Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def client(db):
    # Sobrescribir el get_db de FastAPI
    def override_get_db():
        try:
            yield db
        finally:
            pass
            
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

@pytest.fixture(scope="function")
def test_data(db):
    # Crear Organización A
    org_a = Organization(name="Serconind Org A", is_active=True)
    db.add(org_a)
    
    # Crear Organización B
    org_b = Organization(name="Competidor Org B", is_active=True)
    db.add(org_b)
    db.commit()
    
    # Crear Administrador Organización A
    admin_a = User(
        email="admin_a@serconind.cl",
        hashed_password=security.get_password_hash("password123"),
        full_name="Admin A",
        role=UserRole.ADMIN,
        organization_id=org_a.id,
        is_active=True
    )
    db.add(admin_a)

    # Crear Administrador Organización B
    admin_b = User(
        email="admin_b@competidor.cl",
        hashed_password=security.get_password_hash("password123"),
        full_name="Admin B",
        role=UserRole.ADMIN,
        organization_id=org_b.id,
        is_active=True
    )
    db.add(admin_b)
    db.commit()
    
    # Generar Tokens JWT
    token_a = security.create_access_token(subject=admin_a.id)
    token_b = security.create_access_token(subject=admin_b.id)
    
    return {
        "org_a": org_a,
        "org_b": org_b,
        "admin_a": admin_a,
        "admin_b": admin_b,
        "headers_a": {"Authorization": f"Bearer {token_a}"},
        "headers_b": {"Authorization": f"Bearer {token_b}"}
    }
