from pydantic import BaseModel
from typing import List, Optional


class PageBlock(BaseModel):
    page: Optional[int]
    text: str


class Chapter(BaseModel):
    chapter_id: str
    title: str
    page_start: Optional[int] = None
    page_end: Optional[int] = None
    content: str
    char_count: int


class ParsedTextbook(BaseModel):
    textbook_id: str
    filename: str
    title: str
    file_type: str
    total_pages: Optional[int] = None
    total_chars: int
    chapters: List[Chapter]


class UploadResponseItem(BaseModel):
    textbook_id: str
    filename: str
    file_type: str
    size: int
    status: str


class UploadResponse(BaseModel):
    uploaded: List[UploadResponseItem]


class TextbookStatus(BaseModel):
    textbook_id: str
    filename: str
    status: str
    progress: int
    total_pages: Optional[int] = None
    total_chars: Optional[int] = None
    chapter_count: Optional[int] = None
    error_message: Optional[str] = None


class TextbookListItem(BaseModel):
    textbook_id: str
    filename: str
    file_type: str
    size: int
    status: str
    progress: int = 0
