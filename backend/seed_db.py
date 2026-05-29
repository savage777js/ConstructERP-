from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.core import User, Employee, Project, UserRole
from app.core.security import get_password_hash
from datetime import datetime, timedelta

def seed_data():
    db = SessionLocal()
    try:
        # 1. Obtener el admin existente para vincular datos
        admin = db.query(User).filter(User.email == "admin@serconind.cl").first()
        if not admin:
            print("❌ No se encontró el usuario admin. Ejecuta el backend primero.")
            return

        org_id = admin.organization_id or "serconind_org_001"
        if not admin.organization_id:
            admin.organization_id = org_id
            db.commit()

        # 2. Agregar Trabajadores de ejemplo
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
                contract_end_date=datetime.utcnow() + timedelta(days=30),
                status="ACTIVE"
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
                contract_end_date=datetime.utcnow() + timedelta(days=50),
                status="ACTIVE"
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
                contract_end_date=datetime.utcnow() + timedelta(days=20),
                status="ACTIVE"
            )
        ]
        
        for emp in employees:
            if not db.query(Employee).filter(Employee.rut == emp.rut).first():
                db.add(emp)
        
        # 3. Agregar Proyectos de ejemplo
        projects = [
            Project(
                name="Remodelación Oficinas Centrales",
                code="PRJ-OFF-01",
                description="Modernización de fachada y red eléctrica",
                status="ACTIVE",
                organization_id=org_id,
                start_date=datetime.utcnow() - timedelta(days=30),
                end_date=datetime.utcnow() + timedelta(days=60)
            ),
            Project(
                name="Condominio Los Pinos - Fase 2",
                code="PRJ-PIN-02",
                description="Construcción de 4 torres de departamentos",
                status="ACTIVE",
                organization_id=org_id,
                start_date=datetime.utcnow() + timedelta(days=15),
                end_date=datetime.utcnow() + timedelta(days=365)
            )
        ]

        for proj in projects:
            if not db.query(Project).filter(Project.name == proj.name).first():
                db.add(proj)

        db.commit()
        print("✅ Base de datos poblada con éxito.")
        print(f"   - 3 Trabajadores añadidos.")
        print(f"   - 2 Proyectos creados.")

    except Exception as e:
        print(f"❌ Error inyectando datos: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
