from ..models import ParsedTextbook


def make_textbook(textbook_id: str, filename: str, title: str,
                  file_type: str, total_pages, chapters) -> ParsedTextbook:
    total_chars = sum(ch["char_count"] for ch in chapters)
    return ParsedTextbook(
        textbook_id=textbook_id,
        filename=filename,
        title=title,
        file_type=file_type,
        total_pages=total_pages,
        total_chars=total_chars,
        chapters=chapters,
    )
