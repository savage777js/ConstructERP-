"""
Script para resetear todas las contraseñas de usuarios en Supabase
a los valores definitivos de producción.
"""
import sys, os
sys.path.append(os.getcwd())
from dotenv import load_dotenv
load_dotenv()

from app.db.session import SessionLocal
from app.models.core import User
from app.core import security

PASSWORDS = {
    "admin@serconind.cl":              "admin",
    "superadmin@serconind.cl":         "admin",
    "gerente@serconind.cl":            "gerente",
    "gerente2026@serconind.cl":        "gerente",
    "rhh@serconind.cl":                "rrhh",
    "rrhh@serconind.cl":               "rrhh",
    "EncargadoProyecto@serconind.cl":  "proyectos",
    "proyectos@serconind.cl":          "proyectos",
}

db = SessionLocal()
try:
    for email, pwd in PASSWORDS.items():
        user = db.query(User).filter(User.email == email).first()
        if user:
            user.hashed_password = security.get_password_hash(pwd)
            user.is_active = True
            db.commit()
            print(f"[OK] Password reseteado: {email} -> '{pwd}'")
        else:
            print(f"[SKIP] No encontrado: {email}")
    print("\n[OK] Todos los passwords actualizados en Supabase correctamente.")
except Exception as e:
    db.rollback()
    print(f"[ERROR] {e}")
finally:
    db.close()
