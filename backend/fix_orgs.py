from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.core import User, Organization, Employee, Project, InventoryItem

def fix_orgs():
    db = SessionLocal()
    try:
        # 1. Crear organización si no existe
        org = db.query(Organization).filter(Organization.name == "SERCONIND LTDA.").first()
        if not org:
            org = Organization(
                name="SERCONIND LTDA.",
                tax_id="77.666.555-4",
                address="Santiago, Chile",
                is_active=True
            )
            db.add(org)
            db.flush() # Para obtener el ID
        
        org_id = org.id
        print(f"🏢 Org ID: {org_id}")

        # 2. Vincular Admin
        admin = db.query(User).filter(User.email == "admin@serconind.cl").first()
        if admin:
            admin.organization_id = org_id
            print(f"👤 Admin vinculado.")

        # 3. Vincular Todo lo demás
        for emp in db.query(Employee).all():
            emp.organization_id = org_id
        
        for proj in db.query(Project).all():
            proj.organization_id = org_id
            
        for item in db.query(InventoryItem).all():
            item.organization_id = org_id

        db.commit()
        print("✅ Todo vinculado correctamente a SERCONIND LTDA.")

    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    fix_orgs()
