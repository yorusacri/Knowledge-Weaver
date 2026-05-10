import uuid
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, BackgroundTasks, HTTPException
from typing import List

from ..config import SUPPORTED_FORMATS
from ..models import (
    UploadResponse, UploadResponseItem, TextbookStatus,
    ParsedTextbook, TextbookListItem,
)
from ..storage import save_upload, save_parsed, save_status, load_parsed, load_status, list_uploaded_textbooks, delete_textbook
from ..parsers import PARSERS

router = APIRouter(prefix="/api/textbooks", tags=["textbooks"])


def _run_parse(textbook_id: str, file_path: str, filename: str, file_type: str):
    parser = PARSERS.get(file_type)
    if not parser:
        status = TextbookStatus(
            textbook_id=textbook_id, filename=filename,
            status="failed", progress=0,
            error_message=f"不支持的格式: {file_type}",
        )
        save_status(status)
        return
    try:
        save_status(TextbookStatus(
            textbook_id=textbook_id, filename=filename,
            status="parsing", progress=50,
        ))
        result = parser(file_path, textbook_id, filename)
        save_parsed(result)
        save_status(TextbookStatus(
            textbook_id=textbook_id, filename=filename,
            status="completed", progress=100,
            total_pages=result.total_pages,
            total_chars=result.total_chars,
            chapter_count=len(result.chapters),
        ))
    except Exception as e:
        save_status(TextbookStatus(
            textbook_id=textbook_id, filename=filename,
            status="failed", progress=0,
            error_message=str(e),
        ))


@router.post("/upload", response_model=UploadResponse)
async def upload_textbooks(files: List[UploadFile] = File(...), background_tasks: BackgroundTasks = None):
    uploaded = []
    for file in files:
        ext = Path(file.filename).suffix.lstrip(".").lower()
        if ext not in SUPPORTED_FORMATS:
            uploaded.append(UploadResponseItem(
                textbook_id="", filename=file.filename,
                file_type=ext, size=0, status="unsupported_format",
            ))
            continue

        content = await file.read()
        textbook_id = f"book_{uuid.uuid4().hex[:8]}"
        save_upload(content, textbook_id, file.filename)

        uploaded.append(UploadResponseItem(
            textbook_id=textbook_id, filename=file.filename,
            file_type=ext, size=len(content), status="uploaded",
        ))

        background_tasks.add_task(_run_parse, textbook_id,
                                  str(Path("data/uploads") / f"{textbook_id}.{ext}"),
                                  file.filename, ext)

    return UploadResponse(uploaded=uploaded)


@router.post("/{textbook_id}/parse")
async def trigger_parse(textbook_id: str, background_tasks: BackgroundTasks):
    from ..config import UPLOADS_DIR
    files = list(UPLOADS_DIR.glob(f"{textbook_id}.*"))
    if not files:
        raise HTTPException(404, "教材文件未找到")
    file_path = files[0]
    ext = file_path.suffix.lstrip(".").lower()
    background_tasks.add_task(_run_parse, textbook_id, str(file_path), file_path.name, ext)
    return {"textbook_id": textbook_id, "status": "parsing"}


@router.get("/{textbook_id}/status", response_model=TextbookStatus)
async def get_status(textbook_id: str):
    status = load_status(textbook_id)
    if not status:
        raise HTTPException(404, "教材未找到")
    return status


@router.get("/{textbook_id}/parsed", response_model=ParsedTextbook)
async def get_parsed(textbook_id: str):
    parsed = load_parsed(textbook_id)
    if not parsed:
        raise HTTPException(404, "解析结果未找到")
    return parsed


@router.delete("/{textbook_id}")
async def remove_textbook(textbook_id: str):
    if not delete_textbook(textbook_id):
        raise HTTPException(404, "教材未找到")
    return {"textbook_id": textbook_id, "status": "deleted"}


@router.get("", response_model=List[TextbookListItem])
async def list_textbooks():
    return list_uploaded_textbooks()
