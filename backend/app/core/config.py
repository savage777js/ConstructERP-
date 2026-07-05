from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional, List, Any
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "ConstructERP"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Seguridad
    SECRET_KEY: str = "construct_erp_2026_fixed_key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Origins permitidos
    ALLOWED_ORIGINS: Any = []
    
    # Base de datos — SQLite por defecto local, PostgreSQL en produccion via env var
    DATABASE_URL: str = "sqlite:///./local_erp.db"
    
    # AI - OpenRouter
    OPENROUTER_API_KEY: Optional[str] = None
    OPENROUTER_MODEL: str = "google/gemini-2.5-flash"
    
    # pydantic_settings carga .env automaticamente (env_file=".env")
    # Las variables de entorno del sistema (Render, etc.) tienen prioridad
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    def __init__(self, **values):
        super().__init__(**values)
        # Limpiar espacios en blanco o saltos de línea del final (protección contra copy-paste)
        self.DATABASE_URL = self.DATABASE_URL.strip()
        # Normalizar DATABASE_URL para SQLAlchemy (postgres:// → postgresql://)
        if self.DATABASE_URL.startswith("postgres://"):
            self.DATABASE_URL = self.DATABASE_URL.replace("postgres://", "postgresql://", 1)
        # ALLOWED_ORIGINS desde variable de entorno como string CSV
        env_origins = os.environ.get("ALLOWED_ORIGINS")
        if env_origins:
            self.ALLOWED_ORIGINS = [o.strip().rstrip("/") for o in env_origins.split(",") if o.strip()]
        elif not self.ALLOWED_ORIGINS:
            self.ALLOWED_ORIGINS = [
                "http://localhost:3000",
                "http://localhost:3001",
                "http://127.0.0.1:3000",
                "http://localhost:5173",
                "http://127.0.0.1:5173",
            ]

settings = Settings()
