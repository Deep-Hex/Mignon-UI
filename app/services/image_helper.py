"""
app/services/image_helper.py
------------------------------
Utility helper to parse base64 image data strings and save them as physical binary
files in the static serving directory, preventing database text field bloat.
"""

import base64
import os
import uuid


def save_base64_avatar(base64_str: str, entity_type: str = "char") -> str:
    """
    Parses a base64 Data URL and saves it as a physical file in `./static/avatars/`.

    Args:
        base64_str: Base64 data URL string (e.g. data:image/png;base64,iVB...) or standard path.
        entity_type: Prefix for file naming ('char' or 'persona').

    Returns:
        The relative static URL path (e.g. /static/avatars/char_abc123.png)
        or the original string if it is already a URL/path or invalid.
    """
    if not base64_str:
        return base64_str

    # Only decode if it represents a base64 Data URL
    if base64_str.startswith("data:image/"):
        try:
            header, encoded = base64_str.split(",", 1)

            # Determine extension
            ext = "png"
            if "jpeg" in header or "jpg" in header:
                ext = "jpg"
            elif "gif" in header:
                ext = "gif"
            elif "webp" in header:
                ext = "webp"

            # Decode file contents
            file_data = base64.b64decode(encoded)
            file_name = f"{entity_type}_{uuid.uuid4().hex}.{ext}"

            # Ensure folder exists
            os.makedirs("./static/avatars", exist_ok=True)
            file_path = os.path.join("./static/avatars", file_name)

            with open(file_path, "wb") as f:
                f.write(file_data)

            # Return relative serving URL
            return f"/static/avatars/{file_name}"
        except Exception as e:
            print(f"[ImageHelper] Failed to decode base64 avatar: {e}")
            return base64_str

    return base64_str
