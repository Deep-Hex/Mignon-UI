"""
app/services/character_service.py
----------------------------------
Business logic for character CRUD operations.

Routers delegate all database access to these functions, keeping themselves
thin HTTP wrappers with no embedded query logic.
"""

from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.database import Character
from app.schemas.schemas import CharacterCreate, CharacterUpdate
from app.services.tavern_parser import parse_tavern_png


def list_characters(db: Session) -> list[Character]:
    """
    Return all character cards ordered newest-first.

    Args:
        db: Active database session.

    Returns:
        List of Character ORM objects.
    """
    return db.query(Character).order_by(Character.id.desc()).all()


def create_character(db: Session, data: CharacterCreate) -> Character:
    """
    Persist a new character card to the database.

    Args:
        db:   Active database session.
        data: Validated creation payload.

    Returns:
        The newly created Character ORM object.
    """
    from app.services.image_helper import save_base64_avatar
    avatar_path = save_base64_avatar(data.avatar, "char") if data.avatar else None

    char = Character(
        name=data.name,
        avatar=avatar_path,
        greeting=data.greeting,
        personality=data.personality,
        scenario=data.scenario,
        example_dialogue=data.example_dialogue,
        world_id=data.world_id,
        nsfw_inject=data.nsfw_inject if data.nsfw_inject is not None else False,
    )
    db.add(char)
    db.commit()
    db.refresh(char)
    return char


def update_character(db: Session, char_id: int, data: CharacterUpdate) -> Character:
    """
    Update an existing character card by its primary key.

    Args:
        db:      Active database session.
        char_id: ID of the character to update.
        data:    Validated update payload.

    Returns:
        The updated Character ORM object.

    Raises:
        HTTPException 404 if the character does not exist.
    """
    char = db.query(Character).filter(Character.id == char_id).first()
    if not char:
        raise HTTPException(status_code=404, detail="Character not found")

    char.name = data.name
    char.greeting = data.greeting
    char.personality = data.personality
    char.scenario = data.scenario
    char.example_dialogue = data.example_dialogue
    char.world_id = data.world_id
    char.nsfw_inject = data.nsfw_inject if data.nsfw_inject is not None else False
    if data.avatar:
        from app.services.image_helper import save_base64_avatar
        char.avatar = save_base64_avatar(data.avatar, "char")
    else:
        char.avatar = None

    db.commit()
    db.refresh(char)
    return char


def delete_character(db: Session, char_id: int) -> None:
    """
    Delete a character card by its primary key.

    Args:
        db:      Active database session.
        char_id: ID of the character to delete.

    Raises:
        HTTPException 404 if the character does not exist.
    """
    char = db.query(Character).filter(Character.id == char_id).first()
    if not char:
        raise HTTPException(status_code=404, detail="Character not found")
    db.delete(char)
    db.commit()


async def import_tavern_card(db: Session, file: UploadFile) -> Character:
    """
    Parse a Tavern-format PNG card and persist it as a new character.

    Args:
        db:   Active database session.
        file: The uploaded PNG file containing embedded character metadata.

    Returns:
        The newly created Character ORM object.

    Raises:
        HTTPException 400 if the PNG contains no valid Tavern metadata.
        HTTPException 500 on unexpected parsing failures.
    """
    try:
        content = await file.read()
        parsed_data = parse_tavern_png(content)
        if not parsed_data:
            raise HTTPException(
                status_code=400,
                detail="Invalid Tavern PNG Card. Could not extract metadata.",
            )

        # Save raw Tavern PNG card bytes directly as static image file
        import os
        import uuid
        file_name = f"char_{uuid.uuid4().hex}.png"
        os.makedirs("./static/avatars", exist_ok=True)
        file_path = os.path.join("./static/avatars", file_name)
        with open(file_path, "wb") as f:
            f.write(content)

        avatar_data = f"/static/avatars/{file_name}"

        char = Character(
            name=parsed_data["name"],
            avatar=avatar_data,
            greeting=parsed_data["greeting"],
            personality=parsed_data["personality"],
            scenario=parsed_data["scenario"],
            example_dialogue=parsed_data["example_dialogue"],
            nsfw_inject=False,
        )
        db.add(char)
        db.commit()
        db.refresh(char)
        return char
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Import failed: {exc}") from exc
