import re
import chardet
from pathlib import Path
from typing import List
from .base import make_textbook
from ..models import ParsedTextbook

CHAPTER_RE = re.compile(
    r"^(第[一二三四五六七八九十百千万0-9]+[章节篇部]\s*.+|[0-9]+[\.、]\s*.+)$",
    re.MULTILINE,
)


def _read_text(path: str) -> str:
    raw = Path(path).read_bytes()
    detected = chardet.detect(raw)
    encoding = detected.get("encoding") or "utf-8"
    return raw.decode(encoding, errors="ignore")


def _split_into_chapters(text: str) -> List[dict]:
    matches = list(CHAPTER_RE.finditer(text))
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
        title = m.group(0).strip()
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


def parse_txt(file_path: str, textbook_id: str, filename: str, on_progress=None) -> ParsedTextbook:
    text = _read_text(file_path)
    chapters = _split_into_chapters(text)
    title = Path(filename).stem

    return make_textbook(
        textbook_id=textbook_id,
        filename=filename,
        title=title,
        file_type="txt",
        total_pages=None,
        chapters=chapters,
    )
