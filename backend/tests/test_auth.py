import pytest
from app.models.core import User, UserRole

def test_login_success(client, test_data):
    # Intentar login con credenciales válidas
    response = client.post(
        "/api/v1/auth/login",
        data={"username": "admin_a@serconind.cl", "password": "password123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "admin_a@serconind.cl"

def test_login_failure_wrong_password(client, test_data):
    # Intentar login con contraseña incorrecta
    response = client.post(
        "/api/v1/auth/login",
        data={"username": "admin_a@serconind.cl", "password": "wrongpassword"}
    )
    assert response.status_code == 401
    assert "detail" in response.json()
    # Asegurarse que no se fuga información técnica
    assert "Email o contraseña incorrectos" in response.json()["detail"]

def test_register_anonymous_forbidden(client):
    # Registro anónimo (sin autenticación) debe fallar (espera 401)
    response = client.post(
        "/api/v1/auth/register",
        json={"email": "new_user@serconind.cl", "password": "newpassword123", "full_name": "New User"}
    )
    assert response.status_code in [401, 403]

def test_register_by_admin_success(client, test_data):
    # Registro ejecutado por administrador debe tener éxito
    response = client.post(
        "/api/v1/auth/register",
        json={"email": "new_user@serconind.cl", "password": "newpassword123", "full_name": "New User"},
        headers=test_data["headers_a"]
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "new_user@serconind.cl"
    # El rol por defecto debe ser PROJECT_MANAGER (no ADMIN)
    assert data["role"] == UserRole.PROJECT_MANAGER.value

def test_change_password_requires_current_password(client, test_data):
    # Intentar cambiar contraseña sin proveer la contraseña actual (debe fallar para ADMIN/otros roles)
    response = client.put(
        "/api/v1/auth/me/password",
        json={"new_password": "newsecurepassword"},
        headers=test_data["headers_a"]
    )
    assert response.status_code == 400
    assert "Se requiere la contraseña actual" in response.json()["detail"]

def test_change_password_wrong_current_password(client, test_data):
    # Intentar cambiar contraseña con contraseña actual incorrecta
    response = client.put(
        "/api/v1/auth/me/password",
        json={"current_password": "wrongpassword", "new_password": "newsecurepassword"},
        headers=test_data["headers_a"]
    )
    assert response.status_code == 400
    assert "La contraseña actual es incorrecta" in response.json()["detail"]

def test_change_password_success(client, test_data):
    # Cambiar contraseña correctamente para usuario normal (con contraseña correcta)
    response = client.put(
        "/api/v1/auth/me/password",
        json={"current_password": "password123", "new_password": "newsecurepassword123"},
        headers=test_data["headers_a"]
    )
    assert response.status_code == 200
    assert response.json()["message"] == "Contraseña actualizada exitosamente"

def test_change_password_super_admin_direct(client, test_data, db):
    # Super admin puede cambiar contraseña directamente sin la anterior
    admin_a = test_data["admin_a"]
    admin_a.role = UserRole.SUPER_ADMIN
    db.commit()

    response = client.put(
        "/api/v1/auth/me/password",
        json={"new_password": "superadminnewpass"},
        headers=test_data["headers_a"]
    )
    assert response.status_code == 200
    assert response.json()["message"] == "Contraseña actualizada exitosamente"
