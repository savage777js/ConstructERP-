import pytest
from app.models.core import Project, Expense, Invoice

def test_finance_operations(client, test_data, db):
    # 1. Crear un proyecto para asociar las finanzas
    proj = Project(
        name="Obra Centenario",
        code="OBR-CENT",
        client_name="Mandante Centenario",
        organization_id=test_data["org_a"].id
    )
    db.add(proj)
    db.commit()
    db.refresh(proj)

    # 2. Crear un gasto para el proyecto
    expense_data = {
        "project_id": proj.id,
        "category": "materiales",
        "description": "Compra de cemento",
        "amount": 250000.50,
        "expense_date": "2026-07-09T12:00:00Z"
    }
    res_create_exp = client.post(
        "/api/v1/finance/expenses",
        json=expense_data,
        headers=test_data["headers_a"]
    )
    assert res_create_exp.status_code == 200, f"Error creating expense: {res_create_exp.text}"
    expense_json = res_create_exp.json()
    assert expense_json["description"] == "Compra de cemento"
    assert expense_json["amount"] == "250000.50"
    
    # 3. Listar gastos del proyecto
    res_list_exp = client.get(
        f"/api/v1/finance/expenses?project_id={proj.id}",
        headers=test_data["headers_a"]
    )
    assert res_list_exp.status_code == 200
    expenses_list = res_list_exp.json()
    assert len(expenses_list) == 1
    assert expenses_list[0]["id"] == expense_json["id"]

    # 4. Cambiar estado de pago del gasto
    res_toggle_exp = client.patch(
        f"/api/v1/finance/expenses/{expense_json['id']}/status?is_paid=true",
        headers=test_data["headers_a"]
    )
    assert res_toggle_exp.status_code == 200
    assert res_toggle_exp.json()["is_paid"] is True

    # 5. Crear una factura para el proyecto
    invoice_data = {
        "project_id": proj.id,
        "client_name": "Inmobiliaria Centenario",
        "total_amount": 1500000.00,
        "status": "DRAFT",
        "issue_date": "2026-07-09T12:00:00Z"
    }
    res_create_inv = client.post(
        "/api/v1/finance/invoices",
        json=invoice_data,
        headers=test_data["headers_a"]
    )
    assert res_create_inv.status_code == 200, f"Error creating invoice: {res_create_inv.text}"
    invoice_json = res_create_inv.json()
    assert invoice_json["client_name"] == "Inmobiliaria Centenario"
    assert invoice_json["total_amount"] == "1500000.00"

    # 6. Listar facturas del proyecto
    res_list_inv = client.get(
        f"/api/v1/finance/invoices?project_id={proj.id}",
        headers=test_data["headers_a"]
    )
    assert res_list_inv.status_code == 200
    invoices_list = res_list_inv.json()
    assert len(invoices_list) == 1
    assert invoices_list[0]["id"] == invoice_json["id"]

    # 7. Cambiar estado de la factura
    res_toggle_inv = client.patch(
        f"/api/v1/finance/invoices/{invoice_json['id']}/status?status_in=PAID",
        headers=test_data["headers_a"]
    )
    assert res_toggle_inv.status_code == 200
    assert res_toggle_inv.json()["status"] == "PAID"
