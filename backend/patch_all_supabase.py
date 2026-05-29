import sys
import os
from dotenv import load_dotenv

sys.path.append(os.getcwd())
load_dotenv()

from app.db.session import SessionLocal, engine, Base
from sqlalchemy import text
from app.models import core # Ensure models are loaded
from app.models.core import User, UserRole
from app.core import security

def patch():
    # 1. Create missing tables (e.g. project_logs)
    print("Creando tablas faltantes en Supabase si no existen...")
    Base.metadata.create_all(bind=engine)
    print("✅ Tablas creadas/verificadas.")

    db = SessionLocal()
    try:
        # 2. Add user_id column to employees table if not present
        print("Verificando/agregando 'user_id' a la tabla 'employees'...")
        db.execute(text("ALTER TABLE employees ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;"))
        db.commit()
        print("✅ Columna 'user_id' verificada en employees.")

        # 3. Add user_id column to notifications table if not present
        print("Verificando/agregando 'user_id' a la tabla 'notifications'...")
        db.execute(text("ALTER TABLE notifications ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;"))
        db.commit()
        print("✅ Columna 'user_id' verificada en notifications.")

        # 4. Create admin user in Supabase if not present
        admin = db.query(User).filter(User.email == "admin@serconind.cl").first()
        if not admin:
            print("Creando usuario admin@serconind.cl en Supabase...")
            admin_user = User(
                email="admin@serconind.cl",
                hashed_password=security.get_password_hash("admin"),
                full_name="Administrador Sistema",
                role=UserRole.ADMIN,
                is_active=True
            )
            db.add(admin_user)
            db.commit()
            print("✅ Usuario admin@serconind.cl creado.")
        else:
            print("ℹ️ El usuario admin ya existe.")

        # 5. Create gerente user in Supabase if not present
        gerente = db.query(User).filter(User.email == "gerente@serconind.cl").first()
        if not gerente:
            print("Creando usuario gerente@serconind.cl en Supabase...")
            gerente_user = User(
                email="gerente@serconind.cl",
                hashed_password=security.get_password_hash("gerente"),
                full_name="Gerente General",
                role=UserRole.MANAGEMENT,
                is_active=True
            )
            db.add(gerente_user)
            db.commit()
            print("✅ Usuario gerente@serconind.cl creado.")
        else:
            print("ℹ️ El usuario gerente ya existe.")

    except Exception as e:
        db.rollback()
        print(f"❌ Error durante el parcheado de Supabase: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    patch()
