import logging
from fastapi import APIRouter, HTTPException
from typing import List

from ..integration import (
    integrate_all_graphs, save_decisions, load_decisions,
    save_stats, load_stats,
)
from ..storage import load_all_graphs, load_integrated_graph

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/integration", tags=["integration"])


@router.post("/run")
async def run_integration():
    """Run cross-textbook knowledge graph integration."""
    try:
        integrated_graph, decisions, stats = integrate_all_graphs()
        return {
            "status": "completed",
            "decisions": decisions,
            "stats": stats,
        }
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        logger.error("Integration failed: %s", e, exc_info=True)
        raise HTTPException(500, f"整合失败: {e}")


@router.get("/decisions")
async def get_decisions():
    """Get all integration decisions."""
    decisions = load_decisions()
    return {"decisions": decisions}


@router.get("/decisions/{decision_id}")
async def get_decision(decision_id: str):
    """Get a specific integration decision."""
    decisions = load_decisions()
    for d in decisions:
        if d.get("decision_id") == decision_id:
            return d
    raise HTTPException(404, "决策未找到")


@router.patch("/decisions/{decision_id}")
async def update_decision(decision_id: str, body: dict):
    """Update an integration decision (e.g., change merge -> keep)."""
    decisions = load_decisions()
    for d in decisions:
        if d.get("decision_id") == decision_id:
            if "action" in body:
                d["action"] = body["action"]
            if "result_node" in body:
                d["result_node"] = body["result_node"]
            save_decisions(decisions)
            return d
    raise HTTPException(404, "决策未找到")


@router.get("/stats")
async def get_stats():
    """Get integration statistics."""
    stats = load_stats()
    return stats


@router.get("/compression")
async def get_compression():
    """Get compression ratio summary."""
    stats = load_stats()
    if not stats:
        return {"compressionRatio": 0, "originalChars": 0, "integratedChars": 0}
    return {
        "compressionRatio": stats.get("compressionRatio", 0),
        "originalChars": stats.get("originalChars", 0),
        "integratedChars": stats.get("integratedChars", 0),
    }


@router.get("/graph/merged")
async def get_merged_graph():
    """Get the merged integrated graph."""
    graph = load_integrated_graph()
    if not graph:
        # Fall back to all graphs combined (not yet merged)
        graph = load_all_graphs()
    return graph.model_dump()