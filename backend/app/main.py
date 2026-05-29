from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1 import auth, workers, projects, notifications, dashboard, reports, ai, tasks, finance, documents
from app.db.session import engine, Base, SessionLocal
from fastapi.staticfiles import StaticFiles
import os

app = FastAPI(
    title="ConstructERP API",
    description="Sistema ERP Modular para la Gestión de Obras",
    version="1.0.0",
)

# Asegurar directorios de uploads
os.makedirs("uploads/documents", exist_ok=True)

# Static files
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# CORS - Permitir todo para desarrollo local
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Simplificado para evitar problemas en el instituto
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
    # Crear tablas si usamos SQLite local
    if "sqlite" in settings.DATABASE_URL:
        Base.metadata.create_all(bind=engine)
        print("✅ Tablas locales creadas en SQLite.")

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
