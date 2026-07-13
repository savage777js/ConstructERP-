import sys
import os
sys.path.append(os.getcwd())
from app.db.session import SessionLocal
from app.models.core import User, UserRole
from app.core import security

def seed_roles():
    db = SessionLocal()
    try:
        org_id = "a71e9ecf-b833-4e99-b32b-2a02a4e9fa18"
        
        users_data = [
            {"email": "admin@serconind.cl", "role": UserRole.ADMIN, "password": "admin", "name": "Administrador Local"},
            {"email": "gerente@serconind.cl", "role": UserRole.MANAGEMENT, "password": "gerente", "name": "Gerente General"},
            {"email": "rrhh@serconind.cl", "role": UserRole.HR_MANAGER, "password": "rrhh", "name": "Jefe de Recursos Humanos"},
            {"email": "proyectos@serconind.cl", "role": UserRole.PROJECT_MANAGER, "password": "proyectos", "name": "Jefe de Proyectos"}
        ]

        for ud in users_data:
            u = db.query(User).filter(User.email == ud["email"]).first()
            if u:
                db.delete(u)
                db.commit()
            new_user = User(
                email=ud["email"],
                hashed_password=security.get_password_hash(ud["password"]),
                full_name=ud["name"],
                role=ud["role"],
                is_active=True,
                organization_id=org_id
            )
            db.add(new_user)
            db.commit()
            print(f"✅ Usuario creado/restablecido: {ud['email']} | Rol: {ud['role'].value} | Password: {ud['password']}")
            
    except Exception as e:
        print(f"❌ Error al crear usuarios de roles: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_roles()
