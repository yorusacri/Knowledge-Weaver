import json
from pathlib import Path
from typing import Optional

from .config import UPLOADS_DIR, PARSED_DIR, GRAPH_DIR
from .models import ParsedTextbook, TextbookStatus, GraphData

# Maps textbook_id -> original filename
_NAMES_FILE = PARSED_DIR / "_filenames.json"


def _load_names() -> dict:
    if _NAMES_FILE.exists():
        return json.loads(_NAMES_FILE.read_text(encoding="utf-8"))
    return {}


def _save_names(names: dict) -> None:
    _NAMES_FILE.write_text(json.dumps(names, ensure_ascii=False), encoding="utf-8")


def _set_original_name(textbook_id: str, filename: str) -> None:
    names = _load_names()
    names[textbook_id] = filename
    _save_names(names)


def _get_original_name(textbook_id: str) -> Optional[str]:
    return _load_names().get(textbook_id)


def _remove_original_name(textbook_id: str) -> None:
    names = _load_names()
    names.pop(textbook_id, None)
    _save_names(names)


def save_upload(file_bytes: bytes, textbook_id: str, filename: str) -> Path:
    _set_original_name(textbook_id, filename)
    dest = UPLOADS_DIR / f"{textbook_id}{Path(filename).suffix}"
    dest.write_bytes(file_bytes)
    return dest


def save_parsed(data: ParsedTextbook) -> Path:
    dest = PARSED_DIR / f"{data.textbook_id}.json"
    dest.write_text(data.model_dump_json(indent=2), encoding="utf-8")
    return dest


def load_parsed(textbook_id: str) -> Optional[ParsedTextbook]:
    path = PARSED_DIR / f"{textbook_id}.json"
    if not path.exists():
        return None
    return ParsedTextbook.model_validate_json(path.read_text(encoding="utf-8"))


def save_status(status: TextbookStatus) -> None:
    path = PARSED_DIR / f"{status.textbook_id}.status.json"
    tmp = path.with_suffix(".tmp")
    tmp.write_text(status.model_dump_json(), encoding="utf-8")
    tmp.replace(path)


def load_status(textbook_id: str) -> Optional[TextbookStatus]:
    path = PARSED_DIR / f"{textbook_id}.status.json"
    if not path.exists():
        return None
    try:
        text = path.read_text(encoding="utf-8")
        if not text.strip():
            return None
        return TextbookStatus.model_validate_json(text)
    except Exception:
        return None


def delete_textbook(textbook_id: str) -> bool:
    found = False
    for f in UPLOADS_DIR.glob(f"{textbook_id}.*"):
        f.unlink()
        found = True
    for f in PARSED_DIR.glob(f"{textbook_id}.*"):
        f.unlink()
        found = True
    delete_graph(textbook_id)
    _remove_original_name(textbook_id)
    return found


def list_uploaded_textbooks():
    results = []
    names = _load_names()
    for f in UPLOADS_DIR.iterdir():
        if f.is_file():
            tid = f.stem
            status = load_status(tid)
            original_name = names.get(tid, f.name)
            results.append({
                "textbook_id": tid,
                "filename": original_name,
                "file_type": Path(original_name).suffix.lstrip(".").lower(),
                "size": f.stat().st_size,
                "status": status.status if status else "uploaded",
                "progress": status.progress if status else 0,
            })
    return results


# ── Graph Storage ──

def save_graph(textbook_id: str, graph_data: GraphData) -> Path:
    dest = GRAPH_DIR / f"{textbook_id}.json"
    dest.write_text(graph_data.model_dump_json(indent=2), encoding="utf-8")
    return dest


def load_graph(textbook_id: str) -> Optional[GraphData]:
    path = GRAPH_DIR / f"{textbook_id}.json"
    if not path.exists():
        return None
    try:
        return GraphData.model_validate_json(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def load_all_graphs() -> GraphData:
    """Merge all individual textbook graphs into one."""
    from .models import GraphNode, GraphEdge, GraphStats
    all_nodes = []
    all_edges = []
    book_ids = set()
    for f in sorted(GRAPH_DIR.glob("*.json")):
        if f.name.startswith("_") or ".build_status" in f.name:
            continue
        try:
            g = GraphData.model_validate_json(f.read_text(encoding="utf-8"))
            all_nodes.extend(g.nodes)
            all_edges.extend(g.edges)
            book_ids.add(f.stem)
        except Exception:
            continue
    return GraphData(
        nodes=all_nodes,
        edges=all_edges,
        stats=GraphStats(
            totalNodes=len(all_nodes),
            totalEdges=len(all_edges),
            bookCount=len(book_ids),
        ),
    )


def delete_graph(textbook_id: str) -> None:
    for f in GRAPH_DIR.glob(f"{textbook_id}.*"):
        f.unlink()


def save_integrated_graph(graph_data: GraphData) -> Path:
    dest = GRAPH_DIR / "_integrated.json"
    dest.write_text(graph_data.model_dump_json(indent=2), encoding="utf-8")
    return dest


def load_integrated_graph() -> Optional[GraphData]:
    path = GRAPH_DIR / "_integrated.json"
    if not path.exists():
        return None
    try:
        return GraphData.model_validate_json(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def save_graph_build_status(textbook_id: str, status: str, progress: int = 0, error: str = None) -> None:
    path = GRAPH_DIR / f"{textbook_id}.build_status.json"
    data = {"textbook_id": textbook_id, "status": status, "progress": progress}
    if error:
        data["error"] = error
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    tmp.replace(path)


def load_graph_build_status(textbook_id: str) -> Optional[dict]:
    path = GRAPH_DIR / f"{textbook_id}.build_status.json"
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None
