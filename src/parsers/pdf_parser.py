import re
import json
import time
import fitz
from pathlib import Path
from typing import List, Optional
from .base import make_textbook
from ..models import ParsedTextbook

# Full-width digits: ０１２３４５６７８９
_FW_DIGITS = "０-９"
# Matches: 第1章, 第１章, 第一章, 第1 章, 第１ 章, 第一 章
CHAPTER_NUM_RE = re.compile(
    rf"第[{_FW_DIGITS}一二三四五六七八九十百千万0-9]+\s*章"
)


def _normalize_chapter_num(s: str) -> str:
    """Normalize chapter number for comparison: full-width -> half-width, strip spaces."""
    s = s.replace("　", "").replace("\u2003", "").replace(" ", "")
    table = str.maketrans("０１２３４５６７８９", "0123456789")
    return s.translate(table)


def _group_spans_into_lines(spans: list) -> list:
    if not spans:
        return []
    sorted_spans = sorted(spans, key=lambda s: (s["bbox"][1], s["bbox"][0]))
    lines = []
    current_line = [sorted_spans[0]]
    current_y = sorted_spans[0]["bbox"][1]

    for span in sorted_spans[1:]:
        if abs(span["bbox"][1] - current_y) < 3:
            current_line.append(span)
        else:
            text = "".join(s["text"] for s in current_line).strip()
            if text:
                max_size = max(s["size"] for s in current_line)
                lines.append({"text": text, "size": max_size, "y": current_y, "bbox": current_line[0]["bbox"]})
            current_line = [span]
            current_y = span["bbox"][1]

    text = "".join(s["text"] for s in current_line).strip()
    if text:
        max_size = max(s["size"] for s in current_line)
        lines.append({"text": text, "size": max_size, "y": current_y, "bbox": current_line[0]["bbox"]})
    return lines


def _extract_page_lines(page) -> list:
    height = page.rect.height
    dict_data = page.get_text("dict")
    all_spans = []
    for block in dict_data["blocks"]:
        if block.get("type") != 0:
            continue
        for line in block["lines"]:
            for span in line["spans"]:
                text = span["text"].strip()
                if not text:
                    continue
                bbox = span["bbox"]
                if bbox[3] < height * 0.05 or bbox[1] > height * 0.95:
                    continue
                all_spans.append({"text": text, "size": span["size"], "flags": span["flags"], "bbox": bbox})
    return _group_spans_into_lines(all_spans)


def _extract_toc_chapters(doc, max_pages: int = 25) -> List[str]:
    toc_titles = []
    toc_pattern = re.compile(rf"(第[{_FW_DIGITS}一二三四五六七八九十百千万0-9]+\s*章)\s*(.+)")

    for i in range(min(max_pages, len(doc))):
        page = doc[i]
        lines = _extract_page_lines(page)
        line_texts = [l["text"] for l in lines]
        has_dots = any(".." in t or "．．" in t or ". ." in t for t in line_texts)
        if not has_dots and i > 3:
            continue

        for line in lines:
            text = line["text"].strip()
            # Use search instead of match: dots/numbers may precede the chapter title
            m = toc_pattern.search(text)
            if m:
                ch_num = m.group(1)
                rest = m.group(2).strip()
                # Strip trailing page numbers
                rest = re.sub(r"[\s\u2003\u3000]*[0-9０-９]+$", "", rest).strip()
                rest = re.sub(r"[\s.．·]+$", "", rest).strip()
                if rest:
                    toc_titles.append(f"{ch_num} {rest}")

    return toc_titles


def _find_chapter_starts(doc, toc_titles: List[str]) -> List[tuple]:
    if not toc_titles:
        return []

    toc_ch_nums = {}
    for title in toc_titles:
        m = CHAPTER_NUM_RE.search(title)
        if m:
            norm = _normalize_chapter_num(m.group())
            toc_ch_nums[norm] = title

    chapter_starts = []

    for i in range(len(doc)):
        page = doc[i]
        lines = _extract_page_lines(page)

        for line in lines:
            if line["size"] < 15:
                continue
            text = line["text"].strip()
            if not text:
                continue

            m = CHAPTER_NUM_RE.search(text)
            if not m:
                continue

            norm = _normalize_chapter_num(m.group())
            if norm in toc_ch_nums:
                already_found = any(
                    _normalize_chapter_num(CHAPTER_NUM_RE.search(title).group()) == norm
                    for _, title in chapter_starts
                    if CHAPTER_NUM_RE.search(title)
                )
                if not already_found:
                    chapter_starts.append((i + 1, toc_ch_nums[norm]))

        time.sleep(0)

    return chapter_starts


# ──────────────────────────────────────────────
# LLM-based fallback for chapter detection
# ──────────────────────────────────────────────

def _build_page_summary_for_llm(pages_data: list) -> str:
    """Build a compact summary: page number + first 2 lines, for LLM chapter detection."""
    lines = []
    for p in pages_data:
        first = [l["text"][:60] for l in p["lines"][:2] if l["text"].strip()]
        if first:
            lines.append(f"p{p['page']}: {' / '.join(first)}")
    return "\n".join(lines)


def _llm_identify_chapters(pages_data: list, filename: str) -> Optional[List[tuple]]:
    """Use LLM to identify chapter boundaries when rule-based methods fail.

    Sends only page summaries (page# + first 2 lines) to minimize token usage.
    Requires DEEPSEEK_API_KEY environment variable.
    """
    import os
    api_key = os.environ.get("DEEPSEEK_API_KEY")
    if not api_key:
        return None

    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key, base_url="https://api.deepseek.com")
    except Exception:
        return None

    summary = _build_page_summary_for_llm(pages_data)
    # Cap at ~30k chars to stay within reasonable token limits
    if len(summary) > 30000:
        summary = summary[:30000] + "\n...(truncated)"

    prompt = f"""Analyze this Chinese medical textbook's page summaries to identify chapter (章) start pages.

Book: {filename}

Pages:
{summary}

Rules:
- Chapter titles usually contain "第X章" (e.g. 第一章, 第2章, 第１章)
- Ignore "第X节" (those are sections within chapters, not top-level chapters)
- Ignore preface, TOC, index pages (typically first 15-20 pages)
- The chapter start page should be where the chapter content actually begins, not where it's listed in TOC

Return ONLY a JSON array. No explanation.
Example: [{{"page":25,"title":"第一章 组织学绪论"}},{{"page":40,"title":"第二章 上皮组织"}}]
If no chapters found, return: []"""

    try:
        response = client.chat.completions.create(
            model="deepseek-chat",
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}],
        )
        text = response.choices[0].message.content.strip()
        json_match = re.search(r"\[.*\]", text, re.DOTALL)
        if not json_match:
            return None
        items = json.loads(json_match.group())
        return [(item["page"], item["title"]) for item in items if "page" in item and "title" in item]
    except Exception:
        return None


def parse_pdf(file_path: str, textbook_id: str, filename: str, on_progress=None) -> ParsedTextbook:
    doc = fitz.open(file_path)
    total_pages = len(doc)

    pages_data = []
    for i in range(total_pages):
        page = doc[i]
        lines = _extract_page_lines(page)
        pages_data.append({"page": i + 1, "lines": lines})
        if on_progress and (i + 1) % 10 == 0:
            on_progress(i + 1, total_pages)
        # Yield the GIL every page so the asyncio event loop can process
        # other requests (health checks, status queries, etc.) without
        # being starved by this CPU-bound parsing thread.
        time.sleep(0)

    # Step 1: Rule-based TOC extraction
    toc_titles = _extract_toc_chapters(doc)
    chapter_starts = _find_chapter_starts(doc, toc_titles)

    # Step 2: LLM fallback if rule-based finds fewer than 2 chapters
    if len(chapter_starts) < 2:
        llm_result = _llm_identify_chapters(pages_data, filename)
        if llm_result and len(llm_result) >= 2:
            chapter_starts = llm_result

    doc.close()

    # Step 3: Build chapters
    if not chapter_starts:
        content = "\n".join(
            line["text"]
            for p in pages_data
            for line in p["lines"]
        )
        chapters = [{
            "chapter_id": "ch_01",
            "title": "全文",
            "page_start": 1,
            "page_end": total_pages,
            "content": content,
            "char_count": len(content),
        }]
    else:
        chapters = []
        for idx, (start_page, title) in enumerate(chapter_starts):
            end_page = chapter_starts[idx + 1][0] - 1 if idx + 1 < len(chapter_starts) else total_pages

            content_lines = []
            for p in pages_data:
                if start_page <= p["page"] <= end_page:
                    for line in p["lines"]:
                        if p["page"] == start_page and line["size"] >= 15:
                            if CHAPTER_NUM_RE.search(line["text"]):
                                continue
                        content_lines.append(line["text"])

            content = "\n".join(content_lines)
            if not content.strip():
                continue

            chapters.append({
                "chapter_id": f"ch_{len(chapters)+1:02d}",
                "title": title,
                "page_start": start_page,
                "page_end": end_page,
                "content": content,
                "char_count": len(content),
            })

    title = Path(filename).stem
    return make_textbook(
        textbook_id=textbook_id,
        filename=filename,
        title=title,
        file_type="pdf",
        total_pages=total_pages,
        chapters=chapters,
    )
