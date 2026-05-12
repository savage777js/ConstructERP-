import httpx
from app.core.config import settings
from typing import List, Dict, Optional

from app.ai.prompts import CHATBOT_PROMPTS
from app.ai.data_fetcher import AIDataFetcher
from sqlalchemy.orm import Session
import json

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

    async def get_chat_response(
        self, 
        messages: List[Dict[str, str]], 
        bot_id: str = "erp_assistant",
        db: Session = None,
        organization_id: str = None
    ) -> Optional[str]:
        if not self.api_key:
            return "AI Service not configured."

        system_prompt = CHATBOT_PROMPTS.get(bot_id, CHATBOT_PROMPTS['erp_assistant'])
        
        # Inyectar instrucción de herramientas si hay DB disponible
        if db and organization_id:
            system_prompt += "\n\nPUEDES CONSULTAR DATOS: Si el usuario pide datos (finanzas, proyectos, personal), responde ÚNICAMENTE con un JSON con este formato: {\"action\": \"query\", \"type\": \"finance|projects|employees\", \"params\": {}}. No digas nada más."

        full_messages = [
            {"role": "system", "content": system_prompt}
        ] + messages

        async with httpx.AsyncClient() as client:
            try:
                # Paso 1: Ver si la IA necesita datos
                response = await client.post(
                    self.base_url,
                    headers=self.headers,
                    json={
                        "model": settings.OPENROUTER_MODEL,
                        "messages": full_messages
                    },
                    timeout=30.0
                )
                response.raise_for_status()
                ai_msg = response.json()["choices"][0]["message"]["content"]

                # Paso 2: Procesar comando de datos si existe (Solo una vez para evitar bucles)
                if '{"action": "query"' in ai_msg and db and organization_id:
                    try:
                        # Limpiar el mensaje de posibles textos extra que la IA añada fuera del JSON
                        json_str = ai_msg[ai_msg.find('{'):ai_msg.rfind('}')+1]
                        cmd = json.loads(json_str)
                        
                        fetcher = AIDataFetcher(db, organization_id)
                        data = {}
                        
                        if cmd.get("type") == "finance":
                            data = fetcher.get_financial_summary()
                        elif cmd.get("type") == "projects":
                            data = fetcher.get_project_stats(cmd.get("params", {}).get("project_name"))
                        elif cmd.get("type") == "employees":
                            data = fetcher.get_employee_stats()

                        # Enviar datos de vuelta a la IA para respuesta final
                        # No incluimos el JSON original de la IA para que no se confunda
                        full_messages.append({"role": "system", "content": f"DATOS REALES DEL ERP: {json.dumps(data)}. Responde ahora al usuario de forma natural usando estas cifras."})
                        
                        final_response = await client.post(
                            self.base_url,
                            headers=self.headers,
                            json={
                                "model": settings.OPENROUTER_MODEL,
                                "messages": full_messages
                            },
                            timeout=30.0
                        )
                        return final_response.json()["choices"][0]["message"]["content"]
                    except Exception as e:
                        print(f"Error processing AI command: {e}")
                        # Si falla, intentamos devolver el mensaje original de la IA limpio
                        return ai_msg

                return ai_msg
            except Exception as e:
                print(f"Error in AIService: {e}")
                return None

ai_service = AIService()
