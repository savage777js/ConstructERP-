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

allow_ocr = deps.RoleChecker([core.UserRole.ADMIN, core.UserRole.PROJECT_MANAGER])

@router.post("/ocr/invoice", dependencies=[Depends(allow_ocr)])
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
        
        # Guardar archivo localmente usando un nombre único seguro (previene Path Traversal)
        unique_filename = f"ocr_{uuid.uuid4()}{ext}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)
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
            "preview_url": f"/uploads/documents/{unique_filename}"
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
    # Verificar pertenencia a la organización
    query_emp = db.query(core.Employee).filter(core.Employee.id == employee_id)
    if current_user.organization_id:
        query_emp = query_emp.filter(core.Employee.organization_id == current_user.organization_id)
    employee = query_emp.first()
    if not employee:
        raise HTTPException(status_code=404, detail="Trabajador no encontrado en su organización")

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
    query = db.query(core.Document).filter(core.Document.id == document_id)
    if current_user.organization_id:
        query = query.filter(core.Document.organization_id == current_user.organization_id)
    doc = query.first()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado o no pertenece a su organización")
        
    db.delete(doc)
    db.commit()
    return {"message": "Documento eliminado correctamente"}

@router.post("/{document_id}/ocr", dependencies=[Depends(allow_ocr)])
async def process_document_ocr(
    document_id: str,
    db: Session = Depends(deps.get_db),
    current_user: core.User = Depends(deps.get_current_user),
):
    """Procesa mediante OCR un documento ya existente en la base de datos (imagen o PDF)."""
    import json
    try:
        from pypdf import PdfReader
    except ImportError:
        PdfReader = None

    query = db.query(core.Document).filter(core.Document.id == document_id)
    if current_user.organization_id:
        query = query.filter(core.Document.organization_id == current_user.organization_id)
    doc = query.first()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado o no pertenece a su organización")
        
    # Verificar que el archivo sea una imagen o PDF
    ext = os.path.splitext(doc.file_path)[1].lower()
    if ext not in [".jpg", ".jpeg", ".png", ".pdf"]:
        raise HTTPException(status_code=400, detail="El procesamiento OCR mediante IA solo es soportado para imágenes (JPG, PNG) y archivos PDF.")

    # Recuperar archivo local (auto-curación desde BD si fue borrado por Render)
    local_path = doc.file_path.lstrip('/')
    if not doc.ensure_local_file(db):
        raise HTTPException(status_code=404, detail="El archivo físico del documento no existe en el servidor ni en la base de datos.")

    text_content = None
    image_base64 = None

    try:
        if ext == ".pdf":
            if not PdfReader:
                raise HTTPException(status_code=500, detail="El motor de lectura PDF (pypdf) no está instalado.")
            
            reader = PdfReader(local_path)
            pages_text = []
            for page in reader.pages:
                text = page.extract_text()
                if text:
                    pages_text.append(text)
            
            text_content = "\n".join(pages_text).strip()
            if not text_content:
                raise HTTPException(
                    status_code=400,
                    detail="El archivo PDF no contiene texto digital extraíble (podría ser un documento escaneado). Por favor, suba una versión con texto digital o una imagen JPG/PNG."
                )
        else:
            with open(local_path, "rb") as f:
                contents = f.read()
            image_base64 = base64.b64encode(contents).decode("utf-8")

        # Invocar servicio de IA con el contenido del documento y su categoría
        ocr_data = await ai_service.process_document(
            image_base64=image_base64,
            text_content=text_content,
            category=doc.category
        )

        if ocr_data:
            doc.ocr_status = "COMPLETED"
            # Guardamos el JSON formateado de forma legible en ocr_content
            doc.ocr_content = json.dumps(ocr_data, indent=2, ensure_ascii=False)
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
            
    except HTTPException:
        raise
    except Exception as e:
        doc.ocr_status = "FAILED"
        db.commit()
        raise HTTPException(status_code=500, detail=str(e))
