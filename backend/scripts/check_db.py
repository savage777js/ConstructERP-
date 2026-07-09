from app.db.session import engine
from sqlalchemy import inspect, text

def check_db():
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    print(f"Tablas encontradas: {tables}")
    
    with engine.connect() as conn:
        # 1. La tabla organizations fue eliminada. Solo operamos en modo single-tenant.
        pass
        
        # 2. Asegurar columna organization_id en users
        columns = [c['name'] for c in inspector.get_columns('users')]
        if 'organization_id' not in columns:
            print("Añadiendo organization_id a users...")
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_id UUID;"))
        
        # 3. Asegurar tabla roles y user_roles
        if 'roles' not in tables:
            print("Creando tabla roles...")
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS roles (
                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    name VARCHAR(50) UNIQUE NOT NULL,
                    slug VARCHAR(50) UNIQUE,
                    organization_id UUID,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
            """))
            
        conn.commit()
    print("Chequeo completado.")

if __name__ == "__main__":
    check_db()
