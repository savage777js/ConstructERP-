import sys
import os
from dotenv import load_dotenv

sys.path.append(os.getcwd())
load_dotenv()

from app.db.session import SessionLocal
from sqlalchemy import text

def patch():
    db = SessionLocal()
    try:
        print("Parchando la tabla 'organizations' en Supabase...")
        db.execute(text("ALTER TABLE organizations ADD COLUMN IF NOT EXISTS tax_id VARCHAR(50);"))
        db.execute(text("ALTER TABLE organizations ADD COLUMN IF NOT EXISTS address TEXT;"))
        db.execute(text("ALTER TABLE organizations ADD COLUMN IF NOT EXISTS logo_url VARCHAR;"))
        db.execute(text("ALTER TABLE organizations ADD COLUMN IF NOT EXISTS settings JSON DEFAULT '{}';"))
        db.execute(text("ALTER TABLE organizations ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;"))
        db.execute(text("ALTER TABLE organizations ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();"))
        db.execute(text("ALTER TABLE organizations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();"))
        db.commit()
        print("✅ Columnas añadidas/verificadas en la tabla 'organizations'.")
    except Exception as e:
        db.rollback()
        print(f"❌ Error al parchar organizations: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    patch()
