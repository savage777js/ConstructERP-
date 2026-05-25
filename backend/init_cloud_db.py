import sys
import os
from dotenv import load_dotenv

# Add current directory to path
sys.path.append(os.getcwd())

load_dotenv()

try:
    from app.db.session import engine, Base
    from app.models import core # Load models
    
    print("Conectando a la base de datos en la nube y creando tablas...")
    Base.metadata.create_all(bind=engine)
    print("✅ ¡Éxito! Las tablas han sido creadas en la base de datos de producción (ej. Sevalla).")
    
    # Initialize default admin
    from app.db.session import SessionLocal
    from app.models.core import User, UserRole
    from app.core import security
    
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
            print("✅ Usuario admin por defecto creado en la base de datos.")
        else:
            print("ℹ️ El usuario admin ya existía en la base de datos.")
    finally:
        db.close()

except Exception as e:
    print(f"❌ Error durante la inicialización: {e}")
