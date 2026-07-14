from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.services.dashboard_service import DashboardService
from app.api.deps import RoleChecker
from app.models.core import UserRole

router = APIRouter()

allow_read_dashboard = RoleChecker([
    UserRole.ADMIN, 
    UserRole.PROJECT_MANAGER, 
    UserRole.MANAGEMENT,
    UserRole.HR_MANAGER
])

@router.get("/summary", dependencies=[Depends(allow_read_dashboard)])
def get_summary(db: Session = Depends(get_db)):
    """Retorna métricas resumen para las tarjetas KPI."""
    return DashboardService.get_summary_metrics(db)

@router.get("/charts", dependencies=[Depends(allow_read_dashboard)])
def get_charts(db: Session = Depends(get_db)):
    """Retorna datos formateados para visualizaciones Recharts."""
    return DashboardService.get_chart_data(db)
