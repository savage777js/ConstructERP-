from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from typing import Optional
from app.db.session import get_db
from app.services.report_service import ReportService
from app.services.export_service import ExportService
from app.api.deps import get_current_user, RoleChecker
from app.models.core import User, UserRole
from datetime import datetime

router = APIRouter()

# Dependencias genéricas para reportes (Acceso base)
allow_reports = RoleChecker([
    UserRole.ADMIN, 
    UserRole.MANAGEMENT, 
    UserRole.HR_MANAGER, 
    UserRole.PROJECT_MANAGER, 
    UserRole.INVENTORY_MANAGER
])

@router.get("/{report_type}")
def get_report_data(
    report_type: str,
    project_id: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_reports)
):
    # Parsing dates if provided
    s_date = datetime.fromisoformat(start_date) if start_date else None
    e_date = datetime.fromisoformat(end_date) if end_date else None
    
    data = []
    
    if report_type == "workers":
        data = ReportService.get_workers_report(db, current_user.role)
    elif report_type == "assignments":
        data = ReportService.get_assignments_report(db, project_id)
    elif report_type == "inventory_status":
        data = ReportService.get_inventory_status_report(db, critical_only=False)
    elif report_type == "inventory_critical":
        data = ReportService.get_inventory_status_report(db, critical_only=True)
    elif report_type == "assigned_resources":
        data = ReportService.get_assigned_resources_report(db, s_date, e_date)
    elif report_type == "projects":
        data = ReportService.get_projects_report(db)
    elif report_type == "notifications":
        data = ReportService.get_notifications_report(db, s_date, e_date)
    elif report_type == "contracts_expiring":
        data = ReportService.get_expiring_contracts_report(db)
    else:
        raise HTTPException(status_code=400, detail="Tipo de reporte inválido")
        
    return data

@router.get("/{report_type}/export")
def export_report(
    report_type: str,
    format: str = Query(..., regex="^(pdf|excel)$"),
    project_id: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_reports)
):
    # Fetch data first
    data = get_report_data(report_type, project_id, start_date, end_date, db, current_user)
    
    title_map = {
        "workers": "Listado General de Trabajadores",
        "assignments": "Trabajadores Asignados por Proyecto",
        "inventory_status": "Estado de Inventario Disponible",
        "inventory_critical": "Reporte de Stock Crítico",
        "assigned_resources": "Recursos Asignados a Obras",
        "projects": "Reporte de Proyectos Activos",
        "notifications": "Historial de Alertas del Sistema",
        "contracts_expiring": "Contratos Próximos a Vencer"
    }
    
    report_title = title_map.get(report_type, "Reporte ConstructERP")
    
    if format == "excel":
        file_content = ExportService.to_excel(data, report_title)
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        filename = f"{report_type}_{datetime.now().strftime('%Y%m%d')}.xlsx"
    else:
        file_content = ExportService.to_pdf(data, report_title)
        media_type = "application/pdf"
        filename = f"{report_type}_{datetime.now().strftime('%Y%m%d')}.pdf"
        
    return Response(
        content=file_content,
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
