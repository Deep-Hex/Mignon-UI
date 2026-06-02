import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import UISticker, get_db
from app.schemas.schemas import StickerCreate, StickerUpdate

router = APIRouter()

@router.get("")
def list_stickers(db: Session = Depends(get_db)):
    """Fetches all uploaded and placed UI stickers."""
    stickers = db.query(UISticker).order_by(UISticker.created_at.asc()).all()
    return stickers

@router.post("")
def create_sticker(sticker_data: StickerCreate, db: Session = Depends(get_db)):
    """Registers a new interactive UI sticker."""
    sticker_id = str(uuid.uuid4())
    sticker = UISticker(
        id=sticker_id,
        image_data=sticker_data.image_data,
        x=sticker_data.x,
        y=sticker_data.y,
        scale=sticker_data.scale,
        rotation=sticker_data.rotation,
        opacity=sticker_data.opacity,
        target_selectors=sticker_data.target_selectors
    )
    db.add(sticker)
    db.commit()
    db.refresh(sticker)
    return sticker

@router.put("/{sticker_id}")
def update_sticker(sticker_id: str, sticker_data: StickerUpdate, db: Session = Depends(get_db)):
    """Updates position, scale, rotation, and opacity of a sticker."""
    sticker = db.query(UISticker).filter(UISticker.id == sticker_id).first()
    if not sticker:
        raise HTTPException(status_code=404, detail="Sticker not found")

    if sticker_data.x is not None:
        sticker.x = sticker_data.x
    if sticker_data.y is not None:
        sticker.y = sticker_data.y
    if sticker_data.scale is not None:
        sticker.scale = sticker_data.scale
    if sticker_data.rotation is not None:
        sticker.rotation = sticker_data.rotation
    if sticker_data.opacity is not None:
        sticker.opacity = sticker_data.opacity

    # Check if target_selectors was explicitly sent in the payload (including null/None)
    fields_set = getattr(sticker_data, "model_fields_set", getattr(sticker_data, "__fields_set__", set()))
    if "target_selectors" in fields_set:
        sticker.target_selectors = sticker_data.target_selectors

    db.commit()
    db.refresh(sticker)
    return sticker

@router.delete("/{sticker_id}")
def delete_sticker(sticker_id: str, db: Session = Depends(get_db)):
    """Wipes a sticker from existence."""
    sticker = db.query(UISticker).filter(UISticker.id == sticker_id).first()
    if not sticker:
        raise HTTPException(status_code=404, detail="Sticker not found")

    db.delete(sticker)
    db.commit()
    return {"message": "Sticker deleted successfully"}
