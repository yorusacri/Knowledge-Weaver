import os
import re
import json
import hashlib
import logging
from typing import Optional

from ..storage import load_graph, load_all_graphs, save_integrated_graph

logger = logging.getLogger(__name__)

# ── Embedding ──────────────────────────────────────────────────────────────────

def _get_embedding_model():
    """Lazily init sentence-transformers model for embeddings."""
    if not hasattr(_get_embedding_model, "_model"):
        try:
            from sentence_transformers import SentenceTransformer
            # BGE-small-zh is a strong small Chinese model; fallback to multilingual MiniLM
            try:
                _get_embedding_model._model = SentenceTransformer("BAAI/bge-small-zh")
            except Exception:
                logger.warning("BGE-small-zh load failed, falling back to paraphrase-multilingual-MiniLM-L12-v2")
                _get_embedding_model._model = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")
            logger.info("Embedding model loaded: %s", type(_get_embedding_model._model).__name__)
        except Exception as e:
            logger.error("Failed to load sentence-transformers: %s", e)
            _get_embedding_model._model = None
    return _get_embedding_model._model


def _embed_texts(texts: list[str]) -> Optional[list[list[float]]]:
    """Embed a list of strings, returns None on failure."""
    model = _get_embedding_model()
    if model is None:
        return None
    try:
        embeddings = model.encode(texts, normalize_embeddings=True)
        return embeddings.tolist()
    except Exception as e:
        logger.error("Embedding failed: %s", e)
        return None


def _cosine_sim(a: list[float], b: list[float]) -> float:
    return sum(x * y for x, y in zip(a, b))


def _semantic_similarity(name1: str, name2: str, def1: str, def2: str) -> float:
    """Compute semantic similarity between two knowledge points."""
    texts = [f"{name1} {def1}", f"{name2} {def2}"]
    embeddings = _embed_texts(texts)
    if embeddings is None:
        return 0.0
    return _cosine_sim(embeddings[0], embeddings[1])


# ── LLM integration decision ─────────────────────────────────────────────────

LLM_DECISION_PROMPT = """你是一个学科知识整合专家，负责判断多个教材中的相似知识点是否应该合并。

以下是来自不同教材的知识点：

{knowledge_points}

请严格判断它们是否描述的是**完全相同**的概念。

合并标准（必须同时满足）：
1. 知识点名称基本相同（如同义词或仅是表述差异），例如"炎症"和"炎症反应"可合并
2. 定义的核心含义相同，不存在实质差异

**不合并**的标准：
- 名称不同，即使定义相似（如"细胞凋亡"vs"程序性细胞死亡"）
- 一个是另一个的应用场景（如"抗体"和"体液免疫"）
- 定义存在重要差异

请以JSON格式输出：

{{
  "action": "merge" 或 "keep" 或 "remove",
  "reason": "决策理由（40-100字）",
  "confidence": 0.0-1.0之间的置信度
}}

注意：
- 保守决策，宁可保留也不要错误合并
- 只有当多个知识点**几乎完全重复**时（如同一概念的不同表述）才用"merge"
- 完全不同的概念用"keep"
- 明显冗余且无教学价值的才用"remove"
- 输出的JSON不要包含markdown代码块标记
"""


def _format_knowledge_points(nodes: list[dict]) -> str:
    lines = []
    for i, n in enumerate(nodes):
        lines.append(f"[{i+1}] 教材: {n.get('textbook', '未知')} | 知识点: {n.get('name', '')} | 分类: {n.get('category', '')} | 定义: {n.get('definition', '')}")
    return "\n".join(lines)


def _call_llm_decision(nodes: list[dict]) -> Optional[dict]:
    """Use LLM to make integration decision on a cluster of similar nodes."""
    api_key = os.environ.get("DEEPSEEK_API_KEY")
    if not api_key:
        return None

    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key, base_url="https://api.deepseek.com")
    except Exception:
        return None

    kp_text = _format_knowledge_points(nodes)
    prompt = LLM_DECISION_PROMPT.format(knowledge_points=kp_text)

    try:
        response = client.chat.completions.create(
            model="deepseek-chat",
            max_tokens=1024,
            temperature=0.2,
            messages=[
                {"role": "system", "content": "你是一个严谨的学科知识整合专家。"},
                {"role": "user", "content": prompt},
            ],
        )
        text = response.choices[0].message.content.strip()

        # Parse JSON
        match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
        if match:
            text = match.group(1)
        else:
            match = re.search(r"\{.*\}", text, re.DOTALL)
            if match:
                text = match.group(0)

        result = json.loads(text)
        if "action" in result:
            return result
        return None
    except Exception as e:
        logger.warning("LLM decision failed: %s", e)
        return None


# ── Clustering & deduplication ────────────────────────────────────────────────

EMBEDDING_SIM_THRESHOLD = 0.90   # threshold for embedding similarity
LLM_CONF_THRESHOLD = 0.75       # threshold for LLM confidence to auto-merge


def _cluster_nodes_by_similarity(nodes: list[dict]) -> list[list[dict]]:
    """
    Cluster nodes that may represent the same knowledge point.
    Returns a list of clusters, each cluster is a list of nodes.
    """
    if not nodes:
        return []

    names = [n.get("name", "") for n in nodes]
    defs = [n.get("definition", "") for n in nodes]

    embeddings = _embed_texts(names)
    if embeddings is None:
        # Fallback: use exact name match only
        logger.warning("Embedding unavailable, using name-only deduplication")
        name_to_nodes = {}
        for n in nodes:
            key = n.get("name", "").strip()
            if key not in name_to_nodes:
                name_to_nodes[key] = []
            name_to_nodes[key].append(n)
        return list(name_to_nodes.values())

    n = len(nodes)
    # Build similarity matrix
    sim_matrix = [[0.0] * n for _ in range(n)]
    for i in range(n):
        for j in range(i + 1, n):
            s = _cosine_sim(embeddings[i], embeddings[j])
            sim_matrix[i][j] = s
            sim_matrix[j][i] = s

    # Union-Find clustering
    parent = list(range(n))

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(a, b):
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[rb] = ra

    for i in range(n):
        for j in range(i + 1, n):
            if sim_matrix[i][j] >= EMBEDDING_SIM_THRESHOLD:
                union(i, j)

    clusters = {}
    for i in range(n):
        r = find(i)
        if r not in clusters:
            clusters[r] = []
        clusters[r].append(nodes[i])

    return list(clusters.values())


# ── Integration pipeline ───────────────────────────────────────────────────────

def integrate_all_graphs():
    """
    Main entry point: load all textbook graphs, cluster & deduplicate,
    make merge decisions, save integrated graph and decisions.
    Returns (integrated_graph, decisions, stats)
    """
    graph_data = load_all_graphs()
    if not graph_data.nodes:
        raise ValueError("没有任何图谱数据，请先上传并构建教材图谱")

    nodes = [n.model_dump() for n in graph_data.nodes]
    edges = [e.model_dump() for e in graph_data.edges]

    logger.info("开始跨教材整合: %d 个节点", len(nodes))

    clusters = _cluster_nodes_by_similarity(nodes)
    decisions = []
    merge_count = 0
    keep_count = 0
    remove_count = 0

    for cluster in clusters:
        if len(cluster) == 1:
            # No duplicate, auto-keep
            decisions.append({
                "decision_id": f"keep_{len(decisions)+1:04d}",
                "action": "keep",
                "affected_nodes": [cluster[0]["id"]],
                "result_node": cluster[0]["id"],
                "reason": "该知识点在所有教材中无重复，保留",
                "confidence": 1.0,
                "textbook_sources": list({cluster[0].get("textbook", "")}),
            })
            keep_count += 1
            continue

        # Multiple nodes — ask LLM
        llm_result = _call_llm_decision(cluster)
        if llm_result:
            action = llm_result.get("action", "merge")
            reason = llm_result.get("reason", "LLM决策")
            confidence = llm_result.get("confidence", 0.5)
        else:
            # Fallback without LLM: keep all nodes, no merge
            for n in cluster:
                decisions.append({
                    "decision_id": f"keep_{len(decisions)+1:04d}",
                    "action": "keep",
                    "affected_nodes": [n["id"]],
                    "result_node": n["id"],
                    "reason": "无法确认相似性，保守保留",
                    "confidence": 0.3,
                    "textbook_sources": [n.get("textbook", "")],
                })
                keep_count += 1
            continue

        node_ids = [n["id"] for n in cluster]

        if action == "keep":
            # All nodes are different concepts — keep each as separate decision
            for n in cluster:
                decisions.append({
                    "decision_id": f"keep_{len(decisions)+1:04d}",
                    "action": "keep",
                    "affected_nodes": [n["id"]],
                    "result_node": n["id"],
                    "reason": reason or "LLM判定为不同概念，保持独立",
                    "confidence": confidence,
                    "textbook_sources": [n.get("textbook", "")],
                })
                keep_count += 1
        elif action == "remove":
            decisions.append({
                "decision_id": f"remove_{len(decisions)+1:04d}",
                "action": "remove",
                "affected_nodes": node_ids,
                "result_node": None,
                "reason": reason or "LLM判定为冗余，删除",
                "confidence": confidence,
                "textbook_sources": list({n.get("textbook", "") for n in cluster}),
            })
            remove_count += 1
        else:  # merge
            # Keep node with longest definition as representative
            best = max(cluster, key=lambda n: len(n.get("definition", "")))
            result_id = best["id"]
            decisions.append({
                "decision_id": f"merge_{len(decisions)+1:04d}",
                "action": "merge",
                "affected_nodes": node_ids,
                "result_node": result_id,
                "reason": reason or f"合并{len(cluster)}个相似知识点",
                "confidence": confidence,
                "textbook_sources": list({n.get("textbook", "") for n in cluster}),
            })
            merge_count += 1

    # Build merged graph
    merged_nodes, merged_edges = _build_merged_graph(nodes, edges, decisions)

    # Compute stats (compression based on total definition char count)
    original_total_chars = sum(len(n.get("definition", "")) for n in nodes) + len(nodes) * 200
    integrated_total_chars = sum(len(n.get("definition", "")) for n in merged_nodes) + len(merged_nodes) * 200
    compression = (1 - integrated_total_chars / original_total_chars) * 100 if original_total_chars > 0 else 0

    stats = {
        "nodesBefore": len(nodes),
        "nodesAfter": len(merged_nodes),
        "edgesBefore": len(edges),
        "edgesAfter": len(merged_edges),
        "compressionRatio": round(compression, 1),
        "originalChars": original_total_chars,
        "integratedChars": integrated_total_chars,
        "mergeCount": merge_count,
        "keepCount": keep_count,
        "removeCount": remove_count,
        "bookCount": graph_data.stats.bookCount,
    }

    # Save
    from ..models import GraphData
    integrated_graph = GraphData(
        nodes=merged_nodes,
        edges=merged_edges,
        stats=graph_data.stats,
    )
    save_integrated_graph(integrated_graph)
    save_decisions(decisions)
    save_stats(stats)

    logger.info(
        "整合完成: %d 节点→%d, %d 边→%d, 压缩%.1f%%",
        len(nodes), len(merged_nodes), len(edges), len(merged_edges), compression,
    )
    return integrated_graph, decisions, stats


def _build_merged_graph(
    all_nodes: list[dict],
    all_edges: list[dict],
    decisions: list[dict],
) -> tuple[list, list]:
    """Build the merged graph based on integration decisions."""
    # Map each original node to its final merged node
    node_map: dict[str, str] = {}  # original_id -> final_id
    removed_ids: set = set()

    for decision in decisions:
        action = decision.get("action", "merge")
        result_node = decision.get("result_node")
        affected = decision.get("affected_nodes", [])

        if action == "remove":
            for nid in affected:
                removed_ids.add(nid)
        elif action == "merge" and result_node:
            for nid in affected:
                if nid != result_node:
                    node_map[nid] = result_node
        elif action == "keep":
            pass  # keep as-is

    # Filter nodes
    merged_nodes = []
    for n in all_nodes:
        final_id = node_map.get(n["id"], n["id"])
        if n["id"] in removed_ids:
            continue
        # Deduplicate by final_id
        if any(mn["id"] == final_id for mn in merged_nodes):
            continue
        n = dict(n)
        n["id"] = final_id
        n["frequency"] = sum(1 for orig_id in node_map if node_map[orig_id] == final_id) + 1
        merged_nodes.append(n)

    # Remap edges
    merged_edges = []
    seen_edges = set()
    for e in all_edges:
        src = node_map.get(e["source"], e["source"])
        tgt = node_map.get(e["target"], e["target"])
        if src == tgt or src in removed_ids or tgt in removed_ids:
            continue
        key = (src, tgt, e.get("relation_type", ""))
        if key in seen_edges:
            continue
        seen_edges.add(key)
        e = dict(e)
        e["id"] = f"merged_edge_{len(merged_edges)+1:04d}"
        e["source"] = src
        e["target"] = tgt
        merged_edges.append(e)

    return merged_nodes, merged_edges


# ── Storage helpers ────────────────────────────────────────────────────────────

INTEGRATION_DIR = None

def _get_integration_dir():
    global INTEGRATION_DIR
    if INTEGRATION_DIR is None:
        from ..config import DATA_DIR
        INTEGRATION_DIR = DATA_DIR / "integration"
        INTEGRATION_DIR.mkdir(parents=True, exist_ok=True)
    return INTEGRATION_DIR


def save_decisions(decisions: list[dict]) -> None:
    path = _get_integration_dir() / "decisions.json"
    path.write_text(json.dumps(decisions, ensure_ascii=False, indent=2), encoding="utf-8")


def load_decisions() -> list[dict]:
    path = _get_integration_dir() / "decisions.json"
    if not path.exists():
        return []
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return []


def save_stats(stats: dict) -> None:
    path = _get_integration_dir() / "stats.json"
    path.write_text(json.dumps(stats, ensure_ascii=False), encoding="utf-8")


def load_stats() -> dict:
    path = _get_integration_dir() / "stats.json"
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}