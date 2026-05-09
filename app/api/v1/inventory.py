from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.models.core import InventoryItem, InventoryMovement, UserRole
from app.schemas.inventory import InventoryItemCreate, InventoryItemOut, InventoryItemUpdate
from app.api.deps import RoleChecker

router = APIRouter()

# Dependencias de rol
allow_manage_inv = RoleChecker([UserRole.ADMIN, UserRole.INVENTORY_MANAGER])
allow_read_inv = RoleChecker([UserRole.ADMIN, UserRole.INVENTORY_MANAGER, UserRole.PROJECT_MANAGER, UserRole.MANAGEMENT])

@router.get("/", response_model=List[InventoryItemOut], dependencies=[Depends(allow_read_inv)])
def list_items(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    # Solo retornamos los activos por defecto
    items = db.query(InventoryItem).filter(InventoryItem.status == "ACTIVE").offset(skip).limit(limit).all()
    return items

@router.post("/", response_model=InventoryItemOut, dependencies=[Depends(allow_manage_inv)])
def create_item(item_in: InventoryItemCreate, db: Session = Depends(get_db)):
    if item_in.sku:
        db_item = db.query(InventoryItem).filter(InventoryItem.sku == item_in.sku).first()
        if db_item:
            raise HTTPException(status_code=400, detail="El código SKU ya existe")
    
    new_item = InventoryItem(**item_in.model_dump())
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item

@router.get("/{item_id}", response_model=InventoryItemOut, dependencies=[Depends(allow_read_inv)])
def get_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(InventoryItem).filter(InventoryItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Material no encontrado")
    return item

@router.put("/{item_id}", response_model=InventoryItemOut, dependencies=[Depends(allow_manage_inv)])
def update_item(item_id: int, item_in: InventoryItemUpdate, db: Session = Depends(get_db)):
    item = db.query(InventoryItem).filter(InventoryItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Material no encontrado")
    
    update_data = item_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)
    
    db.commit()
    db.refresh(item)
    return item

@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(allow_manage_inv)])
def delete_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(InventoryItem).filter(InventoryItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Material no encontrado")
    
    # Baja lógica
    item.status = "INACTIVE"
    db.commit()
    return None
