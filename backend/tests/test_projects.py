import pytest
from app.models.core import Project

def test_create_project_sets_organization(client, test_data, db):
    # Admin A crea un proyecto
    proj_data = {
        "name": "Condominio Alto Sol",
        "code": "CAS-01",
        "client_name": "Inmobiliaria Sol S.A.",
        "description": "Edificación de torre de departamentos",
        "address": "Av. Las Condes 9876",
        "status": "ACTIVE",
        "budget": 150000000.00
    }
    response = client.post(
        "/api/v1/projects/",
        json=proj_data,
        headers=test_data["headers_a"]
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Condominio Alto Sol"
    
    # Comprobar asignación de organización
    proj_db = db.query(Project).filter(Project.code == "CAS-01").first()
    assert proj_db is not None
    assert proj_db.organization_id == test_data["org_a"].id

def test_projects_multi_tenant_isolation(client, test_data, db):
    # 1. Crear un proyecto en la Org A
    proj_a = Project(
        name="Obra San Damian",
        code="OSD-99",
        client_name="Mandante A",
        organization_id=test_data["org_a"].id
    )
    db.add(proj_a)
    db.commit()
    
    # 2. Listar proyectos como Admin A -> Debe ver la obra
    response_a = client.get("/api/v1/projects/", headers=test_data["headers_a"])
    assert response_a.status_code == 200
    r_data_a = response_a.json()
    assert len(r_data_a) == 1
    assert r_data_a[0]["code"] == "OSD-99"
    
    # 3. Listar proyectos como Admin B -> No debe ver nada
    response_b = client.get("/api/v1/projects/", headers=test_data["headers_b"])
    assert response_b.status_code == 200
    r_data_b = response_b.json()
    assert len(r_data_b) == 0

    # 4. Admin B intenta consultar el proyecto de forma directa -> Debe devolver 404
    response_get = client.get(f"/api/v1/projects/{proj_a.id}", headers=test_data["headers_b"])
    assert response_get.status_code == 404

    # 5. Admin B intenta dar de baja la obra -> Debe devolver 404
    response_del = client.delete(f"/api/v1/projects/{proj_a.id}", headers=test_data["headers_b"])
    assert response_del.status_code == 404
