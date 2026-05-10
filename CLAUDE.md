# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Context

This is a 5-hour hackathon project ("AI 全栈极速黑客松") for building an **AI agent that integrates knowledge across 7 medical textbooks**. The system must parse PDFs, build knowledge graphs, deduplicate across books (compress to ≤30%), and provide RAG-based Q&A with citations. The 7 textbook PDFs (~823 MB total) live in `textbooks/` and must NOT be committed to git.

## Recommended Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI (Python) |
| Frontend | React or Vue 3 (SPA) |
| Graph visualization | D3.js / ECharts / Cytoscape.js / AntV G6 |
| PDF parsing | PyMuPDF (fitz) — page-by-page, never load full book into memory |
| DOCX parsing | python-docx |
| Embedding | sentence-transformers (BGE-small-zh or paraphrase-multilingual-MiniLM-L12-v2) |
| Vector store | FAISS or ChromaDB |
| LLM | DeepSeek / Qwen / Claude / OpenAI API |

## Required Repository Structure

```
├── README.md                  # Env deps, install steps, config, run commands
├── .gitignore                 # Must exclude *.pdf and data/textbooks/*
├── docs/
│   ├── 需求分析.md             # Problem decomposition, chunking rationale
│   ├── 系统设计.md             # Architecture, data flow, tech choices, API spec
│   └── Agent架构说明.md        # Agent design decisions & justification (20 pts)
├── src/                       # All source code
├── report/
│   └── 整合报告.md             # Integration report using the 7 textbooks
├── requirements.txt           # Python deps
├── package.json               # Frontend deps
└── docker-compose.yml         # Optional: one-click deploy (加分项)
```

## Core Data Schemas

All parsers must output this unified structure (Pydantic models recommended):

- `ParsedTextbook`: textbook_id, filename, title, file_type, total_pages, total_chars, chapters[]
- `Chapter`: chapter_id, title, page_start, page_end, content, char_count
- `PageBlock`: page (int|None), text

Knowledge graph node: `{id, name, definition, category, chapter, page}`
Knowledge graph edge: `{source, target, relation_type, description}` — relation_type must be at least 3 of: `prerequisite`, `parallel`, `contains`, `applies_to`

Integration decision: `{decision_id, action (merge|keep|remove), affected_nodes[], result_node, reason, confidence}`

## Key API Endpoints (design reference)

```
POST /api/textbooks/upload          # multipart file upload
GET  /api/textbooks/{id}/status     # parse progress
GET  /api/textbooks/{id}/parsed     # structured chapters
POST /api/rag/index                 # build vector index
POST /api/rag/query                 # RAG Q&A with citations
GET  /api/rag/status                # index status
```

## Critical Constraints

- **Compression ratio**: integrated content must be ≤30% of original total character count
- **RAG chunking**: 500-800 chars per chunk, 50-100 char sliding window overlap, preserve metadata (textbook, chapter, page)
- **RAG citations**: every answer must cite `[教材名称, 第X章, 第X页]`; if no context found, reply "当前知识库中未找到相关信息"
- **Knowledge graph interaction**: must support click (detail popup), zoom, drag, frequency-based node sizing, color-by-textbook-source
- **Multi-round dialogue**: teachers can modify integration decisions via natural language; changes must reflect in the graph
- **Web SPA layout**: left=textbook panel, center=graph visualization (largest area), right=functional tabs (integration/RAG/dialogue/report)

## Scoring Dimensions (100 pts total)

| Dimension | Weight | Key scoring factor |
|-----------|--------|--------------------|
| A. 文档完整性 | 15 | README reproducibility, docs completeness |
| B. 功能实现 | 25 | All P0 features working end-to-end |
| C. 可视化创新 | 13 | Graph interactivity, multiple views, visual polish |
| D. Agent架构设计 | 20 | Design rationale depth, not agent count |
| E. 代码质量 | 17 | Structure, type hints, error handling, deploy config |
| F. 创新发挥 | 10 | Novel features/tech beyond spec, documented in Agent架构说明.md |

## PDF Parsing Notes (from part1.md)

- Use PyMuPDF's `page.get_text("blocks")` for text extraction with coordinates
- Filter header/footer by Y-coordinate: skip top 5% and bottom 5% of page height
- Chapter title detection: regex (`第X章`, `第X节`, `X.X`) + font size comparison + TOC extraction
- For TXT files, use `chardet` for encoding detection
- Store parsed results as `data/parsed/{book_id}.json`; originals in `data/uploads/`

## Development Priority (5-hour constraint)

1. Project skeleton + front/back end running (30 min)
2. PDF/MD/TXT parsing + frontend upload (1-2 hr)
3. Knowledge graph extraction + visualization (1 hr)
4. Cross-textbook integration + compression (45 min)
5. RAG pipeline (45 min)
6. Docs: Agent架构说明 > 需求分析 > 整合报告 > README (30 min)
7. Deploy to public URL (30 min)

## Common Commands

```bash
# Backend
pip install -r requirements.txt
uvicorn src.main:app --reload --port 8000

# Frontend
npm install
npm run dev

# Docker (if docker-compose.yml exists)
docker-compose up --build
```
