from typing import Generator, List
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core import security
from app.core.config import settings
from app.models.core import User, UserRole

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login"
)

def get_current_user(
    db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudo validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[security.ALGORITHM]
        )
        user_id: str = payload.get("sub")
        print(f"DEBUG: Validando token para user_id: {user_id}")
        if user_id is None:
            raise credentials_exception
    except JWTError as e:
        print(f"DEBUG: Error decodificando token: {e}")
        raise credentials_exception
    
    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        print(f"DEBUG: Usuario con id {user_id} no encontrado en la DB")
        raise credentials_exception
    if not user.is_active:
        print(f"DEBUG: Usuario {user_id} está inactivo")
        raise HTTPException(status_code=400, detail="Usuario inactivo")
    
    # Audit: Temporarily disabled to prevent potential hangs during login
    # try:
    #     from sqlalchemy import text
    #     db.execute(text(f"SELECT set_config('app.current_user_id', :user_id, true)"), {"user_id": str(user.id)})
    # except Exception as e:
    #     print(f"Audit session setup failed: {e}")
        
    return user

class RoleChecker:
    def __init__(self, allowed_roles: List[UserRole]):
        self.allowed_roles = allowed_roles

    def __call__(self, user: User = Depends(get_current_user)):
        # Super Admin and legacy Admin bypass all role checks
        if user.role in [UserRole.SUPER_ADMIN, UserRole.ADMIN]:
            return user
        if user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="El usuario no tiene suficientes privilegios para esta acción"
            )
        return user
