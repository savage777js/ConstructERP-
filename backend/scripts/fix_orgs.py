from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.core import User, Employee, Project

def fix_orgs():
    db = SessionLocal()
    try:
        # 1. Usar organización estática
        org_id = "a71e9ecf-b833-4e99-b32b-2a02a4e9fa18"
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
            


        db.commit()
        print("✅ Todo vinculado correctamente a SERCONIND LTDA.")

    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    fix_orgs()
