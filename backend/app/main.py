from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Depends, HTTPException
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

# Endpoint protegido para descargas de archivos subidos
from fastapi.responses import FileResponse
from app.models.core import User

# Dependencia personalizada para validar el token desde el header o parámetros de consulta (query params)
def get_file_user(request: Request):
    from jose import jwt, JWTError
    from app.core import security
    from app.db.session import SessionLocal
    
    token = None
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        
    if not token:
        token = request.query_params.get("token")
        
    if not token:
        raise HTTPException(
            status_code=401,
            detail="No se proporcionó token de autenticación",
            headers={"WWW-Authenticate": "Bearer"}
        )
        
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[security.ALGORITHM]
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Token no válido")
    except JWTError:
        raise HTTPException(status_code=401, detail="Token no válido o expirado")
        
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == int(user_id)).first()
        if user is None:
            raise HTTPException(status_code=401, detail="Usuario no encontrado")
        if not user.is_active:
            raise HTTPException(status_code=400, detail="Usuario inactivo")
        return user
    finally:
        db.close()

@app.get("/uploads/{file_path:path}")
def get_uploaded_file(
    file_path: str,
    current_user: User = Depends(get_file_user)
):
    # Validar Path Traversal
    safe_path = os.path.normpath(file_path).lstrip(os.path.sep)
    full_path = os.path.join("uploads", safe_path)
    
    # Asegurarse que se queda dentro de la carpeta uploads
    if not os.path.abspath(full_path).startswith(os.path.abspath("uploads")):
        raise HTTPException(status_code=403, detail="Acceso denegado")
        
    if not os.path.exists(full_path) or os.path.isdir(full_path):
        # Auto-recuperación de caché desde la base de datos (Supabase)
        from app.db.session import SessionLocal
        from app.models.core import Document
        
        db = SessionLocal()
        try:
            db_path = f"/{full_path.replace(os.path.sep, '/')}"
            doc = db.query(Document).filter(Document.file_path == db_path).first()
            if doc and doc.ensure_local_file(db):
                # Archivo restaurado de forma exitosa en el disco local
                pass
            else:
                raise HTTPException(status_code=404, detail="Archivo no encontrado en el servidor.")
        except HTTPException:
            raise
        except Exception as e:
            print(f"❌ Error recuperando archivo autocurable {file_path}: {e}")
            raise HTTPException(status_code=404, detail="Archivo no encontrado")
        finally:
            db.close()
        
    return FileResponse(full_path)

# CORS - Configuración segura de orígenes permitidos
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|.*\.onrender\.com)(:\d+)?",
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
        
        # Leer contraseñas de inicialización segura del entorno o asignar contraseñas por defecto seguras
        initial_admin_pwd = os.environ.get("INITIAL_ADMIN_PASSWORD", "Admin_Secure_ConstructERP_2026")
        initial_gerente_pwd = os.environ.get("INITIAL_GERENTE_PASSWORD", "Gerente_Secure_ConstructERP_2026")

        if not db.query(User).filter(User.email == "admin@serconind.cl").first():
            admin_user = User(
                email="admin@serconind.cl",
                hashed_password=security.get_password_hash(initial_admin_pwd),
                full_name="Administrador Local",
                role=UserRole.ADMIN,
                is_active=True
            )
            db.add(admin_user)
            db.commit()
            print("🚀 Admin local creado de forma segura.")

        if not db.query(User).filter(User.email == "gerente@serconind.cl").first():
            gerente_user = User(
                email="gerente@serconind.cl",
                hashed_password=security.get_password_hash(initial_gerente_pwd),
                full_name="Gerente General",
                role=UserRole.MANAGEMENT,
                is_active=True
            )
            db.add(gerente_user)
            db.commit()
            print("🚀 Gerente local creado de forma segura.")
    except Exception as e:
        print(f"❌ Error inicializando DB: {e}")
    finally:
        db.close()

init_db()

@app.get("/")
def read_root():
    return {"status": "online", "message": "Backend ConstructERP listo"}
