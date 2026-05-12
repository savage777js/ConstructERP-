from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any
from app.ai.service import ai_service
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.core import User

router = APIRouter()

@router.post("/chat")
async def chat_with_ai(
    payload: Dict[str, Any], 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Endpoint for AI Chat interaction.
    Payload: {"messages": [...], "bot_id": "erp_assistant"}
    """
    messages = payload.get("messages")
    bot_id = payload.get("bot_id", "erp_assistant")
    
    if not messages:
        raise HTTPException(status_code=400, detail="Messages are required")
    
    # Pasamos la DB y la organización del usuario para que el bot pueda consultar datos reales
    response = await ai_service.get_chat_response(
        messages, 
        bot_id=bot_id, 
        db=db, 
        organization_id=current_user.organization_id
    )
    
    if not response:
        raise HTTPException(status_code=500, detail="Error communicating with AI service")
        
    return {"response": response}
