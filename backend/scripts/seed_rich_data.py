import sys
import os
import uuid
from dotenv import load_dotenv

# Add current directory to path
sys.path.append(os.getcwd())
load_dotenv()

from app.db.session import SessionLocal, engine
from app.models import core # Ensure models are loaded
from app.models.core import User, Employee, Project, ProjectAssignment, Expense, Notification, ProjectLog, UserRole, EmployeeStatus, NotificationType, NotificationPriority, VacationRequest, Document
from datetime import datetime, timedelta

def seed_rich_data():
    db = SessionLocal()
    try:
        print("[INFO] Iniciando siembra de datos de prueba con compatibilidad Postgres...")

        # 1. Usar organización base estática para single tenant
        org_id = "00000000-0000-0000-0000-000000000000"
        print(f"[INFO] Organizacion activa ID: {org_id}")

        # 2. Vincular Admin existente a esta Organización
        admin = db.query(User).filter(User.email == "admin@serconind.cl").first()
        if not admin:
            print("[ERROR] No se encontro el usuario admin. Crea primero las tablas y usuarios base.")
            return

        admin.organization_id = org_id
        db.commit()

        # Limpiar datos anteriores relacionados para pruebas limpias
        print("Limpiando asignaciones y logs anteriores...")
        from app.models.core import Document
        try:
            # Eliminar datos binarios de documentos primero
            db.execute(db.query(Document).statement.with_only_columns([]).execution_options(synchronize_session=False))
        except Exception:
            pass
        # Borrar usando SQL directo para respetar FK en cascada
        db.execute(__import__('sqlalchemy').text("DELETE FROM document_data"))
        db.execute(__import__('sqlalchemy').text("DELETE FROM documents"))
        db.execute(__import__('sqlalchemy').text("DELETE FROM project_assignments"))
        db.execute(__import__('sqlalchemy').text("DELETE FROM project_logs"))
        db.execute(__import__('sqlalchemy').text("DELETE FROM expenses"))
        db.execute(__import__('sqlalchemy').text("DELETE FROM notifications"))
        db.execute(__import__('sqlalchemy').text("DELETE FROM employees"))
        db.execute(__import__('sqlalchemy').text("DELETE FROM projects"))
        db.commit()

        # 3. Agregar Proyectos de ejemplo
        projects = [
            Project(
                name="Edificio Nueva Las Condes",
                code="PRJ-NLC-01",
                client_name="Inmobiliaria Territoria",
                description="Construcción de edificio corporativo de 15 pisos con certificación LEED.",
                address="Av. Las Condes 9500, Las Condes",
                status="ACTIVE",
                organization_id=org_id,
                start_date=datetime.utcnow() - timedelta(days=60),
                end_date=datetime.utcnow() + timedelta(days=120)
            ),
            Project(
                name="Habilitación Mall Plaza Vespucio",
                code="PRJ-MPV-02",
                client_name="Plaza S.A.",
                description="Remodelación de locales comerciales y zona de terrazas exteriores.",
                address="Av. Vicuña Mackenna 7110, La Florida",
                status="ACTIVE",
                organization_id=org_id,
                start_date=datetime.utcnow() - timedelta(days=15),
                end_date=datetime.utcnow() + timedelta(days=45)
            ),
            Project(
                name="Remodelación Oficinas Centrales",
                code="PRJ-OFF-03",
                client_name="Serconind Ltda.",
                description="Modernización de fachada, red eléctrica y climatización de oficinas.",
                address="Av. Providencia 1240, Providencia",
                status="ACTIVE",
                organization_id=org_id,
                start_date=datetime.utcnow() - timedelta(days=10),
                end_date=datetime.utcnow() + timedelta(days=20)
            )
        ]

        for p in projects:
            db.add(p)
        db.commit()
        print(f"[OK] {len(projects)} Proyectos insertados.")

        # 4. Agregar Empleados de ejemplo
        employees = [
            Employee(
                first_name="Carlos",
                last_name="Méndez",
                rut="12.345.678-9",
                email="c.mendez@serconind.cl",
                role="Operario de campo",
                organization_id=org_id,
                salary=850000,
                hire_date=datetime.utcnow() - timedelta(days=200),
                contract_end_date=datetime.utcnow() + timedelta(days=15), # Por vencer
                status=EmployeeStatus.ACTIVE
            ),
            Employee(
                first_name="Laura",
                last_name="Ortiz",
                rut="15.678.901-2",
                email="l.ortiz@serconind.cl",
                role="Ingeniera Civil",
                organization_id=org_id,
                salary=2200000,
                hire_date=datetime.utcnow() - timedelta(days=400),
                contract_end_date=datetime.utcnow() + timedelta(days=180),
                status=EmployeeStatus.ACTIVE
            ),
            Employee(
                first_name="Roberto",
                last_name="Silva",
                rut="18.901.234-5",
                email="r.silva@serconind.cl",
                role="Topógrafo",
                organization_id=org_id,
                salary=1200000,
                hire_date=datetime.utcnow() - timedelta(days=150),
                contract_end_date=datetime.utcnow() + timedelta(days=90),
                status=EmployeeStatus.ACTIVE
            ),
            Employee(
                first_name="Miguel",
                last_name="Yáñez",
                rut="10.456.789-0",
                email="m.yanez@serconind.cl",
                role="Capataz General",
                organization_id=org_id,
                salary=1600000,
                hire_date=datetime.utcnow() - timedelta(days=500),
                contract_end_date=datetime.utcnow() + timedelta(days=240),
                status=EmployeeStatus.ACTIVE
            ),
            Employee(
                first_name="Sofía",
                last_name="Castro",
                rut="17.234.567-8",
                email="s.castro@serconind.cl",
                role="Prevencionista de Riesgos",
                organization_id=org_id,
                salary=1400000,
                hire_date=datetime.utcnow() - timedelta(days=90),
                contract_end_date=datetime.utcnow() + timedelta(days=10), # Por vencer
                status=EmployeeStatus.ACTIVE
            ),
            Employee(
                first_name="Pedro",
                last_name="Soto",
                rut="14.345.987-1",
                email="p.soto@serconind.cl",
                role="Operario Carpintero",
                organization_id=org_id,
                salary=900000,
                hire_date=datetime.utcnow() - timedelta(days=60),
                contract_end_date=datetime.utcnow() + timedelta(days=30),
                status=EmployeeStatus.ACTIVE
            ),
            Employee(
                first_name="Jaime",
                last_name="Valdés",
                rut="13.579.246-8",
                email="j.valdes@serconind.cl",
                role="Electricista Autorizado",
                organization_id=org_id,
                salary=1100000,
                hire_date=datetime.utcnow() - timedelta(days=120),
                contract_end_date=datetime.utcnow() + timedelta(days=60),
                status=EmployeeStatus.ACTIVE
            ),
            Employee(
                first_name="Andrea",
                last_name="Riquelme",
                rut="16.248.379-K",
                email="a.riquelme@serconind.cl",
                role="Jefe de Adquisiciones",
                organization_id=org_id,
                salary=1800000,
                hire_date=datetime.utcnow() - timedelta(days=300),
                contract_end_date=datetime.utcnow() + timedelta(days=150),
                status=EmployeeStatus.ACTIVE
            ),
            Employee(
                first_name="Juan",
                last_name="Pérez",
                rut="11.222.333-4",
                email="j.perez@serconind.cl",
                role="Jornal Ayudante",
                organization_id=org_id,
                salary=650000,
                hire_date=datetime.utcnow() - timedelta(days=45),
                contract_end_date=datetime.utcnow() + timedelta(days=15), # Por vencer
                status=EmployeeStatus.ACTIVE
            ),
            Employee(
                first_name="Pablo",
                last_name="Venegas",
                rut="12.333.444-5",
                email="p.venegas@serconind.cl",
                role="Soldador Calificado",
                organization_id=org_id,
                salary=1250000,
                hire_date=datetime.utcnow() - timedelta(days=180),
                contract_end_date=datetime.utcnow() + timedelta(days=120),
                status=EmployeeStatus.ACTIVE
            ),
            Employee(
                first_name="Ana María",
                last_name="Silva",
                rut="19.876.543-2",
                email="a.silva@serconind.cl",
                role="Prevencionista Junior",
                organization_id=org_id,
                salary=950000,
                hire_date=datetime.utcnow() - timedelta(days=30),
                contract_end_date=datetime.utcnow() + timedelta(days=90),
                status=EmployeeStatus.INACTIVE # Inactivo (simulando licencia médica)
            )
        ]

        for emp in employees:
            db.add(emp)
        db.commit()
        print(f"[OK] {len(employees)} Empleados insertados.")

        # 5. Asignaciones de Personal a Obras
        assignments = [
            ProjectAssignment(project_id=projects[0].id, worker_id=employees[1].id, role="Jefe de Terreno", is_active=True),
            ProjectAssignment(project_id=projects[0].id, worker_id=employees[3].id, role="Capataz de Obra", is_active=True),
            ProjectAssignment(project_id=projects[0].id, worker_id=employees[0].id, role="Operario Jornal", is_active=True),
            ProjectAssignment(project_id=projects[0].id, worker_id=employees[6].id, role="Electricista Autorizado", is_active=True),
            ProjectAssignment(project_id=projects[0].id, worker_id=employees[9].id, role="Soldador Calificado", is_active=True),
            
            ProjectAssignment(project_id=projects[1].id, worker_id=employees[2].id, role="Topógrafo", is_active=True),
            ProjectAssignment(project_id=projects[1].id, worker_id=employees[5].id, role="Carpintero", is_active=True),
            ProjectAssignment(project_id=projects[1].id, worker_id=employees[8].id, role="Jornal Ayudante", is_active=True),
            
            ProjectAssignment(project_id=projects[2].id, worker_id=employees[4].id, role="Prevencionista de Riesgos", is_active=True),
            ProjectAssignment(project_id=projects[2].id, worker_id=employees[7].id, role="Jefe de Adquisiciones", is_active=True)
        ]

        for ass in assignments:
            db.add(ass)
        db.commit()
        print("[OK] Asignaciones creadas con exito.")

        # 6. Agregar Gastos de ejemplo (Finanzas)
        expenses = [
            Expense(
                project_id=projects[0].id,
                category="materiales",
                description="Compra de hormigón premezclado H30 - camiones Mixer",
                amount=2450000,
                expense_date=datetime.utcnow() - timedelta(days=12),
                created_by=admin.id,
                organization_id=org_id
            ),
            Expense(
                project_id=projects[0].id,
                category="materiales",
                description="Fierro corrugado estructural CAP de 12mm y 16mm",
                amount=1850000,
                expense_date=datetime.utcnow() - timedelta(days=8),
                created_by=admin.id,
                organization_id=org_id
            ),
            Expense(
                project_id=projects[1].id,
                category="servicios",
                description="Arriendo de mini cargador frontal Bobcat por 5 días",
                amount=650000,
                expense_date=datetime.utcnow() - timedelta(days=4),
                created_by=admin.id,
                organization_id=org_id
            ),
            Expense(
                project_id=projects[1].id,
                category="mano_de_obra",
                description="Bono de colación y movilización extraordinario",
                amount=320000,
                expense_date=datetime.utcnow() - timedelta(days=3),
                created_by=admin.id,
                organization_id=org_id
            ),
            Expense(
                project_id=projects[2].id,
                category="materiales",
                description="Planchas de yeso-cartón y perfiles de acero galvanizado (Volcometal)",
                amount=480000,
                expense_date=datetime.utcnow() - timedelta(days=5),
                created_by=admin.id,
                organization_id=org_id
            ),
            Expense(
                project_id=projects[2].id,
                category="otros",
                description="Adquisición de EPP y cascos homologados para visitas técnicas",
                amount=120000,
                expense_date=datetime.utcnow() - timedelta(days=2),
                created_by=admin.id,
                organization_id=org_id
            )
        ]

        for exp in expenses:
            db.add(exp)
        db.commit()
        print(f"[OK] {len(expenses)} Gastos registrados.")

        # 7. Agregar Notificaciones de Alerta
        notifications = [
            Notification(
                user_id=admin.id,
                type=NotificationType.CONTRACT_EXPIRING,
                priority=NotificationPriority.CRITICAL,
                title="Vencimiento de Contrato Cercano",
                message="El contrato de Carlos Méndez vence en menos de 15 días (fecha término: 15 de Junio).",
                is_read=False
            ),
            Notification(
                user_id=admin.id,
                type=NotificationType.CONTRACT_EXPIRING,
                priority=NotificationPriority.WARNING,
                title="Vencimiento de Contrato",
                message="El contrato de la prevencionista Sofía Castro vence en 10 días.",
                is_read=False
            ),
            Notification(
                user_id=admin.id,
                type=NotificationType.UNPAID_SALARY,
                priority=NotificationPriority.CRITICAL,
                title="Sueldo no pagado detectado",
                message="Se registran 2 liquidaciones de sueldo correspondientes al mes anterior sin comprobante de pago cargado en la obra Edificio Nueva Las Condes.",
                is_read=False
            )
        ]

        for notif in notifications:
            db.add(notif)
        db.commit()
        print("[OK] Alertas de prueba insertadas.")

        # 8. Agregar Logs de Auditoría
        logs = [
            ProjectLog(project_id=projects[0].id, user_id=admin.id, log_type="SYSTEM", content="Proyecto creado oficialmente."),
            ProjectLog(project_id=projects[0].id, user_id=admin.id, log_type="SYSTEM", content="Laura Ortiz fue asignada como Jefe de Terreno."),
            ProjectLog(project_id=projects[0].id, user_id=admin.id, log_type="NOTE", content="Recepción de Mixer 1 e inicio de hormigonado de losa del piso 2."),
            
            ProjectLog(project_id=projects[1].id, user_id=admin.id, log_type="SYSTEM", content="Proyecto creado oficialmente."),
            ProjectLog(project_id=projects[1].id, user_id=admin.id, log_type="NOTE", content="Se retiraron escombros de la excavación principal. Retraso de 2 horas por tráfico."),
            
            ProjectLog(project_id=projects[2].id, user_id=admin.id, log_type="SYSTEM", content="Proyecto creado e inicio de remodelaciones.")
        ]

        for l in logs:
            db.add(l)
        db.commit()
        print("[OK] Logs de auditoria agregados.")

        # 9. Agregar Solicitudes de Vacaciones
        vacations = [
            VacationRequest(
                employee_id=employees[1].id, # Laura Ortiz
                start_date=datetime.utcnow() + timedelta(days=5),
                end_date=datetime.utcnow() + timedelta(days=15),
                days_requested=10,
                status="PENDING_APPROVAL"
            ),
            VacationRequest(
                employee_id=employees[2].id, # Roberto Silva
                start_date=datetime.utcnow() - timedelta(days=10),
                end_date=datetime.utcnow() - timedelta(days=5),
                days_requested=5,
                status="APPROVED",
                approved_by=admin.id
            ),
            VacationRequest(
                employee_id=employees[0].id, # Carlos Méndez
                start_date=datetime.utcnow() - timedelta(days=30),
                end_date=datetime.utcnow() - timedelta(days=15),
                days_requested=15,
                status="REBATED",
                approved_by=admin.id,
                rebated_by=admin.id
            )
        ]
        for v in vacations:
            db.add(v)
        db.commit()
        print("[OK] Solicitudes de vacaciones agregadas.")

        # 10. Agregar Documentos (contratos, cédulas, licencias médicas)
        documents = [
            Document(
                title="Licencia Medica - Ana Maria Silva.pdf",
                file_path="/uploads/licencia_ana_maria.pdf",
                file_type="application/pdf",
                file_size=102400,
                category="Licencia",
                ocr_status="COMPLETED",
                ocr_content="Licencia médica de reposo por 15 días para Ana María Silva RUT 19.876.543-2 por fractura.",
                employee_id=employees[10].id,
                created_by=admin.id,
                organization_id=org_id
            ),
            Document(
                title="Contrato de Trabajo - Laura Ortiz.pdf",
                file_path="/uploads/contrato_laura_ortiz.pdf",
                file_type="application/pdf",
                file_size=204800,
                category="Contrato",
                ocr_status="COMPLETED",
                ocr_content="Contrato de trabajo Laura Ortiz RUT 15.678.901-2 Ingeniera Civil.",
                employee_id=employees[1].id,
                created_by=admin.id,
                organization_id=org_id
            ),
            Document(
                title="Cedula de Identidad - Laura Ortiz.pdf",
                file_path="/uploads/cedula_laura_ortiz.pdf",
                file_type="application/pdf",
                file_size=95000,
                category="Cédula",
                ocr_status="COMPLETED",
                employee_id=employees[1].id,
                created_by=admin.id,
                organization_id=org_id
            ),
            Document(
                title="Contrato de Trabajo - Carlos Mendez.pdf",
                file_path="/uploads/contrato_carlos_mendez.pdf",
                file_type="application/pdf",
                file_size=150000,
                category="Contrato",
                ocr_status="COMPLETED",
                employee_id=employees[0].id,
                created_by=admin.id,
                organization_id=org_id
            ),
            Document(
                title="Entrega EPP - Sofia Castro.pdf",
                file_path="/uploads/epp_sofia_castro.pdf",
                file_type="application/pdf",
                file_size=88000,
                category="EPP",
                ocr_status="COMPLETED",
                employee_id=employees[4].id,
                created_by=admin.id,
                organization_id=org_id
            )
        ]
        for d in documents:
            db.add(d)
        db.commit()
        print("[OK] Documentos de prueba y licencias insertados.")

        print("\n[OK] Siembra enriquecida de datos finalizada exitosamente! Todo listo para pruebas.")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Error inyectando datos de prueba: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_rich_data()
