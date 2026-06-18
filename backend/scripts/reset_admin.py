from app.db.session import SessionLocal
from app.models.core import User, UserRole
from app.core import security

def force_admin():
    db = SessionLocal()
    try:
        # Borrar si existe para evitar duplicados o hashes viejos
        user = db.query(User).filter(User.email == "admin@serconind.cl").first()
        if user:
            db.delete(user)
            db.commit()
            
        new_user = User(
            email="admin@serconind.cl",
            hashed_password=security.get_password_hash("admin"),
            full_name="Admin Maestro",
            role=UserRole.ADMIN,
            is_active=True
        )
        db.add(new_user)
        db.commit()
        print("✅ USUARIO ADMIN RE-CREADO CON ÉXITO")
        print("Email: admin@serconind.cl")
        print("Password: admin")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    force_admin()
