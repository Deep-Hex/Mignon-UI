# routers/rag.py
# Exposes a manual re-index trigger so lore/character edits are immediately
# reflected in the vector store without a server restart.

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services.rag.rag_indexer import sync_rag_index

router = APIRouter()


@router.post("/reindex")
def reindex(db: Session = Depends(get_db)):
    """
    Incrementally re-syncs lore entries and characters into LanceDB.
    Call this after creating/editing/deleting any lore entry or character.
    Only new or changed documents are re-embedded — unchanged ones are skipped.
    """
    result = sync_rag_index(db)
    return {
        "status": "ok",
        "added":   result["added"],
        "skipped": result["skipped"],
        "deleted": result["deleted"],
    }
