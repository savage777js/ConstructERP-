from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.api import deps
from app.ai.service import ai_service
from app.models import core
import base64
import os
from typing import Any

router = APIRouter()

# Asegurar que el directorio de uploads existe
UPLOAD_DIR = "uploads/documents"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/ocr/invoice")
async def ocr_invoice(
    file: UploadFile = File(...),
    db: Session = Depends(deps.get_db),
    current_user: core.User = Depends(deps.get_current_user),
) -> Any:
    """Sube una imagen de factura y extrae sus datos usando IA."""
    
    # Validar extensión
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".jpg", ".jpeg", ".png", ".pdf"]:
        raise HTTPException(status_code=400, detail="Formato de archivo no soportado. Use JPG, PNG o PDF.")

    try:
        # Leer contenido
        contents = await file.read()
        
        # Guardar archivo localmente (opcional, para registro)
        file_path = os.path.join(UPLOAD_DIR, f"{current_user.id}_{file.filename}")
        with open(file_path, "wb") as f:
            f.write(contents)

        # Convertir a base64 para la IA (Solo para imágenes por ahora)
        if ext == ".pdf":
            # Nota: Para PDF se requeriría una librería extra como pdf2image
            # Por ahora avisamos que el OCR avanzado es para imágenes
             raise HTTPException(status_code=400, detail="El OCR de PDF requiere procesamiento adicional. Por ahora use imágenes (JPG/PNG).")
        
        image_base64 = base64.b64encode(contents).decode("utf-8")
        
        # Llamar al servicio de IA
        ocr_data = await ai_service.process_document(image_base64)
        
        if not ocr_data:
            raise HTTPException(status_code=500, detail="La IA no pudo procesar el documento.")

        return {
            "filename": file.filename,
            "data": ocr_data,
            "preview_url": f"/uploads/documents/{current_user.id}_{file.filename}"
        }

    except Exception as e:
        print(f"Error en OCR: {e}")
        raise HTTPException(status_code=500, detail=str(e))
