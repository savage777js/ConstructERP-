from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional, List, Any
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "ConstructERP"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Seguridad - FIJADA PARA EVITAR ERRORES 401
    SECRET_KEY: str = "construct_erp_2026_secure_key_local"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7
    
    # Origins permitidos
    ALLOWED_ORIGINS: Any = []
    
    # Database - FORZAMOS LOCAL PARA EVITAR BLOQUEOS
    # Ignoramos lo que venga del entorno para asegurar que funcione en el instituto
    DATABASE_URL: str = "sqlite:///./local_erp.db"
    
    # AI - OpenRouter
    OPENROUTER_API_KEY: Optional[str] = None
    OPENROUTER_MODEL: str = "google/gemini-2.5-flash"
    
    model_config = SettingsConfigDict(
        env_file=".env", 
        extra="ignore"
    )

    def __init__(self, **values):
        super().__init__(**values)
        # HACK FINAL: Forzamos sqlite por defecto para el instituto, pero permitimos variables de entorno reales si están definidas (ej. en Sevalla o Supabase)
        env_db_url = os.environ.get("DATABASE_URL")
        if env_db_url:
            self.DATABASE_URL = env_db_url
        else:
            self.DATABASE_URL = "sqlite:///./local_erp.db"
            
        env_secret_key = os.environ.get("SECRET_KEY")
        if env_secret_key:
            self.SECRET_KEY = env_secret_key
        else:
            self.SECRET_KEY = "construct_erp_2026_fixed_key"

        env_allowed_origins = os.environ.get("ALLOWED_ORIGINS")
        if env_allowed_origins:
            self.ALLOWED_ORIGINS = [origin.strip() for origin in env_allowed_origins.split(",") if origin.strip()]
        else:
            self.ALLOWED_ORIGINS = [
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "http://localhost:5173",
                "http://127.0.0.1:5173",
            ]

settings = Settings()
