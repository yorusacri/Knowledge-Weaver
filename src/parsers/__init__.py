import logging
from .pdf_parser import parse_pdf
from .markdown_parser import parse_markdown
from .txt_parser import parse_txt
from .docx_parser import parse_docx

logger = logging.getLogger(__name__)

PARSERS = {
    "pdf": parse_pdf,
    "md": parse_markdown,
    "markdown": parse_markdown,
    "txt": parse_txt,
    "docx": parse_docx,
}


def parse_in_process(textbook_id: str, file_path: str, filename: str, file_type: str) -> None:
    """Entry point for child processes. Runs the parser and writes status to disk.

    Each call runs in a separate OS process with its own Python interpreter,
    so the main process event loop is never blocked.
    """
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%H:%M:%S",
        force=True,
    )

    from src.storage import save_parsed, save_status
    from src.models import TextbookStatus

    parser = PARSERS.get(file_type)
    if not parser:
        logger.error("不支持的格式: %s (%s)", file_type, textbook_id)
        save_status(TextbookStatus(
            textbook_id=textbook_id, filename=filename,
            status="failed", progress=0,
            error_message=f"不支持的格式: {file_type}",
        ))
        return
    try:
        logger.info("解析进程启动: %s [%s]", filename, textbook_id)

        def on_progress(current, total):
            pct = int(current / total * 100) if total > 0 else 50
            if pct % 25 == 0 or current == total:
                logger.info("解析进度: %s %d%% (%d/%d)", filename, pct, current, total)
            save_status(TextbookStatus(
                textbook_id=textbook_id, filename=filename,
                status="parsing", progress=pct,
            ))

        result = parser(file_path, textbook_id, filename, on_progress=on_progress)
        save_parsed(result)
        logger.info("解析完成: %s [%s] — %d 章, %d 页, %d 字",
                     filename, textbook_id, len(result.chapters), result.total_pages or 0, result.total_chars)
        save_status(TextbookStatus(
            textbook_id=textbook_id, filename=filename,
            status="completed", progress=100,
            total_pages=result.total_pages,
            total_chars=result.total_chars,
            chapter_count=len(result.chapters),
        ))
    except Exception as e:
        logger.exception("Parse failed for %s", textbook_id)
        save_status(TextbookStatus(
            textbook_id=textbook_id, filename=filename,
            status="failed", progress=0,
            error_message=str(e),
        ))
