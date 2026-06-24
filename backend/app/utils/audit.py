from sqlalchemy.orm import Session
from app.models.core import AuditLog
from typing import Any, Dict, Optional
import json

def log_audit(
    db: Session,
    user_id: Optional[int],
    action: str,
    table_name: str,
    record_id: str,
    old_values: Optional[Dict[str, Any]] = None,
    new_values: Optional[Dict[str, Any]] = None
) -> None:
    """Registra un evento de auditoría en la base de datos."""
    try:
        # Convertir diccionarios a JSON serializable
        old_json = json.loads(json.dumps(old_values, default=str)) if old_values else None
        new_json = json.loads(json.dumps(new_values, default=str)) if new_values else None
        
        audit_entry = AuditLog(
            user_id=user_id,
            action=action,
            table_name=table_name,
            record_id=str(record_id),
            old_values=old_json,
            new_values=new_json
        )
        db.add(audit_entry)
        db.commit()
    except Exception as e:
        print(f"⚠️ Error escribiendo log de auditoría: {e}")
        db.rollback()
