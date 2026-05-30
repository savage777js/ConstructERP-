from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.api import deps
from app.ai.service import ai_service
from app.models import core
import base64
import os
import uuid
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

@router.post("/")
async def upload_document(
    employee_id: int = Form(...),
    category: str = Form(...),
    title: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(deps.get_db),
    current_user: core.User = Depends(deps.get_current_user),
):
    """Sube un documento para un trabajador."""
    # Validar que el trabajador existe
    employee = db.query(core.Employee).filter(core.Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Trabajador no encontrado")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".jpg", ".jpeg", ".png", ".pdf", ".docx", ".doc"]:
        raise HTTPException(status_code=400, detail="Formato de archivo no soportado.")

    contents = await file.read()
    
    # Crear un nombre único de archivo
    unique_filename = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    with open(file_path, "wb") as f:
        f.write(contents)

    # Si es una organización, asociamos a la misma org del usuario
    org_id = current_user.organization_id if current_user.organization_id else employee.organization_id

    db_doc = core.Document(
        organization_id=org_id,
        title=title,
        file_path=f"/uploads/documents/{unique_filename}",
        file_type=file.content_type,
        file_size=len(contents),
        category=category,
        employee_id=employee_id,
        created_by=current_user.id
    )
    db.add(db_doc)
    db.commit()
    db.refresh(db_doc)

    return {
        "id": str(db_doc.id),
        "title": db_doc.title,
        "file_path": db_doc.file_path,
        "category": db_doc.category,
        "ocr_status": db_doc.ocr_status,
        "created_at": db_doc.created_at
    }

@router.get("/employee/{employee_id}")
def list_employee_documents(
    employee_id: int,
    db: Session = Depends(deps.get_db),
    current_user: core.User = Depends(deps.get_current_user),
):
    """Lista todos los documentos cargados para un trabajador específico."""
    docs = db.query(core.Document).filter(core.Document.employee_id == employee_id).all()
    return [{
        "id": str(d.id),
        "title": d.title,
        "file_path": d.file_path,
        "category": d.category,
        "ocr_status": d.ocr_status,
        "ocr_content": d.ocr_content,
        "extracted_data": d.extracted_data,
        "created_at": d.created_at
    } for d in docs]

@router.delete("/{document_id}")
def delete_document(
    document_id: str,
    db: Session = Depends(deps.get_db),
    current_user: core.User = Depends(deps.get_current_user),
):
    """Elimina un documento."""
    doc = db.query(core.Document).filter(core.Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
        
    db.delete(doc)
    db.commit()
    return {"message": "Documento eliminado correctamente"}

@router.post("/{document_id}/ocr")
async def process_document_ocr(
    document_id: str,
    db: Session = Depends(deps.get_db),
    current_user: core.User = Depends(deps.get_current_user),
):
    """Procesa mediante OCR un documento ya existente en la base de datos."""
    doc = db.query(core.Document).filter(core.Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
        
    # Verificar que el archivo sea una imagen
    ext = os.path.splitext(doc.file_path)[1].lower()
    if ext not in [".jpg", ".jpeg", ".png"]:
        raise HTTPException(status_code=400, detail="El procesamiento OCR mediante IA solo es soportado para imágenes (JPG, PNG).")

    # Leer el archivo local
    local_path = doc.file_path.lstrip('/')
    if not os.path.exists(local_path):
        raise HTTPException(status_code=404, detail="El archivo físico del documento no existe en el servidor.")

    with open(local_path, "rb") as f:
        contents = f.read()

    image_base64 = base64.b64encode(contents).decode("utf-8")
    
    try:
        ocr_data = await ai_service.process_document(image_base64)
        if ocr_data:
            doc.ocr_status = "COMPLETED"
            doc.ocr_content = str(ocr_data.get("raw_text", ""))
            doc.extracted_data = ocr_data
            db.commit()
            db.refresh(doc)
            return {
                "id": str(doc.id),
                "ocr_status": doc.ocr_status,
                "data": ocr_data
            }
        else:
            doc.ocr_status = "FAILED"
            db.commit()
            raise HTTPException(status_code=500, detail="La IA no pudo extraer datos del documento.")
    except Exception as e:
        doc.ocr_status = "FAILED"
        db.commit()
        raise HTTPException(status_code=500, detail=str(e))
