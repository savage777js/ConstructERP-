from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from typing import Optional
from app.db.session import get_db
from app.services.report_service import ReportService
from app.services.export_service import ExportService
from app.api.deps import get_current_user, RoleChecker
from app.models.core import User, UserRole
from datetime import datetime

from datetime import datetime
from app.ai.service import ai_service
from app.ai.data_fetcher import AIDataFetcher

router = APIRouter()

# Dependencias genéricas para reportes (Acceso base)
allow_reports = RoleChecker([
    UserRole.ADMIN, 
    UserRole.MANAGEMENT, 
    UserRole.HR_MANAGER, 
    UserRole.PROJECT_MANAGER, 
    UserRole.INVENTORY_MANAGER
])

@router.post("/{report_type}/analyze")
async def analyze_report(
    report_type: str,
    project_id: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_reports)
):
    """Genera un análisis inteligente del reporte solicitado usando IA."""
    
    # Obtener los datos del reporte primero
    data = get_report_data(report_type, project_id, start_date, end_date, db, current_user)
    
    if not data:
        return {"analysis": "No hay datos suficientes para realizar un análisis."}

    # Preparar el prompt para la IA
    import json
    report_json = json.dumps(data[:50]) # Limitamos a los primeros 50 registros por tokens
    
    prompt = f"""
    Como Analista Senior, analiza los siguientes datos del reporte '{report_type}':
    {report_json}
    
    Entrega un análisis breve (máximo 3 párrafos) que incluya:
    1. Resumen ejecutivo de la situación.
    2. Identificación de anomalías o puntos críticos.
    3. Una recomendación de acción inmediata.
    """
    
    analysis = await ai_service.get_chat_response(
        messages=[{"role": "user", "content": prompt}],
        bot_id="financial_analyst"
    )
    
    return {"analysis": analysis}

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
