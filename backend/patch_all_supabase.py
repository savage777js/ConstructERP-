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

        # 3.1 Add age column to employees table if not present
        print("Verificando/agregando 'age' a la tabla 'employees'...")
        db.execute(text("ALTER TABLE employees ADD COLUMN IF NOT EXISTS age INTEGER;"))
        try:
            db.execute(text("ALTER TABLE employees ALTER COLUMN rut DROP NOT NULL;"))
        except Exception:
            pass
        db.commit()
        print("✅ Columna 'age' y nulabilidad de 'rut' verificadas en employees.")

        # 3.2 Add rut column to users table if not present
        print("Verificando/agregando 'rut' a la tabla 'users'...")
        db.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS rut VARCHAR(50);"))
        db.commit()
        print("✅ Columna 'rut' verificada en users.")

        # 3.3 Add approved_by_manager and manager_notes columns to project_assignments if not present
        print("Verificando/agregando columnas de aprobación a 'project_assignments'...")
        db.execute(text("ALTER TABLE project_assignments ADD COLUMN IF NOT EXISTS approved_by_manager BOOLEAN DEFAULT FALSE;"))
        db.execute(text("ALTER TABLE project_assignments ADD COLUMN IF NOT EXISTS manager_notes TEXT;"))
        db.commit()
        print("✅ Columnas de aprobación verificadas en project_assignments.")

        # 4. Create or update admin user in Supabase/local
        admin = db.query(User).filter(User.email == "admin@serconind.cl").first()
        if not admin:
            print("Creando usuario admin@serconind.cl...")
            admin_user = User(
                email="admin@serconind.cl",
                hashed_password=security.get_password_hash("admin"),
                full_name="Administrador Sistema",
                role=UserRole.ADMIN,
                is_active=True,
                rut="1-9"
            )
            db.add(admin_user)
            db.commit()
            print("✅ Usuario admin@serconind.cl creado.")
        else:
            admin.rut = "1-9"
            db.commit()
            print("ℹ️ El usuario admin ya existe (actualizado RUT).")

        # 5. Create or update gerente user in Supabase/local
        gerente = db.query(User).filter(User.email == "gerente@serconind.cl").first()
        if not gerente:
            print("Creando usuario gerente@serconind.cl...")
            gerente_user = User(
                email="gerente@serconind.cl",
                hashed_password=security.get_password_hash("gerente"),
                full_name="Gerente General",
                role=UserRole.MANAGEMENT,
                is_active=True,
                rut="2-7"
            )
            db.add(gerente_user)
            db.commit()
            print("✅ Usuario gerente@serconind.cl creado.")
        else:
            gerente.rut = "2-7"
            db.commit()
            print("ℹ️ El usuario gerente ya existe (actualizado RUT).")

    except Exception as e:
        db.rollback()
        print(f"❌ Error durante el parcheado: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    patch()
