# seeder.py
import importlib
import sys

from app.core.database import Character, LoreEntry, SessionLocal, Settings, World

# Import seeds dynamically: private overrides first (dev only), falling back to safe defaults committed to Git.
# When running inside a compiled/frozen executable, we strictly use the safe defaults to keep private data private.

SETTINGS = {}
CHARACTERS = []
LORE = {}

if getattr(sys, 'frozen', False):
    # Frozen production environment: Strictly use safe defaults committed to Git
    try:
        from data.defaults.seed_settings import SETTINGS as DEFAULT_SETTINGS
        SETTINGS = DEFAULT_SETTINGS
    except ImportError:
        pass

    try:
        from data.defaults.seed_characters import CHARACTERS as DEFAULT_CHARACTERS
        CHARACTERS = DEFAULT_CHARACTERS
    except ImportError:
        pass

    try:
        from data.defaults.seed_lore import LORE as DEFAULT_LORE
        LORE = DEFAULT_LORE
    except ImportError:
        pass
else:
    # Development environment: Try custom private seeds first using dynamic importlib
    # to prevent PyInstaller's static analyzer from scanning/bundling private files.
    try:
        seed_settings = importlib.import_module("data.seed_settings")
        SETTINGS = getattr(seed_settings, "SETTINGS", {})
    except ImportError:
        try:
            from data.defaults.seed_settings import SETTINGS as DEFAULT_SETTINGS
            SETTINGS = DEFAULT_SETTINGS
        except ImportError:
            pass

    try:
        seed_characters = importlib.import_module("data.seed_characters")
        CHARACTERS = getattr(seed_characters, "CHARACTERS", [])
    except ImportError:
        try:
            from data.defaults.seed_characters import CHARACTERS as DEFAULT_CHARACTERS
            CHARACTERS = DEFAULT_CHARACTERS
        except ImportError:
            pass

    try:
        seed_lore = importlib.import_module("data.seed_lore")
        LORE = getattr(seed_lore, "LORE", {})
    except ImportError:
        try:
            from data.defaults.seed_lore import LORE as DEFAULT_LORE
            LORE = DEFAULT_LORE
        except ImportError:
            pass

def sync_database_with_seed():
    db = SessionLocal()
    try:
        # 1. Sync Settings (Only seed defaults if the settings row is completely missing)
        settings = db.query(Settings).filter(Settings.id == 1).first()
        if not settings:
            settings = Settings(
                id=1,
                provider=SETTINGS.get("provider", "ollama"),
                openrouter_key=SETTINGS.get("openrouter_key", ""),
                local_endpoint=SETTINGS.get("local_endpoint", "http://127.0.0.1:11434/v1"),
                selected_model=SETTINGS.get("selected_model", None),
                temperature=SETTINGS.get("temperature", 0.9),
                max_tokens=SETTINGS.get("max_tokens", 2048),
                system_template=SETTINGS.get("system_template")
            )
            db.add(settings)
            db.commit()

        # 2. Sync Lorebook and link to their respective Worlds
        for world_name, entries in LORE.items():
            # Dynamically get or create the associated World from seed
            world = db.query(World).filter(World.name == world_name).first()
            if not world:
                world = World(name=world_name, description=f"The seeded {world_name} world environment.")
                db.add(world)
                db.commit()
                db.refresh(world)

            for l_data in entries:
                lore = db.query(LoreEntry).filter(LoreEntry.title == l_data["title"]).first()
                if not lore:
                    lore = LoreEntry(
                        title=l_data["title"],
                        keys=l_data["keys"],
                        content=l_data["content"],
                        is_active=l_data["is_active"],
                        weight=l_data.get("weight", 100),
                        world_id=world.id
                    )
                    db.add(lore)

        # 3. Sync Characters (Unlinked by default)
        for c_data in CHARACTERS:
            char = db.query(Character).filter(Character.name == c_data["name"]).first()
            if not char:
                char = Character(
                    name=c_data["name"],
                    avatar=c_data.get("avatar") or None,
                    greeting=c_data["greeting"],
                    personality=c_data["personality"],
                    scenario=c_data["scenario"],
                    example_dialogue=c_data["example_dialogue"],
                    world_id=None
                )
                db.add(char)

        db.commit()
        print("Database seed check completed. Missing entries added.")
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()
