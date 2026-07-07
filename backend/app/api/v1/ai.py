from fastapi import APIRouter, Depends, HTTPException, status, Response
from typing import List, Dict, Any
from app.ai.service import ai_service
from app.ai.data_fetcher import AIDataFetcher
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.deps import get_current_user, RoleChecker
from app.models.core import User, AIAuditLog, UserRole
from app.services.pdf_service import ReportPDFService
from datetime import datetime
import json

router = APIRouter()

@router.get("/quota")
def get_ai_quota(current_user: User = Depends(get_current_user)):
    """
    Retorna la cuota de consultas gratuitas que le quedan al usuario actual.
    El frontend usa este endpoint para mostrar la advertencia de uso.
    """
    return {
        "remaining_quota": current_user.ai_quota,
        "total_quota": 50,
        "warning": current_user.ai_quota <= 10
    }

@router.get("/dashboard")
def get_ai_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Fase 1, 4 y 5: Genera el resumen rápido del ERP, prioridades y alertas proactivas
    directamente desde la base de datos para inicio inmediato en la UI.
    """
    try:
        user_role = current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role)
        fetcher = AIDataFetcher(db, current_user.organization_id)
        
        # 1. Obtener datos estructurados de los módulos
        resumen = fetcher.resumenGeneral()
        dotacion = fetcher.obtenerDotacion()
        contratos = fetcher.obtenerContratosPorVencer()
        alertas = fetcher.obtenerAlertas()
        
        has_hr_access = user_role in ["ADMIN", "MANAGEMENT", "HR_MANAGER"]
        licencias = fetcher.obtenerLicencias(user_role) if has_hr_access else []
        sueldos = fetcher.obtenerSueldos(user_role) if has_hr_access else None

        # 2. Fase 5: Analizar situaciones y generar alertas proactivas
        situaciones = []
        if dotacion.get("sin_proyecto", {}).get("cantidad", 0) > 0:
            situaciones.append({
                "prioridad": "MEDIA",
                "mensaje": f"{dotacion['sin_proyecto']['cantidad']} trabajador(es) activo(s) sin obra/proyecto asignado.",
                "accion": "Asignar personal a un proyecto activo."
            })
        if dotacion.get("sin_contrato", {}).get("cantidad", 0) > 0:
            situaciones.append({
                "prioridad": "ALTA",
                "mensaje": f"{dotacion['sin_contrato']['cantidad']} trabajador(es) con contrato pendiente o irregular en el sistema.",
                "accion": "Regularizar contrato en la sección de Trabajadores."
            })
        if dotacion.get("sin_supervisor", {}).get("cantidad", 0) > 0:
            situaciones.append({
                "prioridad": "BAJA",
                "mensaje": f"{dotacion['sin_supervisor']['cantidad']} jornal(es)/operario(s) sin supervisión directa en faena.",
                "accion": "Asignar a un frente de obra con capataz."
            })
        if resumen.get("contratos_por_vencer", 0) > 0:
            situaciones.append({
                "prioridad": "ALTA",
                "mensaje": f"{resumen['contratos_por_vencer']} contrato(s) próximo(s) a vencer en los siguientes 30 días.",
                "accion": "Iniciar proceso de renovación de contratos."
            })
        if resumen.get("alerta_sueldos_pendientes", False):
            situaciones.append({
                "prioridad": "ALTA",
                "mensaje": "Se detectó una alerta de remuneraciones o sueldos pendientes en el sistema.",
                "accion": "Revisar facturación o nómina del personal."
            })
        if dotacion.get("ocr_pendiente", 0) > 0:
            situaciones.append({
                "prioridad": "BAJA",
                "mensaje": f"{dotacion['ocr_pendiente']} factura(s)/documento(s) con OCR pendiente de escanear.",
                "accion": "Ir al módulo Documentos a procesar."
            })
            
        # 3. Calcular Salud Operacional (Health Score)
        penalties = 0
        penalties += resumen.get("alertas_pendientes", 0) * 1
        penalties += resumen.get("contratos_por_vencer", 0) * 4
        penalties += 10 if resumen.get("alerta_sueldos_pendientes", False) else 0
        penalties += dotacion.get("ocr_pendiente", 0) * 2
        penalties += dotacion.get("sin_proyecto", {}).get("cantidad", 0) * 3
        penalties += dotacion.get("sin_contrato", {}).get("cantidad", 0) * 5
        
        score = 100 - penalties
        score = max(50, min(100, score))
        
        if score >= 90:
            salud_texto = "Excelente"
        elif score >= 75:
            salud_texto = "Estable"
        else:
            salud_texto = "Crítica"

        # 4. Generar Acciones Recomendadas con prompts ejecutables (Fase de Botón Ejecutar)
        acciones_sugeridas = []
        for c in contratos[:2]:
            acciones_sugeridas.append({
                "id": f"renovar_{c['id']}",
                "mensaje": f"Renovar contrato de {c['nombre_completo']}",
                "query": f"Muéstrame los detalles y recomiéndame qué hacer para renovar el contrato de {c['nombre_completo']} ({c['cargo']}) que vence pronto."
            })
        for w in dotacion.get("sin_proyecto", {}).get("lista", [])[:2]:
            acciones_sugeridas.append({
                "id": f"asignar_{w['id']}",
                "mensaje": f"Asignar {w['nombre']} a Proyecto",
                "query": f"El trabajador {w['nombre']} ({w['cargo']}) está sin proyecto. Recomiéndame a qué obra lo podemos asignar según las necesidades."
            })
        if dotacion.get("ocr_pendiente", 0) > 0:
            acciones_sugeridas.append({
                "id": "validar_ocr",
                "mensaje": "Validar documentos OCR",
                "query": "Analiza las facturas y boletas pendientes de OCR y muéstrame el listado de documentos por procesar."
            })
        if resumen.get("alerta_sueldos_pendientes"):
            acciones_sugeridas.append({
                "id": "revisar_sueldos",
                "mensaje": "Revisar sueldos pendientes",
                "query": "Muéstrame las alertas y notificaciones sobre sueldos o remuneraciones pendientes en el sistema."
            })
        acciones_sugeridas.append({
            "id": "generar_informe_semanal",
            "mensaje": "Generar informe semanal",
            "query": "Generar un reporte detallado del estado de Recursos Humanos correspondiente a esta semana."
        })

        # 5. Fase 4: Definir prioridades del día para el dashboard
        prioridades = {
            "alta": [s for s in situaciones if s["prioridad"] == "ALTA"],
            "media": [s for s in situaciones if s["prioridad"] == "MEDIA"],
            "baja": [s for s in situaciones if s["prioridad"] == "BAJA"]
        }

        # 6. Fase 1: Redactar mensaje de bienvenida estructurado
        role_titles = {
            "SUPER_ADMIN": "Super Administrador",
            "ADMIN": "Administrador",
            "HR_MANAGER": "Director de Recursos Humanos",
            "PROJECT_MANAGER": "Encargado de Proyecto",
            "INVENTORY_MANAGER": "Jefe de Inventario",
            "MANAGEMENT": "Gerente General"
        }
        friendly_role = role_titles.get(user_role, "Usuario")
        welcome_msg = (
            f"Buenos días, {current_user.full_name} ({friendly_role}).\n\n"
            f"He analizado el estado actual del ERP.\n\n"
            f"**Resumen Ejecutivo:**\n"
            f"• 👷 **{resumen['trabajadores_activos']}** trabajadores activos\n"
            f"• 🏗 **{resumen['proyectos_ejecucion']}** proyectos en ejecución\n"
            f"• ⚠ **{resumen['alertas_pendientes']}** alertas pendientes\n"
            f"• 📄 **{resumen['contratos_por_vencer']}** contratos próximos a vencer\n"
        )
        if resumen.get("alerta_sueldos_pendientes"):
            welcome_msg += "• 💰 Existe una remuneración pendiente\n"
        if dotacion.get("ocr_pendiente", 0) > 0:
            welcome_msg += f"• 📑 **{dotacion['ocr_pendiente']}** documentos OCR pendientes de validación\n"
            
        welcome_msg += f"\nHe detectado {len(situaciones)} situaciones que requieren atención hoy.\n\n¿Qué desea revisar primero?"

        return {
            "resumen": resumen,
            "dotacion": dotacion,
            "contratos_por_vencer": contratos[:5],
            "alertas_recientes": alertas[:5],
            "situaciones_atencion": situaciones,
            "prioridades": prioridades,
            "welcome_message": welcome_msg,
            "salud_operacional": score,
            "salud_texto": salud_texto,
            "acciones_sugeridas": acciones_sugeridas
        }

    except Exception as e:
        print(f"Error en /dashboard: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Error interno al generar datos del Dashboard de la IA")

@router.post("/chat")
async def chat_with_ai(
    payload: Dict[str, Any], 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Fase 2, 7 y 9: Endpoint para interacción conversacional con el Agente.
    Ejecuta el loop de herramientas del Agente y audita la consulta.
    """
    messages = payload.get("messages")
    bot_id = payload.get("bot_id", "hr_agent")
    
    if not messages:
        raise HTTPException(status_code=400, detail="Messages are required")

    # --- Validar cuota gratuita de IA ---
    if current_user.ai_quota <= 0:
        raise HTTPException(
            status_code=402,
            detail=f"Capataz IA: Has agotado tus {50} consultas gratuitas. Contacta a soporte para obtener más créditos."
        )
    
    # Procesar conversación mediante el Agente con herramientas
    ai_result = await ai_service.get_chat_response(
        messages, 
        bot_id=bot_id, 
        db=db, 
        organization_id=current_user.organization_id,
        current_user=current_user
    )
    
    if not ai_result:
        raise HTTPException(status_code=500, detail="Error de comunicación con el servicio de IA")

    # Registrar en logs de auditoría (Fase 9)
    try:
        user_query = messages[-1]["content"] if messages else "Inicialización de chat"
        # Truncar la query si es muy larga
        if len(user_query) > 500:
            user_query = user_query[:497] + "..."

        audit_log = AIAuditLog(
            user_id=current_user.id,
            query=user_query,
            response=ai_result.get("response", ""),
            tool_calls=ai_result.get("tool_calls_logged", [])
        )
        db.add(audit_log)
        db.commit()
    except Exception as audit_err:
        print(f"⚠️ Error registrando auditoría de IA: {audit_err}")
        db.rollback()
    
    # --- Descontar 1 uso de la cuota ---
    try:
        current_user.ai_quota = max(0, current_user.ai_quota - 1)
        db.commit()
    except Exception as quota_err:
        print(f"⚠️ Error actualizando cuota de IA: {quota_err}")
        db.rollback()
        
    return {
        "response": ai_result.get("response", ""),
        "tool_calls": ai_result.get("tool_calls_logged", []),
        "remaining_quota": current_user.ai_quota
    }

@router.post("/report")
async def generate_executive_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Fase 8: Genera el Informe Ejecutivo consolidado de RRHH y Operaciones.
    Consulta todas las herramientas y redacta un reporte corporativo vía LLM.
    """
    user_role = current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role)
    fetcher = AIDataFetcher(db, current_user.organization_id)
    
    try:
        # Extraer todo el estado real del ERP
        resumen = fetcher.resumenGeneral()
        trabajadores = fetcher.obtenerTrabajadores()
        contratos = fetcher.obtenerContratosPorVencer()
        alertas = fetcher.obtenerAlertas()
        proyectos = fetcher.obtenerProyectos()
        dotacion = fetcher.obtenerDotacion()
        vacaciones = fetcher.obtenerVacaciones()
        
        has_hr_access = user_role in ["ADMIN", "MANAGEMENT", "HR_MANAGER"]
        sueldos = fetcher.obtenerSueldos(user_role) if has_hr_access else {"error": "Sin permisos para ver sueldos"}
        licencias = fetcher.obtenerLicencias(user_role) if has_hr_access else {"error": "Sin permisos para ver licencias"}

        # Armar el payload estructurado
        state_data = {
            "resumen_erp": resumen,
            "total_trabajadores": len(trabajadores),
            "contratos_por_vencer": contratos,
            "alertas_pendientes": alertas,
            "proyectos_obras": proyectos,
            "dotacion_irregularidades": dotacion,
            "vacaciones_solicitudes": vacaciones,
            "planilla_sueldos": sueldos,
            "licencias_medicas": licencias
        }
        
        # Generar prompt formal
        prompt = (
            "Genera un **Informe Ejecutivo de Gestión de Recursos Humanos y Operaciones** para la Gerencia General de Serconind Ltda.\n"
            f"Basate estrictamente en los siguientes datos reales del ERP:\n{json.dumps(state_data)}\n\n"
            "El informe debe ser formal, estructurado con Markdown, e incluir de manera concisa:\n"
            "1. **Resumen Ejecutivo** (Salud general de la organización)\n"
            "2. **Dotación y Carga de Personal** (Lista de trabajadores contratados pero sin proyecto asignado, indicando que representan un costo/oportunidad para reubicar, y la distribución de carga indicando qué obras tienen más personal y cuáles están vacías o con menor cantidad)\n"
            "3. **Gestión Contractual y Licencias** (Contratos por vencer o vencer pronto, licencias activas)\n"
            "4. **Finanzas y Proyectos** (Presupuestos vs. Gastos reales y dotación en obra)\n"
            "5. **Planilla Salarial** (Métricas globales de remuneraciones si están disponibles)\n"
            "6. **Recomendaciones Estratégicas** organizadas estrictamente por prioridad: **Prioridad Alta, Prioridad Media, Prioridad Baja**.\n\n"
            "No incluyas preámbulos, notas de sistema ni saludos. Empieza directamente con el título del informe en Markdown."
        )

        response = await ai_service.get_chat_response(
            messages=[{"role": "user", "content": prompt}],
            bot_id="hr_agent",
            db=None,
            organization_id=current_user.organization_id,
            current_user=current_user
        )

        # Guardar en log de auditoría
        try:
            audit_log = AIAuditLog(
                user_id=current_user.id,
                query="Generar Informe Ejecutivo de Gerencia",
                response=response.get("response", "")[:1000] + "...",
                tool_calls=[{"tool": "generar_informe_ejecutivo_completo", "arguments": {}}]
            )
            db.add(audit_log)
            db.commit()
        except Exception as audit_err:
            print(f"⚠️ Error registrando auditoría en informe: {audit_err}")
            db.rollback()

        return {"report": response.get("response", "")}
        
    except Exception as e:
        print(f"Error en /report: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Error interno al redactar el informe ejecutivo por la IA")

@router.post("/report/pdf")
async def generate_pdf_report(
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_user)
):
    """
    Fase 8: Convierte el reporte markdown de Capataz AI a PDF y lo retorna para descarga directa.
    """
    markdown_text = payload.get("markdown")
    if not markdown_text:
        raise HTTPException(status_code=400, detail="Falta el texto en markdown")
        
    try:
        pdf_content = ReportPDFService.generate_executive_report(markdown_text)
        filename = f"Informe_Ejecutivo_CapatazAI_{datetime.now().strftime('%Y-%m-%d')}.pdf"
        
        return Response(
            content=pdf_content,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        print(f"Error generando PDF de reporte: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Error al generar el archivo PDF")

@router.get("/audit", dependencies=[Depends(RoleChecker([UserRole.ADMIN]))])
def get_ai_audit_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Fase 9: Permite a los administradores del ERP consultar las auditorías del Agente AI.
    """
    try:
        logs = db.query(AIAuditLog).order_by(AIAuditLog.created_at.desc()).limit(100).all()
        result = []
        for l in logs:
            result.append({
                "id": str(l.id),
                "usuario": l.user.full_name if l.user else "Desconocido",
                "email": l.user.email if l.user else "N/A",
                "consulta": l.query,
                "herramientas_llamadas": l.tool_calls,
                "respuesta": l.response,
                "fecha": l.created_at.isoformat()
            })
        return result
    except Exception as e:
        print(f"Error en /audit: {e}")
        raise HTTPException(status_code=500, detail="Error al consultar logs de auditoría de IA")
