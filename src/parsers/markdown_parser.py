import re
from pathlib import Path
from typing import List
from .base import make_textbook
from ..models import ParsedTextbook

HEADING_RE = re.compile(r"^(#{1,3})\s+(.+)$", re.MULTILINE)


def _split_by_headings(text: str) -> List[dict]:
    matches = list(HEADING_RE.finditer(text))
    if not matches:
        return [{
            "chapter_id": "ch_01",
            "title": "全文",
            "page_start": None,
            "page_end": None,
            "content": text.strip(),
            "char_count": len(text.strip()),
        }]

    chapters = []
    for idx, m in enumerate(matches):
        title = m.group(2).strip()
        start = m.end()
        end = matches[idx + 1].start() if idx + 1 < len(matches) else len(text)
        content = text[start:end].strip()
        if not content:
            continue
        chapters.append({
            "chapter_id": f"ch_{len(chapters)+1:02d}",
            "title": title,
            "page_start": None,
            "page_end": None,
            "content": content,
            "char_count": len(content),
        })

    # Handle text before the first heading
    if matches[0].start() > 0:
        pre = text[:matches[0].start()].strip()
        if pre:
            chapters.insert(0, {
                "chapter_id": "ch_00",
                "title": "前言",
                "page_start": None,
                "page_end": None,
                "content": pre,
                "char_count": len(pre),
            })

    return chapters if chapters else [{
        "chapter_id": "ch_01",
        "title": "全文",
        "page_start": None,
        "page_end": None,
        "content": text.strip(),
        "char_count": len(text.strip()),
    }]


def parse_markdown(file_path: str, textbook_id: str, filename: str, on_progress=None) -> ParsedTextbook:
    text = Path(file_path).read_text(encoding="utf-8")
    chapters = _split_by_headings(text)
    title = Path(filename).stem

    return make_textbook(
        textbook_id=textbook_id,
        filename=filename,
        title=title,
        file_type="markdown",
        total_pages=None,
        chapters=chapters,
    )
