import httpx
from app.core.config import settings
from typing import List, Dict, Optional, Any

from app.ai.prompts import CHATBOT_PROMPTS
from app.ai.data_fetcher import AIDataFetcher
from sqlalchemy.orm import Session
import json

HR_AGENT_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "resumenGeneral",
            "description": "Obtiene un resumen general rápido del ERP (trabajadores activos, proyectos en ejecución, alertas, contratos próximos a vencer y sueldos)."
        }
    },
    {
        "type": "function",
        "function": {
            "name": "obtenerTrabajadores",
            "description": "Obtiene la lista completa de trabajadores de la empresa con su RUT, cargo, email, teléfono, estado y fecha de contratación."
        }
    },
    {
        "type": "function",
        "function": {
            "name": "obtenerContratosPorVencer",
            "description": "Obtiene la lista de contratos laborales próximos a vencer en los próximos 30 días, incluyendo el cargo y los días restantes para renovar."
        }
    },
    {
        "type": "function",
        "function": {
            "name": "obtenerAlertas",
            "description": "Obtiene el listado de alertas y notificaciones del sistema no leídas."
        }
    },
    {
        "type": "function",
        "function": {
            "name": "obtenerProyectos",
            "description": "Obtiene estadísticas del estado actual, presupuestos, gastos acumulados y dotación de personal de las obras/proyectos."
        }
    },
    {
        "type": "function",
        "function": {
            "name": "obtenerDotacion",
            "description": "Obtiene el análisis de dotación del personal, incluyendo quiénes están sin proyecto asignado, sin contrato regularizado o sin supervisión activa."
        }
    },
    {
        "type": "function",
        "function": {
            "name": "obtenerSueldos",
            "description": "Obtiene la planilla de salarios de trabajadores activos, el promedio salarial de la empresa y alertas de remuneraciones impagas. Requiere privilegios elevados (ADMIN, MANAGEMENT, HR_MANAGER)."
        }
    },
    {
        "type": "function",
        "function": {
            "name": "obtenerAsistencia",
            "description": "Obtiene la tasa de asistencia diaria del personal activo, número de atrasos y ausencias registradas hoy."
        }
    },
    {
        "type": "function",
        "function": {
            "name": "obtenerVacaciones",
            "description": "Obtiene las vacaciones programadas y solicitudes pendientes de aprobación en el ERP."
        }
    },
    {
        "type": "function",
        "function": {
            "name": "obtenerLicencias",
            "description": "Obtiene el listado de licencias médicas activas registradas. Requiere privilegios elevados (ADMIN, MANAGEMENT, HR_MANAGER)."
        }
    }
]

class AIService:
    def __init__(self):
        self.api_key = settings.OPENROUTER_API_KEY
        self.base_url = "https://openrouter.ai/api/v1/chat/completions"
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "HTTP-Referer": "https://constructerp.sevalla.app",
            "X-Title": "ConstructERP AI",
            "Content-Type": "application/json"
        }

    async def process_document(self, image_base64: str) -> Optional[Dict]:
        """Procesa una imagen de documento para extraer datos usando OCR con IA."""
        if not self.api_key:
            return None

        prompt = CHATBOT_PROMPTS.get('ocr_invoice')
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    self.base_url,
                    headers=self.headers,
                    json={
                        "model": settings.OPENROUTER_MODEL,
                        "messages": [
                            {
                                "role": "user",
                                "content": [
                                    {"type": "text", "text": prompt},
                                    {
                                        "type": "image_url",
                                        "image_url": {
                                            "url": f"data:image/jpeg;base64,{image_base64}"
                                        }
                                    }
                                ]
                            }
                        ],
                        "response_format": { "type": "json_object" },
                        "max_tokens": 4000
                    },
                    timeout=60.0
                )
                response.raise_for_status()
                content = response.json()["choices"][0]["message"]["content"]
                return json.loads(content)
            except Exception as e:
                print(f"Error in process_document: {e}")
                return None

    async def get_chat_response(
        self, 
        messages: List[Dict[str, str]], 
        bot_id: str = "hr_agent",
        db: Session = None,
        organization_id: str = None,
        current_user: Any = None
    ) -> Optional[Dict[str, Any]]:
        """
        Consulta con OpenRouter implementando Function Calling (Herramientas) y control de accesos por rol (RBAC).
        Retorna un diccionario con la respuesta y las herramientas llamadas.
        """
        if not self.api_key:
            return {
                "response": "El servicio de IA no está configurado (falta OPENROUTER_API_KEY).",
                "tool_calls_logged": []
            }

        # Obtener prompt de sistema
        system_prompt = CHATBOT_PROMPTS.get(bot_id, CHATBOT_PROMPTS['hr_agent'])
        
        # Historial completo de mensajes para enviar al LLM
        full_messages = [
            {"role": "system", "content": system_prompt}
        ] + messages

        # Setup del DataFetcher y mapeo de herramientas
        fetcher = AIDataFetcher(db, organization_id)
        user_role = current_user.role.value if (current_user and hasattr(current_user.role, 'value')) else str(current_user.role) if current_user else "GUEST"

        # Mapeo de nombres de funciones a llamadas en data fetcher
        tool_mapping = {
            "resumenGeneral": lambda: fetcher.resumenGeneral(),
            "obtenerTrabajadores": lambda: fetcher.obtenerTrabajadores(),
            "obtenerContratosPorVencer": lambda: fetcher.obtenerContratosPorVencer(),
            "obtenerAlertas": lambda: fetcher.obtenerAlertas(),
            "obtenerProyectos": lambda: fetcher.obtenerProyectos(),
            "obtenerDotacion": lambda: fetcher.obtenerDotacion(),
            "obtenerSueldos": lambda: fetcher.obtenerSueldos(user_role),
            "obtenerAsistencia": lambda: fetcher.obtenerAsistencia(),
            "obtenerVacaciones": lambda: fetcher.obtenerVacaciones(),
            "obtenerLicencias": lambda: fetcher.obtenerLicencias(user_role),
        }

        async with httpx.AsyncClient() as client:
            try:
                max_turns = 3  # Previene loops infinitos de llamadas de herramientas
                turn = 0
                tool_calls_logged = []

                while turn < max_turns:
                    # Construir payload para OpenRouter
                    payload = {
                        "model": settings.OPENROUTER_MODEL,
                        "messages": full_messages,
                        "max_tokens": 2000,
                        "temperature": 0.2
                    }

                    # Añadir herramientas si es el agente de RRHH y hay sesión activa
                    if bot_id == "hr_agent" and db is not None:
                        payload["tools"] = HR_AGENT_TOOLS
                        payload["tool_choice"] = "auto"

                    response = await client.post(
                        self.base_url,
                        headers=self.headers,
                        json=payload,
                        timeout=45.0
                    )
                    response.raise_for_status()
                    res_json = response.json()
                    
                    choice = res_json["choices"][0]
                    message = choice["message"]
                    content = message.get("content")
                    tool_calls = message.get("tool_calls")

                    # Si no hay llamadas a herramientas, es la respuesta final de texto del LLM
                    if not tool_calls:
                        return {
                            "response": content or "",
                            "tool_calls_logged": tool_calls_logged
                        }

                    # El LLM requiere llamar herramientas. Agregamos su respuesta parcial que describe los tool_calls
                    # Debemos quitar campos innecesarios del message de retorno para evitar incompatibilidades con API de OpenRouter en siguientes llamadas
                    assistant_msg = {
                        "role": "assistant",
                        "tool_calls": tool_calls
                    }
                    if content:
                        assistant_msg["content"] = content
                    
                    full_messages.append(assistant_msg)

                    # Ejecutar cada una de las herramientas
                    for tool_call in tool_calls:
                        func_name = tool_call["function"]["name"]
                        func_args = json.loads(tool_call["function"]["arguments"] or "{}")
                        
                        print(f"🤖 Agent invoca tool: {func_name} con args: {func_args}")
                        
                        if func_name in tool_mapping:
                            try:
                                result = tool_mapping[func_name]()
                            except Exception as e:
                                result = {"error": f"Error interno en la ejecución de la función: {str(e)}"}
                        else:
                            result = {"error": f"Herramienta '{func_name}' no soportada por el sistema."}

                        tool_calls_logged.append({
                            "tool": func_name,
                            "arguments": func_args,
                            "result": result
                        })

                        # Añadir la respuesta del tool al historial
                        full_messages.append({
                            "role": "tool",
                            "tool_call_id": tool_call["id"],
                            "name": func_name,
                            "content": json.dumps(result)
                        })

                    turn += 1

                # Retorno de seguridad si llega al límite de turnos
                return {
                    "response": "El agente ha alcanzado el límite máximo de consultas internas para responder esta pregunta.",
                    "tool_calls_logged": tool_calls_logged
                }

            except Exception as e:
                print(f"Error in AIService chat response: {e}")
                import traceback
                traceback.print_exc()
                return {
                    "response": "Ocurrió un error al procesar tu consulta con el motor del Agente AI.",
                    "tool_calls_logged": []
                }

ai_service = AIService()
