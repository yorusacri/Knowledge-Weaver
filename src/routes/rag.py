import json
import logging
import os
import re
from typing import List, Optional

import faiss
import numpy as np
from fastapi import APIRouter, HTTPException
from openai import OpenAI
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer

from ..config import PARSED_DIR, VECTOR_DIR, CHUNK_SIZE, CHUNK_OVERLAP, EMBEDDING_MODEL

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/rag", tags=["rag"])

# Global embedding model (lazy-loaded)
_embedding_model: Optional[SentenceTransformer] = None
_faiss_index: Optional[faiss.IndexFlatIP] = None
_chunk_metadata: Optional[List[dict]] = None


def get_embedding_model() -> SentenceTransformer:
    global _embedding_model
    if _embedding_model is None:
        logger.info("Loading embedding model: %s", EMBEDDING_MODEL)
        _embedding_model = SentenceTransformer(EMBEDDING_MODEL)
    return _embedding_model


def get_faiss_index():
    global _faiss_index, _chunk_metadata
    if _faiss_index is not None:
        return _faiss_index, _chunk_metadata

    index_path = VECTOR_DIR / "index.faiss"
    chunks_path = VECTOR_DIR / "chunks.json"

    if not index_path.exists() or not chunks_path.exists():
        return None, None

    try:
        _faiss_index = faiss.read_index(str(index_path))
        _chunk_metadata = json.loads(chunks_path.read_text(encoding="utf-8"))
        logger.info("Loaded FAISS index with %d chunks", _faiss_index.ntotal)
        return _faiss_index, _chunk_metadata
    except Exception as e:
        logger.error("Failed to load FAISS index: %s", e)
        return None, None


def split_into_chunks(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> List[str]:
    """Split text into overlapping chunks, respecting paragraph/sentence boundaries."""
    if not text or not text.strip():
        return []

    chunks = []
    # Normalize whitespace
    text = re.sub(r'\s+', ' ', text.strip())

    # Try to split by paragraph first
    paragraphs = re.split(r'\n\s*\n', text)
    if len(paragraphs) <= 1:
        # Fall back to sentence splitting
        paragraphs = re.split(r'(?<=[。！？；\?!])', text)

    current_chunk = ""
    for para in paragraphs:
        para = para.strip()
        if not para:
            continue

        # If single paragraph exceeds chunk_size, split by sentence
        if len(para) > chunk_size:
            sentences = re.split(r'(?<=[。！？；\?!])', para)
            for sent in sentences:
                sent = sent.strip()
                if not sent:
                    continue
                if len(current_chunk) + len(sent) + 1 <= chunk_size:
                    current_chunk = (current_chunk + " " + sent).strip()
                else:
                    if current_chunk:
                        chunks.append(current_chunk)
                    # Keep overlap for next chunk
                    current_chunk = sent[-overlap:] if len(sent) > overlap else sent
            continue

        if len(current_chunk) + len(para) + 1 <= chunk_size:
            current_chunk = (current_chunk + " " + para).strip()
        else:
            if current_chunk:
                chunks.append(current_chunk)
            # Carry overlap
            current_chunk = para[-overlap:] if len(para) > overlap else para

    if current_chunk:
        chunks.append(current_chunk)

    return chunks


class RAGQueryInput(BaseModel):
    question: str


class Citation(BaseModel):
    textbook: str
    chapter: str
    page: Optional[int]
    relevance_score: float


class RAGQueryResponse(BaseModel):
    answer: str
    citations: List[Citation]
    source_chunks: List[str]


class RAGIndexResponse(BaseModel):
    status: str
    textbook_count: int
    chunk_count: int


class RAGStatusResponse(BaseModel):
    indexed: bool
    textbook_count: int
    chunk_count: int


def _build_citation_label(textbook_title: str, chapter_title: str, page: Optional[int]) -> str:
    """Build citation label in format: [教材名称, 第X章, 第X页]"""
    chapter_match = re.search(r'第\s*([一二三四五六七八九十百千零\d]+)\s*章', chapter_title)
    if chapter_match:
        chapter_str = f"第{chapter_match.group(1)}章"
    else:
        chapter_str = chapter_title

    if page is not None:
        return f"[{textbook_title}, {chapter_str}, 第{page}页]"
    else:
        return f"[{textbook_title}, {chapter_str}]"


@router.post("/index", response_model=RAGIndexResponse)
async def build_index():
    """Build RAG index from all parsed textbooks."""
    logger.info("Starting RAG index build")

    parsed_files = list(PARSED_DIR.glob("*.json"))
    parsed_files = [f for f in parsed_files if not f.name.startswith("_") and "status" not in f.name]

    if not parsed_files:
        raise HTTPException(404, "没有找到已解析的教材，请先上传并解析教材")

    all_chunks: List[dict] = []
    model = get_embedding_model()

    for parsed_file in parsed_files:
        try:
            data = json.loads(parsed_file.read_text(encoding="utf-8"))
            textbook_id = parsed_file.stem
            textbook_title = data.get("title", textbook_id)
            filename = data.get("filename", "")

            for chapter in data.get("chapters", []):
                chapter_id = chapter.get("chapter_id", "")
                chapter_title = chapter.get("title", "")
                page_start = chapter.get("page_start")
                page_end = chapter.get("page_end")
                content = chapter.get("content", "")

                if not content or not content.strip():
                    continue

                text_chunks = split_into_chunks(content)

                for idx, chunk_text in enumerate(text_chunks):
                    # Estimate page number within chapter (simple linear estimate)
                    chunk_char_pos = idx * (CHUNK_SIZE - CHUNK_OVERLAP)
                    est_page = None
                    if page_start is not None and page_end is not None:
                        total_chars = sum(len(c.get("content", "")) for c in data.get("chapters", []))
                        if total_chars > 0:
                            ratio = chunk_char_pos / total_chars
                            page_range = page_end - page_start + 1
                            est_page = page_start + int(ratio * page_range)
                            est_page = min(est_page, page_end or est_page)

                    all_chunks.append({
                        "textbook_id": textbook_id,
                        "textbook_title": textbook_title,
                        "filename": filename,
                        "chapter_id": chapter_id,
                        "chapter_title": chapter_title,
                        "page_start": page_start,
                        "page_end": page_end,
                        "chunk_index": idx,
                        "text": chunk_text,
                        "estimated_page": est_page,
                    })

            logger.info("Indexed %s: %d chunks from %d chapters",
                        textbook_id, len(text_chunks), len(data.get("chapters", [])))
        except Exception as e:
            logger.error("Failed to process %s: %s", parsed_file.name, e, exc_info=True)
            continue

    if not all_chunks:
        raise HTTPException(400, "没有找到可索引的内容块")

    # Embed chunks
    texts = [c["text"] for c in all_chunks]
    logger.info("Embedding %d chunks...", len(texts))
    embeddings = model.encode(texts, show_progress_bar=True, normalize_embeddings=True)

    # Build FAISS index (Inner Product for cosine similarity with normalized vectors)
    dimension = embeddings.shape[1]
    index = faiss.IndexFlatIP(dimension)
    index.add(embeddings.astype(np.float32))

    # Save index and metadata
    faiss.write_index(index, str(VECTOR_DIR / "index.faiss"))
    chunks_file = VECTOR_DIR / "chunks.json"
    chunks_file.write_text(json.dumps(all_chunks, ensure_ascii=False), encoding="utf-8")

    # Update global cache
    global _faiss_index, _chunk_metadata
    _faiss_index = index
    _chunk_metadata = all_chunks

    # Count unique textbooks
    textbook_count = len(set(c["textbook_id"] for c in all_chunks))

    logger.info("RAG index built: %d chunks from %d textbooks", len(all_chunks), textbook_count)
    return RAGIndexResponse(
        status="indexed",
        textbook_count=textbook_count,
        chunk_count=len(all_chunks),
    )


@router.post("/query", response_model=RAGQueryResponse)
async def query(input: RAGQueryInput):
    """Query the RAG system with a question."""
    index, chunks = get_faiss_index()

    if index is None or chunks is None:
        raise HTTPException(400, "RAG索引尚未构建，请先调用 POST /api/rag/index")

    model = get_embedding_model()

    # Embed question
    question_embedding = model.encode([input.question], normalize_embeddings=True)

    # Retrieve top-5 similar chunks
    k = min(5, index.ntotal)
    scores, indices = index.search(question_embedding.astype(np.float32), k)

    retrieved_chunks = []
    citations = []

    for rank, (score, idx) in enumerate(zip(scores[0], indices[0])):
        if idx < 0 or idx >= len(chunks):
            continue
        chunk = chunks[idx]
        retrieved_chunks.append(chunk["text"])

        citation = Citation(
            textbook=chunk["textbook_title"],
            chapter=chunk["chapter_title"],
            page=chunk.get("estimated_page") or chunk.get("page_start"),
            relevance_score=float(score),
        )
        citations.append(citation)

    if not retrieved_chunks:
        return RAGQueryResponse(
            answer="当前知识库中未找到相关信息",
            citations=[],
            source_chunks=[],
        )

    # Build context with citations
    context_parts = []
    for i, (chunk, citation) in enumerate(zip(retrieved_chunks, citations)):
        cite_label = _build_citation_label(citation.textbook, citation.chapter, citation.page)
        context_parts.append(f"[{i+1}] {cite_label}\n{chunk}")

    context = "\n\n".join(context_parts)

    system_prompt = """你是一个医学知识问答助手。你的任务是基于提供的上下文片段回答用户的问题。

要求：
1. 只根据提供的上下文片段回答问题，不要编造信息
2. 每个答案必须包含适当的引用来源，格式为：[教材名称, 第X章, 第X页]
3. 如果上下文中没有包含答案的相关信息，请回复"当前知识库中未找到相关信息"
4. 回答使用中文，保持专业、清晰、简洁
5. 如果多个上下文片段都包含相关信息，合并它们的答案并引用所有相关来源
"""

    user_prompt = f"""上下文片段：
{context}

用户问题：{input.question}

请基于上述上下文片段回答问题，并确保引用所有相关来源。"""

    # Call DeepSeek LLM
    api_key = os.getenv("DEEPSEEK_API_KEY")
    if not api_key:
        # Fallback: return retrieved chunks without LLM answer
        combined_chunks = "\n\n---\n\n".join(
            f"[{cite.textbook}, {cite.chapter}, 第{cite.page}页]\n{chunk}"
            for chunk, cite in zip(retrieved_chunks, citations)
        )
        return RAGQueryResponse(
            answer="[提示] DEEPSEEK_API_KEY 未设置，无法生成AI答案。以下是检索到的相关片段：\n\n" + combined_chunks,
            citations=citations,
            source_chunks=retrieved_chunks,
        )

    try:
        client = OpenAI(
            api_key=api_key,
            base_url="https://api.deepseek.com",
        )
        response = client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.3,
            max_tokens=1024,
        )
        answer = response.choices[0].message.content
    except Exception as e:
        logger.error("LLM call failed: %s", e, exc_info=True)
        combined_chunks = "\n\n".join(retrieved_chunks)
        answer = f"[提示] LLM调用失败。以下是检索到的相关片段：\n\n{combined_chunks}"

    return RAGQueryResponse(
        answer=answer,
        citations=citations,
        source_chunks=retrieved_chunks,
    )


@router.get("/status", response_model=RAGStatusResponse)
async def get_status():
    """Get RAG index status."""
    index_path = VECTOR_DIR / "index.faiss"
    chunks_path = VECTOR_DIR / "chunks.json"

    if not index_path.exists() or not chunks_path.exists():
        return RAGStatusResponse(indexed=False, textbook_count=0, chunk_count=0)

    try:
        chunks = json.loads(chunks_path.read_text(encoding="utf-8"))
        textbook_count = len(set(c.get("textbook_id") for c in chunks))
        return RAGStatusResponse(
            indexed=True,
            textbook_count=textbook_count,
            chunk_count=len(chunks),
        )
    except Exception as e:
        logger.error("Failed to read RAG status: %s", e)
        return RAGStatusResponse(indexed=False, textbook_count=0, chunk_count=0)