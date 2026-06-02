import base64
import io
import json

from PIL import Image


def parse_tavern_png(png_bytes: bytes) -> dict:
    """
    Parses a Tavern Character Card PNG and extracts character metadata.
    Returns a dictionary of standard character fields, or None if extraction fails.
    """
    try:
        img = Image.open(io.BytesIO(png_bytes))

        # Check text chunks in PNG metadata
        info = img.info
        chara_data = None

        # Standard Tavern card metadata keys are "chara" or sometimes "tEXt" or "iTXt"
        if "chara" in info:
            chara_data = info["chara"]

        if not chara_data:
            # Try to search keys for 'chara' case-insensitively
            for key, val in info.items():
                if key.lower() == "chara":
                    chara_data = val
                    break

        if not chara_data:
            print("No 'chara' metadata chunk found in PNG.")
            return None

        # Decode base64 if needed, or parse raw JSON
        decoded_json = None
        try:
            # Try to decode as base64
            decoded_bytes = base64.b64decode(chara_data)
            decoded_json = json.loads(decoded_bytes.decode("utf-8"))
        except Exception:
            # Fallback to direct JSON parsing if not base64
            try:
                decoded_json = json.loads(chara_data)
            except Exception as e:
                print(f"Failed to parse metadata as direct JSON or base64: {e}")
                return None

        if not decoded_json:
            return None

        # Standard Tavern card formats:
        # 1. Spec V1: Flat fields like 'name', 'description', 'first_mes', 'scenario', 'mes_example'
        # 2. Spec V2: Nested fields inside 'data' key
        data = decoded_json.get("data", decoded_json)

        # Map fields to our database schema
        parsed_char = {
            "name": data.get("name", "Unnamed Bot"),
            "greeting": data.get("first_mes", data.get("greeting", "")),
            "personality": data.get("description", data.get("personality", "")),
            "scenario": data.get("scenario", ""),
            "example_dialogue": data.get("mes_example", data.get("example_dialogue", ""))
        }

        # Clean up <BOT> and <USER> tags standard in Tavern files if present
        # (Though we can also let our prompt compiler handle them dynamically!)
        return parsed_char

    except Exception as e:
        print(f"Error parsing Tavern PNG: {e}")
        return None

def extract_avatar_url_from_png(png_bytes: bytes) -> str:
    """
    Converts PNG bytes to a base64 Data URL so it can be saved directly in the SQLite DB
    as the avatar, avoiding the need for complex local file management.
    """
    try:
        encoded = base64.b64encode(png_bytes).decode("utf-8")
        return f"data:image/png;base64,{encoded}"
    except Exception as e:
        print(f"Error extracting avatar image: {e}")
        return None
