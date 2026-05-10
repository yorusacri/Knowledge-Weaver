from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
import multiprocessing

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)

from .routes.textbooks import router as textbooks_router
from .routes.graph import router as graph_router
from .routes.integration import router as integration_router
from .storage import list_uploaded_textbooks, save_status
from .models import TextbookStatus


@asynccontextmanager
async def lifespan(app: FastAPI):
    # On startup: reset interrupted "parsing" files to "uploaded"
    for item in list_uploaded_textbooks():
        if item["status"] == "parsing":
            save_status(TextbookStatus(
                textbook_id=item["textbook_id"],
                filename=item["filename"],
                status="uploaded",
                progress=0,
            ))
    yield


app = FastAPI(title="学科知识整合智能体", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(textbooks_router)
app.include_router(graph_router)
app.include_router(integration_router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
