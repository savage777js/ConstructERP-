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
