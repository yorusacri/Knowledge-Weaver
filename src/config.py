from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
UPLOADS_DIR = DATA_DIR / "uploads"
PARSED_DIR = DATA_DIR / "parsed"

UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
PARSED_DIR.mkdir(parents=True, exist_ok=True)

SUPPORTED_FORMATS = {"pdf", "md", "markdown", "txt", "docx"}
MAX_FILE_SIZE_MB = 500
