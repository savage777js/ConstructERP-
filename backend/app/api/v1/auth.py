from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.core import security
from app.models.core import User, Role, Permission, UserRoleRel, role_permissions, UserRole
from app.schemas.user import Token, UserOut, UserCreate, UserMe
from app.api.deps import get_current_user, RoleChecker

router = APIRouter()

@router.get("/me", response_model=UserMe)
def read_user_me(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Retorna el perfil del usuario con sus permisos y organización."""
    
    try:
        # Obtener permisos a través de sus roles de forma segura
        permissions_query = (
            db.query(Permission.slug)
            .join(role_permissions, Permission.id == role_permissions.c.permission_id)
            .join(Role, Role.id == role_permissions.c.role_id)
            .join(UserRoleRel, Role.id == UserRoleRel.role_id)
            .filter(UserRoleRel.user_id == current_user.id)
            .all()
        )
        
        perm_list = [p[0] for p in permissions_query]
        
        # Super Admin bypass (si es admin global sin org)
        if current_user.role == "ADMIN" and not current_user.organization_id:
            all_perms = db.query(Permission.slug).all()
            perm_list = list(set(perm_list + [p[0] for p in all_perms]))

        # Convertir organización a dict para evitar problemas de serialización
        org_data = None
        if current_user.organization:
            org_data = {
                "id": str(current_user.organization.id),
                "name": current_user.organization.name
            }

        return {
            "user": current_user,
            "permissions": perm_list,
            "organization": org_data
        }
    except Exception as e:
        print(f"Error en /me: {e}")
        # Retorno básico si falla lo complejo para no bloquear el login
        return {
            "user": current_user,
            "permissions": [],
            "organization": None
        }

@router.post("/login")
def login(db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()):
    try:
        print(f"Intentando login para: {form_data.username}")
        user = db.query(User).filter(User.email == form_data.username).first()
        
        if not user:
            print("Usuario no encontrado en la DB")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email o contraseña incorrectos",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        if not security.verify_password(form_data.password, user.hashed_password):
            print("Contraseña incorrecta")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email o contraseña incorrectos",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        access_token = security.create_access_token(subject=user.id)
        print(f"✅ Login exitoso para {user.email}")
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role.value if hasattr(user.role, 'value') else str(user.role)
            }
        }
        
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        import traceback
        print("!!! ERROR CRÍTICO EN LOGIN !!!")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail="Error interno del servidor al procesar el inicio de sesión")

@router.post("/register", response_model=UserOut, dependencies=[Depends(RoleChecker([UserRole.ADMIN]))])
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_in.email).first()
    if user:
        raise HTTPException(status_code=400, detail="El usuario ya existe")
    
    new_user = User(
        email=user_in.email,
        hashed_password=security.get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role=user_in.role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user
