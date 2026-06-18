import sys, os
sys.path.append(os.getcwd())
from dotenv import load_dotenv
load_dotenv()

from app.db.session import SessionLocal
from app.models.core import User, Employee, Project, Notification
from sqlalchemy import inspect, text

db = SessionLocal()

def tabla(titulo, registros, campos):
    print(f"\n{'='*60}")
    print(f"  {titulo}")
    print(f"{'='*60}")
    if not registros:
        print("  (sin registros)")
        return
    for r in registros:
        print("  ---")
        for f in campos:
            print(f"  {f}: {getattr(r, f, '-')}")

try:
    # Usuarios
    usuarios = db.query(User).all()
    tabla("USUARIOS", usuarios, ["id", "email", "full_name", "role", "is_active"])

    # Empleados
    empleados = db.query(Employee).all()
    tabla("EMPLEADOS", empleados, ["id", "full_name", "position", "department", "salary", "is_active"])

    # Proyectos
    proyectos = db.query(Project).all()
    tabla("PROYECTOS", proyectos, ["id", "name", "status", "budget", "location"])



    # Notificaciones
    notifs = db.query(Notification).all()
    tabla("NOTIFICACIONES", notifs, ["id", "title", "type", "is_read"])

    print(f"\n{'='*60}")
    print("  RESUMEN DE REGISTROS")
    print(f"{'='*60}")
    print(f"  Usuarios:        {len(usuarios)}")
    print(f"  Empleados:       {len(empleados)}")
    print(f"  Proyectos:       {len(proyectos)}")
    print(f"  Notificaciones:  {len(notifs)}")
    print(f"{'='*60}\n")

except Exception as e:
    print(f"Error: {e}")
finally:
    db.close()
