import httpx
from app.core.config import settings
from typing import List, Dict, Optional

class AIService:
    def __init__(self):
        self.api_key = settings.OPENROUTER_API_KEY
        self.base_url = "https://openrouter.ai/api/v1/chat/completions"
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "HTTP-Referer": "https://constructerp.sevalla.app", # Sevalla URL
            "X-Title": "ConstructERP AI",
            "Content-Type": "application/json"
        }

    async def get_chat_response(self, messages: List[Dict[str, str]]) -> Optional[str]:
        if not self.api_key:
            return "AI Service not configured. Please add OPENROUTER_API_KEY."

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    self.base_url,
                    headers=self.headers,
                    json={
                        "model": settings.OPENROUTER_MODEL,
                        "messages": messages
                    },
                    timeout=30.0
                )
                response.raise_for_status()
                data = response.json()
                return data["choices"][0]["message"]["content"]
            except Exception as e:
                print(f"Error in AIService: {e}")
                return None

ai_service = AIService()
