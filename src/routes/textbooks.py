import uuid
import logging
import asyncio
import multiprocessing
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import List

from ..config import SUPPORTED_FORMATS, UPLOADS_DIR
from ..models import (
    UploadResponse, UploadResponseItem, TextbookStatus,
    ParsedTextbook, TextbookListItem,
)
from ..storage import save_upload, save_parsed, save_status, load_parsed, load_status, list_uploaded_textbooks, delete_textbook
from ..parsers import parse_in_process

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/textbooks", tags=["textbooks"])

# Limit concurrent parsing processes to avoid memory pressure.
_parse_semaphore: asyncio.Semaphore | None = None


def _get_parse_semaphore() -> asyncio.Semaphore:
    global _parse_semaphore
    if _parse_semaphore is None:
        _parse_semaphore = asyncio.Semaphore(2)
    return _parse_semaphore


async def _start_parse(textbook_id: str, file_path: str, filename: str, file_type: str):
    """Dispatch parse to a child process via multiprocessing.Process.

    Each parse runs in a completely separate OS process with its own Python
    interpreter and GIL — zero contention with the main event loop.
    """
    sem = _get_parse_semaphore()
    await sem.acquire()
    try:
        proc = multiprocessing.Process(
            target=parse_in_process,
            args=(textbook_id, file_path, filename, file_type),
            daemon=True,
        )
        proc.start()
        # Release semaphore once the process has started
    except Exception:
        sem.release()
        raise

    # Monitor process completion in background to release semaphore
    async def _wait_and_release():
        try:
            loop = asyncio.get_running_loop()
            # poll process status without blocking
            while proc.is_alive():
                await asyncio.sleep(0.5)
        finally:
            sem.release()

    asyncio.create_task(_wait_and_release())


@router.post("/upload", response_model=UploadResponse)
async def upload_textbooks(files: List[UploadFile] = File(...)):
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
        logger.info("文件已保存: %s (%s, %.1f MB)", file.filename, textbook_id, len(content) / 1024 / 1024)

        uploaded.append(UploadResponseItem(
            textbook_id=textbook_id, filename=file.filename,
            file_type=ext, size=len(content), status="uploaded",
        ))

        file_path = str((UPLOADS_DIR / f"{textbook_id}.{ext}").resolve())
        logger.info("开始解析: %s [%s]", file.filename, textbook_id)
        await _start_parse(textbook_id, file_path, file.filename, ext)
        # Write status immediately so the frontend sees "parsing" on next refresh
        save_status(TextbookStatus(
            textbook_id=textbook_id, filename=file.filename,
            status="parsing", progress=0,
        ))

    return UploadResponse(uploaded=uploaded)


@router.post("/{textbook_id}/parse")
async def trigger_parse(textbook_id: str):
    from ..storage import _get_original_name
    files = list(UPLOADS_DIR.glob(f"{textbook_id}.*"))
    if not files:
        raise HTTPException(404, "教材文件未找到")
    file_path = files[0]
    ext = file_path.suffix.lstrip(".").lower()
    original_name = _get_original_name(textbook_id) or file_path.name
    logger.info("重新解析: %s [%s]", original_name, textbook_id)
    await _start_parse(textbook_id, str(file_path.resolve()), original_name, ext)
    save_status(TextbookStatus(
        textbook_id=textbook_id, filename=original_name,
        status="parsing", progress=0,
    ))
    return {"textbook_id": textbook_id, "status": "parsing"}


@router.get("/{textbook_id}/status", response_model=TextbookStatus)
async def get_status(textbook_id: str):
    status = load_status(textbook_id)
    if not status:
        raise HTTPException(404, "教材未找到")
    return status


@router.get("/{textbook_id}/parsed")
async def get_parsed(textbook_id: str):
    """Return chapter list WITHOUT content (metadata only)."""
    parsed = load_parsed(textbook_id)
    if not parsed:
        raise HTTPException(404, "解析结果未找到")
    return {
        "textbook_id": parsed.textbook_id,
        "filename": parsed.filename,
        "title": parsed.title,
        "total_pages": parsed.total_pages,
        "total_chars": parsed.total_chars,
        "chapters": [
            {
                "chapter_id": ch.chapter_id,
                "title": ch.title,
                "page_start": ch.page_start,
                "page_end": ch.page_end,
                "char_count": ch.char_count,
            }
            for ch in parsed.chapters
        ],
    }


@router.get("/{textbook_id}/chapters/{chapter_id}")
async def get_chapter_content(textbook_id: str, chapter_id: str):
    """Return content for a single chapter."""
    parsed = load_parsed(textbook_id)
    if not parsed:
        raise HTTPException(404, "解析结果未找到")
    for ch in parsed.chapters:
        if ch.chapter_id == chapter_id:
            return {"chapter_id": ch.chapter_id, "title": ch.title, "content": ch.content}
    raise HTTPException(404, "章节未找到")


@router.delete("/{textbook_id}")
async def remove_textbook(textbook_id: str):
    if not delete_textbook(textbook_id):
        raise HTTPException(404, "教材未找到")
    logger.info("教材已删除: %s", textbook_id)
    return {"textbook_id": textbook_id, "status": "deleted"}


@router.get("", response_model=List[TextbookListItem])
async def list_textbooks():
    return list_uploaded_textbooks()
