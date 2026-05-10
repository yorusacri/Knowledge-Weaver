from .pdf_parser import parse_pdf
from .markdown_parser import parse_markdown
from .txt_parser import parse_txt
from .docx_parser import parse_docx

PARSERS = {
    "pdf": parse_pdf,
    "md": parse_markdown,
    "markdown": parse_markdown,
    "txt": parse_txt,
    "docx": parse_docx,
}
