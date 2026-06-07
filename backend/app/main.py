from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1 import auth, workers, projects, notifications, dashboard, reports, ai, tasks, finance, documents
from app.db.session import engine, Base, SessionLocal
from fastapi.staticfiles import StaticFiles
import os
import threading
from sqlalchemy import text

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Pre-warm connection pool by opening a few connections in parallel
    def warm():
        db = SessionLocal()
        try:
            db.execute(text("SELECT 1"))
            print("⚡ Connection pool warmed up successfully.")
        except Exception as e:
            print(f"⚠️ Connection warmup failed: {e}")
        finally:
            db.close()
    
    # Spawn 4 threads to pre-warm the pool
    threads = []
    for _ in range(4):
        t = threading.Thread(target=warm)
        threads.append(t)
        t.start()
        
    yield

app = FastAPI(
    title="ConstructERP API",
    description="Sistema ERP Modular para la Gestión de Obras",
    version="1.0.0",
    lifespan=lifespan
)

# Middleware de cabeceras de seguridad HTTP
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    # Solo agregar HSTS en conexiones seguras HTTPS (para no romper localhost por HTTP)
    if request.url.scheme == "https":
        response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload"
    return response

# Asegurar directorios de uploads
os.makedirs("uploads/documents", exist_ok=True)

# Static files
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# CORS - Configuración segura de orígenes permitidos
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(workers.router, prefix=f"{settings.API_V1_STR}/workers", tags=["workers"])
app.include_router(projects.router, prefix=f"{settings.API_V1_STR}/projects", tags=["projects"])
app.include_router(notifications.router, prefix=f"{settings.API_V1_STR}/notifications", tags=["notifications"])
app.include_router(dashboard.router, prefix=f"{settings.API_V1_STR}/dashboard", tags=["dashboard"])
app.include_router(reports.router, prefix=f"{settings.API_V1_STR}/reports", tags=["reports"])
app.include_router(ai.router, prefix=f"{settings.API_V1_STR}/ai", tags=["ai"])
app.include_router(tasks.router, prefix=f"{settings.API_V1_STR}/tasks", tags=["tasks"])
app.include_router(finance.router, prefix=f"{settings.API_V1_STR}/finance", tags=["finance"])
app.include_router(documents.router, prefix=f"{settings.API_V1_STR}/documents", tags=["documents"])

def init_db():
    from sqlalchemy import text
    # Crear tablas
    try:
        Base.metadata.create_all(bind=engine)
        print("✅ Tablas sincronizadas con Base.metadata.")
    except Exception as e:
        print(f"⚠️ Advertencia creando tablas: {e}")

    db = SessionLocal()
    try:
        # Columna budget en projects
        try:
            db.execute(text("ALTER TABLE projects ADD COLUMN budget NUMERIC(15, 2) DEFAULT 0"))
            db.commit()
        except Exception:
            db.rollback()

        # Columna contract_type en employees
        try:
            db.execute(text("ALTER TABLE employees ADD COLUMN contract_type VARCHAR(50) DEFAULT 'INDEFINIDO'"))
            db.commit()
        except Exception:
            db.rollback()

        # Columna vacation_balance en employees
        try:
            db.execute(text("ALTER TABLE employees ADD COLUMN vacation_balance FLOAT DEFAULT 15.0"))
            db.commit()
        except Exception:
            db.rollback()

        # Columna end_date en project_assignments
        try:
            db.execute(text("ALTER TABLE project_assignments ADD COLUMN end_date TIMESTAMP"))
            db.commit()
        except Exception:
            db.rollback()

        # Columna is_paid en expenses
        try:
            db.execute(text("ALTER TABLE expenses ADD COLUMN is_paid BOOLEAN DEFAULT FALSE"))
            db.commit()
        except Exception:
            db.rollback()
    except Exception as e:
        print(f"❌ Error aplicando migraciones: {e}")
    finally:
        db.close()

    db = SessionLocal()
    try:
        from app.models.core import User, UserRole
        from app.core import security
        
        if not db.query(User).filter(User.email == "admin@serconind.cl").first():
            admin_user = User(
                email="admin@serconind.cl",
                hashed_password=security.get_password_hash("admin"),
                full_name="Administrador Local",
                role=UserRole.ADMIN,
                is_active=True
            )
            db.add(admin_user)
            db.commit()
            print("🚀 Admin local creado: admin@serconind.cl / admin")

        if not db.query(User).filter(User.email == "gerente@serconind.cl").first():
            gerente_user = User(
                email="gerente@serconind.cl",
                hashed_password=security.get_password_hash("gerente"),
                full_name="Gerente General",
                role=UserRole.MANAGEMENT,
                is_active=True
            )
            db.add(gerente_user)
            db.commit()
            print("🚀 Gerente local creado: gerente@serconind.cl / gerente")
    except Exception as e:
        print(f"❌ Error inicializando DB: {e}")
    finally:
        db.close()

init_db()

@app.get("/")
def read_root():
    return {"status": "online", "message": "Backend ConstructERP listo"}
