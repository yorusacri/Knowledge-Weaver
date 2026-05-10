from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")
DATA_DIR = BASE_DIR / "data"
UPLOADS_DIR = DATA_DIR / "uploads"
PARSED_DIR = DATA_DIR / "parsed"

UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
PARSED_DIR.mkdir(parents=True, exist_ok=True)
GRAPH_DIR = DATA_DIR / "graph"
GRAPH_DIR.mkdir(parents=True, exist_ok=True)
VECTOR_DIR = DATA_DIR / "vector_index"
VECTOR_DIR.mkdir(parents=True, exist_ok=True)

SUPPORTED_FORMATS = {"pdf", "md", "markdown", "txt", "docx"}
MAX_FILE_SIZE_MB = 500

# RAG settings
CHUNK_SIZE = 600       # chars per chunk
CHUNK_OVERLAP = 100     # chars overlap between chunks
EMBEDDING_MODEL = "BAAI/bge-small-zh-v1.5"
