一、原文中“多格式教材加载与解析”相关要求提取
1. 功能定位

系统需要支持加载多种格式的教材文件，并在解析后统一转化为结构化数据。这是整个系统的入口模块，后续知识图谱构建、跨教材整合、RAG 问答都依赖这里产出的结构化教材内容。

2. 支持格式

要求支持：

格式	要求等级
PDF	必须
Markdown	必须
TXT	必须
Word .docx	必须
Excel	可选
3. 前端上传要求

前端需要提供文件上传区域，并满足：

支持拖拽上传；
支持点击选择文件；
支持批量上传多个文件；
上传后显示文件列表。

文件列表需要包含：

字段	说明
文件名	原始上传文件名
格式	pdf / md / txt / docx / xlsx 等
大小	文件体积
解析状态	解析中 / 已完成 / 失败
4. 解析后的统一输出结构

原文要求解析后统一输出类似结构：

{
  "textbook_id": "book_01",
  "filename": "生理学.pdf",
  "title": "生理学",
  "total_pages": 520,
  "total_chars": 385000,
  "chapters": [
    {
      "chapter_id": "ch_01",
      "title": "第一章 绪论",
      "page_start": 1,
      "page_end": 15,
      "content": "生理学是研究生物体正常生命活动规律的科学...",
      "char_count": 8500
    }
  ]
}
5. PDF 解析重点问题

PDF 解析需要处理：

章节标题识别；
通过字体大小、加粗、正则匹配“第 X 章”等方式识别章节；
页眉页脚过滤；
图表区域跳过；
大文件逐页解析，不能一次性把整本书加载到内存。
6. 验收标准

上传一本 PDF 教材后，系统能够：

正确识别章节结构；
在前端显示解析结果。
二、技术方案：多格式教材加载与解析模块
1. 模块目标

构建一个 Document Parser Service，负责把用户上传的教材文件统一解析为标准教材结构：

上传文件
  ↓
格式识别
  ↓
按格式调用解析器
  ↓
正文清洗
  ↓
章节切分
  ↓
结构化输出
  ↓
写入数据库 / 文件缓存

该模块的核心不是简单读取文本，而是要为后续知识图谱和 RAG 提供稳定、可追踪、带页码元数据的教材内容。

2. 推荐技术栈
后端
功能	推荐技术
Web 后端	FastAPI
PDF 解析	PyMuPDF，即 fitz
Markdown 解析	Python 原生读取 + markdown / mistune
TXT 解析	Python 原生读取
Word 解析	python-docx
Excel 解析	pandas + openpyxl
文件类型判断	python-magic 或后缀名兜底
异步任务	FastAPI BackgroundTasks / Celery，可简化为后台任务
数据存储	SQLite / JSON 文件 / PostgreSQL
前端上传	React + Ant Design Upload / 原生拖拽上传
最小可行方案

比赛时间只有 5 小时，建议优先使用：

FastAPI + PyMuPDF + React + JSON 文件存储

不建议一开始就引入复杂的任务队列和数据库。

3. 后端接口设计
3.1 上传教材接口
POST /api/textbooks/upload

请求：

multipart/form-data
files: File[]

返回：

{
  "uploaded": [
    {
      "textbook_id": "book_01",
      "filename": "生理学.pdf",
      "file_type": "pdf",
      "size": 10485760,
      "status": "uploaded"
    }
  ]
}
3.2 启动解析接口
POST /api/textbooks/{textbook_id}/parse

返回：

{
  "textbook_id": "book_01",
  "status": "parsing"
}

比赛中也可以在上传完成后自动触发解析，不单独暴露该接口。

3.3 查询解析状态接口
GET /api/textbooks/{textbook_id}/status

返回：

{
  "textbook_id": "book_01",
  "filename": "生理学.pdf",
  "status": "completed",
  "progress": 100,
  "total_pages": 520,
  "total_chars": 385000,
  "chapter_count": 12
}
3.4 获取解析结果接口
GET /api/textbooks/{textbook_id}/parsed

返回：

{
  "textbook_id": "book_01",
  "filename": "生理学.pdf",
  "title": "生理学",
  "total_pages": 520,
  "total_chars": 385000,
  "chapters": [
    {
      "chapter_id": "ch_01",
      "title": "第一章 绪论",
      "page_start": 1,
      "page_end": 15,
      "content": "...",
      "char_count": 8500
    }
  ]
}
4. 核心数据结构设计

建议定义统一的内部结构，所有格式最终都转成同一种 schema。

from pydantic import BaseModel
from typing import List, Optional


class PageBlock(BaseModel):
    page: Optional[int]
    text: str


class Chapter(BaseModel):
    chapter_id: str
    title: str
    page_start: Optional[int]
    page_end: Optional[int]
    content: str
    char_count: int


class ParsedTextbook(BaseModel):
    textbook_id: str
    filename: str
    title: str
    file_type: str
    total_pages: Optional[int]
    total_chars: int
    chapters: List[Chapter]

设计原则：

PDF 必须保留页码；
Markdown / TXT / DOCX 没有天然页码，可以令 page_start 和 page_end 为 null；
后续 RAG 分块时，PDF 的页码可以直接进入 citation；
非 PDF 文档可以用章节名作为引用来源。
5. PDF 解析方案
5.1 为什么选择 PyMuPDF

推荐使用 PyMuPDF，原因是：

解析速度快；
支持逐页读取；
可以获取文本块、字体大小、字体名称等信息；
比单纯 pdfplumber 更适合做章节标题识别；
能满足“逐页解析，不一次性加载整本书”的要求。
5.2 PDF 解析流程
打开 PDF
  ↓
逐页读取 page
  ↓
提取 text blocks / spans
  ↓
过滤页眉页脚
  ↓
过滤疑似图表说明或空文本
  ↓
识别章节标题
  ↓
将页面文本归入对应章节
  ↓
输出 chapters
5.3 逐页解析伪代码
import fitz
import re


chapter_pattern = re.compile(
    r"^\s*(第[一二三四五六七八九十百千万0-9]+[章节篇部]|chapter\s+\d+|[0-9]+\s*[\.、]\s*)"
)


def parse_pdf(file_path: str, textbook_id: str, filename: str):
    doc = fitz.open(file_path)

    pages = []
    for page_index in range(len(doc)):
        page = doc[page_index]
        text = extract_clean_page_text(page)
        pages.append({
            "page": page_index + 1,
            "text": text
        })

    chapters = split_into_chapters(pages)

    return {
        "textbook_id": textbook_id,
        "filename": filename,
        "title": guess_title(filename),
        "file_type": "pdf",
        "total_pages": len(doc),
        "total_chars": sum(len(p["text"]) for p in pages),
        "chapters": chapters
    }
5.4 页眉页脚过滤

教材 PDF 常见问题是每页都有重复页眉、页脚、页码。如果不处理，会污染 RAG 和知识图谱抽取。

简单可行策略

按页面纵坐标过滤：

def extract_clean_page_text(page):
    blocks = page.get_text("blocks")
    height = page.rect.height

    clean_blocks = []

    for block in blocks:
        x0, y0, x1, y1, text, *_ = block

        # 过滤顶部 5% 区域和底部 5% 区域
        if y1 < height * 0.05:
            continue
        if y0 > height * 0.95:
            continue

        text = text.strip()
        if not text:
            continue

        clean_blocks.append(text)

    return "\n".join(clean_blocks)
更稳妥策略

统计所有页面中高频出现的短文本：

如果某一行文本在超过 30% 页面中重复出现，
且长度较短，
则认为它可能是页眉、页脚或版权信息。

例如：

AI 全栈极速黑客松·赛题文档
第 3 页 / 共 20 页

这类内容应该过滤掉。

5.5 章节标题识别

章节标题识别可以采用“规则 + 字体特征 + LLM 兜底”的组合。

第一层：正则识别

适用于中文教材：

chapter_regexes = [
    r"^第[一二三四五六七八九十百千万0-9]+章\s+.+",
    r"^第[一二三四五六七八九十百千万0-9]+节\s+.+",
    r"^[0-9]+[\.、]\s*.+",
    r"^chapter\s+[0-9ivxlcdm]+[:\.\s]+.+"
]
第二层：字体大小识别

如果某一行文本满足：

字体明显大于正文平均字体；
位于页面上方；
字数较短；
不以句号、逗号结尾；

则可以判断为标题候选。

第三层：目录辅助识别

如果 PDF 前几页存在目录，可以先提取目录中的章节名，然后在正文中匹配。

第四层：LLM 兜底

对规则无法判断的教材，可以把每页前若干行交给 LLM 判断：

请判断以下文本行中哪些是章节标题，只返回 JSON。

但比赛中不建议大量使用 LLM 做章节识别，因为会慢且消耗 token。

6. Markdown 解析方案

Markdown 的结构最清晰，可以直接根据标题层级切分。

解析逻辑
# 作为文档标题；
## 作为一级章节；
### 可作为小节；
如果没有标题，则把全文作为一个默认章节。
def parse_markdown(file_path, textbook_id, filename):
    text = open(file_path, "r", encoding="utf-8").read()

    title = guess_title_from_markdown(text, filename)
    chapters = split_markdown_by_heading(text)

    return {
        "textbook_id": textbook_id,
        "filename": filename,
        "title": title,
        "file_type": "markdown",
        "total_pages": None,
        "total_chars": len(text),
        "chapters": chapters
    }

章节切分可以用：

heading_pattern = re.compile(r"^#{1,3}\s+.+$", re.MULTILINE)
7. TXT 解析方案

TXT 没有结构信息，需要使用规则进行章节识别。

优先规则

按以下模式识别：

第一章 绪论
第1章 绪论
一、绪论
1. 绪论
1.1 基本概念

如果无法识别章节：

全文作为一个章节，title = "全文"
编码处理

TXT 文件可能出现编码问题，建议使用：

import chardet


def read_text_file(path):
    raw = open(path, "rb").read()
    encoding = chardet.detect(raw)["encoding"] or "utf-8"
    return raw.decode(encoding, errors="ignore")
8. DOCX 解析方案

Word 文档推荐使用 python-docx。

解析逻辑
根据段落样式识别标题；
Heading 1 对应一级章节；
Heading 2 对应小节；
如果没有样式，则用正则识别“第 X 章”。
from docx import Document


def parse_docx(file_path, textbook_id, filename):
    document = Document(file_path)

    paragraphs = []
    for para in document.paragraphs:
        text = para.text.strip()
        if not text:
            continue

        style = para.style.name if para.style else ""
        paragraphs.append({
            "text": text,
            "style": style
        })

    chapters = split_docx_paragraphs(paragraphs)

    return {
        "textbook_id": textbook_id,
        "filename": filename,
        "title": guess_title(filename),
        "file_type": "docx",
        "total_pages": None,
        "total_chars": sum(len(p["text"]) for p in paragraphs),
        "chapters": chapters
    }
9. Excel 解析方案

Excel 是可选项，不建议花太多时间。

可行方案
每个 sheet 作为一个章节；
每一行合并成文本；
保留 sheet 名作为章节标题。
import pandas as pd


def parse_excel(file_path, textbook_id, filename):
    sheets = pd.read_excel(file_path, sheet_name=None)

    chapters = []
    for idx, (sheet_name, df) in enumerate(sheets.items(), start=1):
        content = df.fillna("").astype(str).to_csv(index=False)
        chapters.append({
            "chapter_id": f"ch_{idx:02d}",
            "title": sheet_name,
            "page_start": None,
            "page_end": None,
            "content": content,
            "char_count": len(content)
        })

    total_chars = sum(ch["char_count"] for ch in chapters)

    return {
        "textbook_id": textbook_id,
        "filename": filename,
        "title": guess_title(filename),
        "file_type": "excel",
        "total_pages": None,
        "total_chars": total_chars,
        "chapters": chapters
    }
10. 前端实现方案
10.1 页面布局

建议左侧作为教材管理区：

左侧面板：教材上传与解析状态
--------------------------------
[拖拽上传区域]

文件列表：
- 生理学.pdf      PDF    12.5MB   已完成
- 病理学.md       MD     800KB    解析中
- 免疫学.txt      TXT    1.2MB    失败
10.2 上传组件字段

前端状态建议设计为：

type TextbookFile = {
  textbook_id: string;
  filename: string;
  file_type: string;
  size: number;
  status: "uploaded" | "parsing" | "completed" | "failed";
  progress: number;
  error_message?: string;
};
10.3 上传流程
用户拖拽文件
  ↓
前端校验格式
  ↓
调用 POST /api/textbooks/upload
  ↓
后端保存文件并返回 textbook_id
  ↓
前端轮询 GET /api/textbooks/{id}/status
  ↓
状态完成后展示章节结构
11. 文件存储方案

比赛中推荐简单文件存储：

data/
  uploads/
    book_01.pdf
    book_02.md
  parsed/
    book_01.json
    book_02.json

每本教材解析完成后保存为：

data/parsed/book_01.json

这样后续模块可以直接读取 JSON，不需要重复解析。

12. 错误处理方案

需要处理以下情况：

错误类型	处理方式
文件格式不支持	返回 failed，并提示格式不支持
PDF 加密	返回 failed，并提示 PDF 加密无法解析
PDF 扫描版无文本	返回 failed 或提示需要 OCR
文本为空	返回 failed
编码错误	使用 chardet 自动检测
文件过大	逐页解析，必要时限制最大文件大小
章节识别失败	将全文作为默认章节，避免流程中断

比赛中建议对扫描版 PDF 只做提示，不强行做 OCR，因为 OCR 耗时较长。

13. 与后续模块的衔接

解析模块输出的 chapters 会被三个模块复用：

13.1 知识图谱模块

每个章节作为 LLM 抽取的最小输入单元：

chapter.content
  ↓
LLM 抽取知识点
  ↓
nodes + edges
13.2 跨教材整合模块

使用章节中的知识点和定义进行 embedding 对齐：

knowledge node definition
  ↓
embedding
  ↓
semantic merge
13.3 RAG 模块

章节内容继续切分为 chunk：

chapter.content
  ↓
500–800 字 chunk
  ↓
embedding
  ↓
FAISS / ChromaDB

因此解析阶段必须保留：

教材名；
章节名；
页码；
原文内容；
字数统计。
14. 建议实现优先级

比赛时间有限，推荐按以下顺序开发：

优先级	功能	原因
P0-1	PDF 解析	赛题明确必须验收
P0-2	MD / TXT 解析	实现成本低，必须支持
P0-3	前端上传 + 状态展示	直接影响验收观感
P0-4	章节识别	后续图谱和 RAG 的基础
P0-5	DOCX 支持	加分且实现简单
P1	Excel 支持	可选，时间充裕再做
P1	页眉页脚高频过滤	提升质量
P2	OCR 扫描 PDF	不建议 5 小时内做
15. 可写入文档的技术方案总结

可以在 docs/系统设计.md 或 docs/需求分析.md 中这样写：

### 多格式教材加载与解析模块

本系统设计了统一的教材解析层，用于将 PDF、Markdown、TXT、DOCX 等不同格式的教材文件转化为统一的结构化教材对象。解析后的对象包含教材 ID、文件名、标题、总页数、总字数以及章节列表，每个章节包含章节 ID、标题、起止页码、正文内容和字数统计。

对于 PDF 文件，系统采用 PyMuPDF 进行逐页解析，避免一次性加载整本教材导致内存占用过高。解析过程中先提取页面文本块，再基于页面坐标过滤页眉页脚区域，并结合章节标题正则、字体大小和页面位置识别章节边界。对于 Markdown 文件，系统根据标题层级进行切分；对于 TXT 文件，系统通过“第 X 章”“1.1”等规则识别章节；对于 DOCX 文件，系统优先依据 Word 标题样式识别结构，并使用正则规则作为补充。

所有解析结果会被保存为统一 JSON 文件，供后续知识图谱构建、跨教材整合和 RAG 问答模块复用。该设计降低了不同文件格式对后续模块的影响，使系统内部始终面向统一的数据结构工作。
16. 推荐落地版本

你的 5 小时黑客松里，最稳的实现是：

前端：
React + Upload 拖拽组件 + 文件列表 + 章节预览

后端：
FastAPI
/api/textbooks/upload
/api/textbooks/{id}/status
/api/textbooks/{id}/parsed

解析：
PDF：PyMuPDF 逐页解析 + 正则章节识别
MD：按 # / ## 标题切分
TXT：按“第 X 章”或数字标题切分
DOCX：python-docx，按 Heading 样式切分

存储：
data/uploads/ 保存原文件
data/parsed/ 保存结构化 JSON

这个方案工程量可控，且能够直接满足赛题对“多格式教材加载与解析”的核心验收要求。