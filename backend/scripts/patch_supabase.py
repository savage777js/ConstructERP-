import sys
import os
from dotenv import load_dotenv

sys.path.append(os.getcwd())
load_dotenv()

from app.db.session import SessionLocal, engine, Base
from sqlalchemy import text
from app.models import core # Ensure models are loaded

def patch():
    # 1. Create missing tables (e.g. project_logs)
    print("Creando tablas faltantes si no existen...")
    Base.metadata.create_all(bind=engine)
    print("✅ Tablas creadas/verificadas.")

    # 2. Add user_id column to employees table if not present (PostgreSQL syntax)
    db = SessionLocal()
    try:
        print("Agregando columna 'user_id' a la tabla 'employees'...")
        db.execute(text("ALTER TABLE employees ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;"))
        db.commit()
        print("✅ Columna 'user_id' agregada o verificada con éxito en Supabase.")
    except Exception as e:
        db.rollback()
        print(f"❌ Error al agregar columna: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    patch()
