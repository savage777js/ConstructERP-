from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional, List

class Settings(BaseSettings):
    PROJECT_NAME: str = "ConstructERP"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Seguridad
    SECRET_KEY: str = "supersecretkey"  # Cambiar en producción vía .env
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 1 semana
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = ["*"]
    
    # Database - Soporta SQLite local y PostgreSQL (Supabase)
    DATABASE_URL: str = "sqlite:///./construct_db.sqlite"
    
    # AI - OpenRouter (Futura integración)
    OPENROUTER_API_KEY: Optional[str] = None
    OPENROUTER_MODEL: str = "google/gemini-2.0-flash-001"
    
    model_config = SettingsConfigDict(
        env_file=".env", 
        case_sensitive=True,
        extra="ignore"
    )

settings = Settings()
