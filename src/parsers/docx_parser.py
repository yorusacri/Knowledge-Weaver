import re
from pathlib import Path
from typing import List
from docx import Document
from .base import make_textbook
from ..models import ParsedTextbook

CHAPTER_RE = re.compile(r"^第[一二三四五六七八九十百千万0-9]+[章节篇部]")


def _split_paragraphs(paragraphs: list) -> List[dict]:
    chapters = []
    current_title = "前言"
    current_lines = []

    for para in paragraphs:
        text = para["text"]
        style = para["style"]

        is_heading = (
            style.startswith("Heading")
            or CHAPTER_RE.match(text)
        )

        if is_heading:
            if current_lines:
                content = "\n".join(current_lines)
                chapters.append({
                    "chapter_id": f"ch_{len(chapters)+1:02d}",
                    "title": current_title,
                    "page_start": None,
                    "page_end": None,
                    "content": content,
                    "char_count": len(content),
                })
            current_title = text
            current_lines = []
        else:
            current_lines.append(text)

    if current_lines:
        content = "\n".join(current_lines)
        chapters.append({
            "chapter_id": f"ch_{len(chapters)+1:02d}",
            "title": current_title,
            "page_start": None,
            "page_end": None,
            "content": content,
            "char_count": len(content),
        })

    return chapters if chapters else [{
        "chapter_id": "ch_01",
        "title": "全文",
        "page_start": None,
        "page_end": None,
        "content": "",
        "char_count": 0,
    }]


def parse_docx(file_path: str, textbook_id: str, filename: str) -> ParsedTextbook:
    doc = Document(file_path)
    paragraphs = []
    for para in doc.paragraphs:
        text = para.text.strip()
        if not text:
            continue
        style = para.style.name if para.style else ""
        paragraphs.append({"text": text, "style": style})

    chapters = _split_paragraphs(paragraphs)
    title = Path(filename).stem

    return make_textbook(
        textbook_id=textbook_id,
        filename=filename,
        title=title,
        file_type="docx",
        total_pages=None,
        chapters=chapters,
    )
