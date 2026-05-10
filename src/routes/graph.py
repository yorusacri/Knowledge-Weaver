import asyncio
import logging
from fastapi import APIRouter, HTTPException

from ..storage import (
    load_parsed, load_graph, load_all_graphs,
    save_graph_build_status, load_graph_build_status,
)
from ..graph.extractor import extract_graph

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/graph", tags=["graph"])


@router.post("/{textbook_id}/build")
async def build_graph(textbook_id: str):
    """Trigger knowledge graph construction for a textbook."""
    parsed = load_parsed(textbook_id)
    if not parsed:
        raise HTTPException(404, "教材解析结果未找到，请先上传并解析教材")

    # Check if already building
    build_status = load_graph_build_status(textbook_id)
    if build_status and build_status.get("status") == "building":
        return {"textbook_id": textbook_id, "status": "building"}

    save_graph_build_status(textbook_id, "building", progress=0)

    async def _run_extraction():
        try:
            loop = asyncio.get_running_loop()
            await loop.run_in_executor(None, extract_graph, textbook_id)
        except Exception as e:
            logger.error("Graph extraction failed for %s: %s", textbook_id, e, exc_info=True)
            save_graph_build_status(textbook_id, "failed", error=str(e))

    asyncio.create_task(_run_extraction())
    return {"textbook_id": textbook_id, "status": "building"}


@router.get("/{textbook_id}")
async def get_graph(textbook_id: str):
    """Get graph data for a single textbook."""
    graph = load_graph(textbook_id)
    if not graph:
        raise HTTPException(404, "图谱数据未找到，请先构建图谱")
    return graph.model_dump()


@router.get("/{textbook_id}/build-status")
async def get_build_status(textbook_id: str):
    """Get the current build status for a textbook's graph."""
    status = load_graph_build_status(textbook_id)
    if not status:
        return {"textbook_id": textbook_id, "status": "not_started"}
    return status


@router.get("/all")
async def get_all_graphs():
    """Get merged graph data from all textbooks."""
    graph = load_all_graphs()
    return graph.model_dump()
