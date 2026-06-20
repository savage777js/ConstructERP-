from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.core import security
from app.models.core import User, Role, Permission, UserRoleRel, role_permissions, UserRole, Organization
from app.schemas.user import Token, UserOut, UserCreate, UserMe, UserUpdate
from app.api.deps import get_current_user, RoleChecker

router = APIRouter()

@router.get("/me", response_model=UserMe)
def read_user_me(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Retorna el perfil del usuario con sus permisos y organización."""
    try:
        permissions_query = (
            db.query(Permission.slug)
            .join(role_permissions, Permission.id == role_permissions.c.permission_id)
            .join(Role, Role.id == role_permissions.c.role_id)
            .join(UserRoleRel, Role.id == UserRoleRel.role_id)
            .filter(UserRoleRel.user_id == current_user.id)
            .all()
        )
        perm_list = [p[0] for p in permissions_query]

        # Super Admin bypass — tiene todos los permisos
        if current_user.role in [UserRole.SUPER_ADMIN, UserRole.ADMIN]:
            all_perms = db.query(Permission.slug).all()
            perm_list = list(set(perm_list + [p[0] for p in all_perms]))

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
        return {
            "user": current_user,
            "permissions": [],
            "organization": None
        }

@router.post("/login")
def login(db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()):
    try:
        user = db.query(User).filter(User.email == form_data.username).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email o contraseña incorrectos",
                headers={"WWW-Authenticate": "Bearer"},
            )
        if not security.verify_password(form_data.password, user.hashed_password):
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


# ─── Gestión de Usuarios (Solo SUPER_ADMIN / ADMIN) ──────────────────────────

@router.post("/register", response_model=UserOut)
def register(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Crear un nuevo usuario del sistema. Solo Super Administrador."""
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="No tiene permisos para crear usuarios")

    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="El usuario ya existe con ese correo")

    new_user = User(
        email=user_in.email,
        hashed_password=security.get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role=user_in.role,
        rut=user_in.rut,
        organization_id=current_user.organization_id,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.get("/users", response_model=List[UserOut])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Listar todos los usuarios de la organización. Solo Super Administrador."""
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="No tiene permisos para ver la lista de usuarios")

    query = db.query(User)
    if current_user.organization_id:
        query = query.filter(User.organization_id == current_user.organization_id)
    return query.order_by(User.created_at.desc()).all()


@router.put("/users/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Actualizar nombre, rol o restablecer contraseña de un usuario. Solo Super Administrador."""
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="No tiene permisos para editar usuarios")

    query = db.query(User).filter(User.id == user_id)
    if current_user.organization_id:
        query = query.filter(User.organization_id == current_user.organization_id)

    user = query.first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado en su organización")

    if user_in.full_name:
        user.full_name = user_in.full_name
    if user_in.email:
        user.email = user_in.email
    if user_in.role:
        user.role = user_in.role
    if user_in.rut:
        user.rut = user_in.rut
    if user_in.password:
        user.hashed_password = security.get_password_hash(user_in.password)

    db.commit()
    db.refresh(user)
    return user


@router.patch("/users/{user_id}/toggle-active", response_model=UserOut)
def toggle_user_active(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Activar o desactivar un usuario. Solo Super Administrador."""
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="No tiene permisos para modificar el estado de usuarios")

    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="No puede desactivar su propia cuenta")

    query = db.query(User).filter(User.id == user_id)
    if current_user.organization_id:
        query = query.filter(User.organization_id == current_user.organization_id)

    user = query.first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    user.is_active = not user.is_active
    db.commit()
    db.refresh(user)
    return user
