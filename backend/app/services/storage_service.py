import os
import uuid
from typing import Optional
from fastapi import UploadFile
from app.core.config import settings

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".pdf", ".xlsx"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


def save_uploaded_file(file: UploadFile, subfolder: str = "general") -> str:
    original_name = file.filename or "upload"
    ext = os.path.splitext(original_name)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(f"File extension '{ext}' is not permitted.")

    # Target directory
    target_dir = os.path.join(settings.LOCAL_STORAGE_DIR, subfolder)
    os.makedirs(target_dir, exist_ok=True)

    # Generate safe random filename to prevent collisions & path traversal
    safe_filename = f"{uuid.uuid4().hex}{ext}"
    dest_path = os.path.join(target_dir, safe_filename)

    with open(dest_path, "wb") as f:
        content = file.file.read()
        if len(content) > MAX_FILE_SIZE:
            raise ValueError(f"File size exceeds maximum allowed limit ({MAX_FILE_SIZE // (1024 * 1024)} MB).")
        f.write(content)

    # Return relative URL or path
    return f"/media/{subfolder}/{safe_filename}"
