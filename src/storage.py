import json
from pathlib import Path
from typing import Optional

from .config import UPLOADS_DIR, PARSED_DIR
from .models import ParsedTextbook, TextbookStatus


def save_upload(file_bytes: bytes, textbook_id: str, filename: str) -> Path:
    dest = UPLOADS_DIR / f"{textbook_id}{Path(filename).suffix}"
    dest.write_bytes(file_bytes)
    return dest


def save_parsed(data: ParsedTextbook) -> Path:
    dest = PARSED_DIR / f"{data.textbook_id}.json"
    dest.write_text(data.model_dump_json(indent=2), encoding="utf-8")
    return dest


def load_parsed(textbook_id: str) -> Optional[ParsedTextbook]:
    path = PARSED_DIR / f"{textbook_id}.json"
    if not path.exists():
        return None
    return ParsedTextbook.model_validate_json(path.read_text(encoding="utf-8"))


def save_status(status: TextbookStatus) -> None:
    path = PARSED_DIR / f"{status.textbook_id}.status.json"
    path.write_text(status.model_dump_json(), encoding="utf-8")


def load_status(textbook_id: str) -> Optional[TextbookStatus]:
    path = PARSED_DIR / f"{textbook_id}.status.json"
    if not path.exists():
        return None
    return TextbookStatus.model_validate_json(path.read_text(encoding="utf-8"))


def delete_textbook(textbook_id: str) -> bool:
    """Delete all files associated with a textbook. Returns True if any file was found."""
    found = False
    for f in UPLOADS_DIR.glob(f"{textbook_id}.*"):
        f.unlink()
        found = True
    for f in PARSED_DIR.glob(f"{textbook_id}.*"):
        f.unlink()
        found = True
    return found


def list_uploaded_textbooks():
    results = []
    for f in UPLOADS_DIR.iterdir():
        if f.is_file():
            tid = f.stem
            status = load_status(tid)
            results.append({
                "textbook_id": tid,
                "filename": f.name,
                "file_type": f.suffix.lstrip(".").lower(),
                "size": f.stat().st_size,
                "status": status.status if status else "uploaded",
            })
    return results
