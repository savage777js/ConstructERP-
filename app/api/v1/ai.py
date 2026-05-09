from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict
from app.ai.service import ai_service
from app.api.v1 import auth # For future role-based access

router = APIRouter()

@router.post("/chat")
async def chat_with_ai(payload: Dict[str, List[Dict[str, str]]]):
    """
    Endpoint for AI Chat interaction.
    Payload: {"messages": [{"role": "user", "content": "Hello"}]}
    """
    messages = payload.get("messages")
    if not messages:
        raise HTTPException(status_code=400, detail="Messages are required")
    
    response = await ai_service.get_chat_response(messages)
    if not response:
        raise HTTPException(status_code=500, detail="Error communicating with AI service")
        
    return {"response": response}
