from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1 import auth, workers, inventory, projects, notifications, dashboard, reports, ai
from app.db.session import engine, Base
from app.models import core # Load models

# Create tables
Base.metadata.create_all(bind=engine)

# Create default admin if no users exist
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.core import User, UserRole
from app.core import security

def init_db():
    db = SessionLocal()
    try:
        if db.query(User).count() == 0:
            admin_user = User(
                email="admin@serconind.cl",
                hashed_password=security.get_password_hash("admin"),
                full_name="Administrador Sistema",
                role=UserRole.ADMIN,
                is_active=True
            )
            db.add(admin_user)
            db.commit()
            print("Default admin user created: admin@serconind.cl / admin")
    finally:
        db.close()

init_db()

app = FastAPI(
    title="ConstructERP API",
    description="Sistema ERP Modular para la Gestión de Obras",
    version="1.0.0",
)

# Set all CORS enabled origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(workers.router, prefix=f"{settings.API_V1_STR}/workers", tags=["workers"])
app.include_router(inventory.router, prefix=f"{settings.API_V1_STR}/inventory", tags=["inventory"])
app.include_router(projects.router, prefix=f"{settings.API_V1_STR}/projects", tags=["projects"])
app.include_router(notifications.router, prefix=f"{settings.API_V1_STR}/notifications", tags=["notifications"])
app.include_router(dashboard.router, prefix=f"{settings.API_V1_STR}/dashboard", tags=["dashboard"])
app.include_router(reports.router, prefix=f"{settings.API_V1_STR}/reports", tags=["reports"])
app.include_router(ai.router, prefix=f"{settings.API_V1_STR}/ai", tags=["ai"])

@app.get("/")
def read_root():
    return {"message": "Bienvenido a ConstructERP API v1"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
