import pytest
from app.models.core import Employee

def test_create_worker_sets_organization(client, test_data, db):
    # Admin A crea un trabajador
    worker_data = {
        "first_name": "Pedro",
        "last_name": "Rojas",
        "rut": "12.345.678-5",
        "age": 30,
        "email": "pedro.rojas@gmail.com",
        "phone": "+56911112222",
        "address": "Calle Falsa 123",
        "role": "Jornalero",
        "salary": 500000,
        "contract_type": "INDEFINIDO"
    }
    response = client.post(
        "/api/v1/workers/",
        json=worker_data,
        headers=test_data["headers_a"]
    )
    assert response.status_code == 200
    data = response.json()
    assert data["first_name"] == "Pedro"
    
    # Comprobar que en base de datos quedó asignado a la organización de Admin A
    worker_db = db.query(Employee).filter(Employee.rut == "12345678-5").first()
    assert worker_db is not None
    assert worker_db.organization_id == test_data["org_a"].id

def test_workers_multi_tenant_isolation(client, test_data, db):
    # 1. Crear un trabajador en la Org A
    worker_a = Employee(
        first_name="Juan",
        last_name="Perez",
        rut="15.432.109-8",
        role="Pintor",
        salary=600000,
        organization_id=test_data["org_a"].id
    )
    db.add(worker_a)
    db.commit()
    
    # 2. Listar trabajadores como Admin A -> Debe ver a Juan
    response_a = client.get("/api/v1/workers/", headers=test_data["headers_a"])
    assert response_a.status_code == 200
    r_data_a = response_a.json()
    assert len(r_data_a) == 1
    assert r_data_a[0]["rut"] == "15.432.109-8"
    
    # 3. Listar trabajadores como Admin B -> NO debe ver a Juan (lista vacía)
    response_b = client.get("/api/v1/workers/", headers=test_data["headers_b"])
    assert response_b.status_code == 200
    r_data_b = response_b.json()
    assert len(r_data_b) == 0

    # 4. Admin B intenta consultar a Juan de forma directa (IDOR) -> Debe devolver 404
    response_get = client.get(f"/api/v1/workers/{worker_a.id}", headers=test_data["headers_b"])
    assert response_get.status_code == 404

    # 5. Admin B intenta eliminar a Juan de forma directa (IDOR) -> Debe devolver 404
    response_del = client.delete(f"/api/v1/workers/{worker_a.id}", headers=test_data["headers_b"])
    assert response_del.status_code == 404

def test_create_vacation_request(client, test_data, db):
    # 1. Crear un trabajador en la Org A
    worker_a = Employee(
        first_name="Juan",
        last_name="Perez",
        rut="15.432.109-8",
        role="Pintor",
        salary=600000,
        organization_id=test_data["org_a"].id,
        vacation_balance=15.0
    )
    db.add(worker_a)
    db.commit()

    # 2. Intentar crear solicitud de vacaciones con token_a (usando formato simple de fecha YYYY-MM-DDT00:00:00)
    vacation_data = {
        "employee_id": worker_a.id,
        "start_date": "2026-06-25T00:00:00",
        "end_date": "2026-06-30T00:00:00",
        "days_requested": 5
    }
    response = client.post(
        "/api/v1/workers/vacations/request",
        json=vacation_data,
        headers=test_data["headers_a"]
    )
    assert response.status_code == 200, f"Error: {response.text}"
    data = response.json()
    assert data["status"] == "PENDING_APPROVAL"


def test_download_excel_template(client, test_data):
    response = client.get("/api/v1/workers/template-excel", headers=test_data["headers_a"])
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


