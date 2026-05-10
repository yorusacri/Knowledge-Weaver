import os
import re
import json
import logging
import hashlib
from typing import List, Optional

from ..models import ParsedTextbook, GraphNode, GraphEdge, GraphStats, GraphData
from ..storage import load_parsed, save_graph, save_graph_build_status

logger = logging.getLogger(__name__)

BOOK_COLORS = [
    "#f59e0b", "#3b82f6", "#10b981", "#8b5cf6",
    "#ec4899", "#06b6d4", "#f97316",
]

RELATION_COLORS = {
    "prerequisite": "#f59e0b",
    "parallel": "#3b82f6",
    "contains": "#10b981",
    "applies_to": "#8b5cf6",
}

VALID_CATEGORIES = {
    "核心概念", "生理机制", "疾病概念", "解剖结构",
    "生化过程", "免疫机制", "药理作用",
}

VALID_RELATIONS = {"prerequisite", "parallel", "contains", "applies_to"}

MAX_CHARS_PER_CHUNK = 6000

SYSTEM_PROMPT = """你是一个专业知识图谱提取专家，专注于中国医学教材。你的任务是从教材章节中提取知识点（节点）和它们之间的关系（边）。

要求：
1. 提取该章节中的核心知识点（概念、定理、方法、现象等）
2. 每个知识点需要提供：名称、定义、分类
3. 识别知识点之间的关系，关系类型包括：
   - prerequisite（前置依赖）：学习B之前必须先掌握A
   - parallel（并列关系）：同一层级的平行概念
   - contains（包含关系）：上位概念与下位概念
   - applies_to（应用关系）：某知识点是另一个的应用场景
4. 知识点分类必须是以下之一：核心概念、生理机制、疾病概念、解剖结构、生化过程、免疫机制、药理作用
5. 每个章节提取 5-15 个知识点，5-20 个关系
6. 定义要简洁准确，50-150字"""

FEW_SHOT_EXAMPLE = """
示例输入章节标题："第二章 细胞的基本功能"
示例输出：
{
  "nodes": [
    {"name": "静息电位", "definition": "细胞在安静状态下，膜内外存在的电位差，内负外正，约-70~-90mV。", "category": "核心概念"},
    {"name": "动作电位", "definition": "细胞受到刺激后膜电位发生的一次快速而可逆的倒转，是神经和肌肉细胞兴奋的标志。", "category": "核心概念"},
    {"name": "钠钾泵", "definition": "细胞膜上的一种主动转运蛋白，能逆浓度梯度将Na+泵出细胞、K+泵入细胞，维持膜电位。", "category": "生理机制"}
  ],
  "edges": [
    {"source_name": "静息电位", "target_name": "动作电位", "relation_type": "prerequisite", "description": "理解动作电位需要先掌握静息电位的概念"},
    {"source_name": "钠钾泵", "target_name": "静息电位", "relation_type": "prerequisite", "description": "钠钾泵是维持静息电位的关键机制"},
    {"source_name": "静息电位", "target_name": "动作电位", "relation_type": "parallel", "description": "两者是细胞电活动的两种基本状态"}
  ]
}
"""


def _get_textbook_color(filename: str) -> str:
    """Deterministically assign a color based on filename hash."""
    h = int(hashlib.md5(filename.encode()).hexdigest(), 16)
    return BOOK_COLORS[h % len(BOOK_COLORS)]


def _truncate_content(content: str, max_chars: int = MAX_CHARS_PER_CHUNK) -> str:
    """Truncate chapter content, keeping beginning and end."""
    if len(content) <= max_chars:
        return content
    head = content[: max_chars * 2 // 3]
    tail = content[-max_chars // 3 :]
    return head + "\n...(中间内容已省略)...\n" + tail


def _build_user_prompt(chapter_title: str, content: str) -> str:
    return f"""请从以下医学教材章节中提取知识点和关系。

章节标题：{chapter_title}

章节内容：
{content}

{FEW_SHOT_EXAMPLE}

请严格按照上述JSON格式输出，只输出JSON，不要任何解释文字。"""


def _parse_llm_response(text: str) -> Optional[dict]:
    """Parse LLM response, extracting JSON from possible markdown code blocks."""
    # Try to extract from code block
    match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if match:
        text = match.group(1)
    else:
        # Try to find raw JSON
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            text = match.group(0)

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return None


def _call_llm(chapter_title: str, content: str) -> Optional[dict]:
    """Call DeepSeek LLM to extract knowledge from a chapter."""
    api_key = os.environ.get("DEEPSEEK_API_KEY")
    if not api_key:
        logger.warning("DEEPSEEK_API_KEY not set, skipping LLM extraction")
        return None

    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key, base_url="https://api.deepseek.com")
    except Exception as e:
        logger.error("Failed to create OpenAI client: %s", e)
        return None

    truncated = _truncate_content(content)
    user_prompt = _build_user_prompt(chapter_title, truncated)

    try:
        response = client.chat.completions.create(
            model="deepseek-chat",
            max_tokens=4096,
            temperature=0.3,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
        )
        text = response.choices[0].message.content.strip()
        result = _parse_llm_response(text)
        if result and "nodes" in result and "edges" in result:
            return result
        logger.warning("LLM response missing nodes/edges for chapter: %s", chapter_title)
        return None
    except Exception as e:
        logger.error("LLM call failed for chapter '%s': %s", chapter_title, e)
        return None


def _validate_node(raw: dict) -> Optional[dict]:
    """Validate and clean a raw node dict from LLM output."""
    name = raw.get("name", "").strip()
    definition = raw.get("definition", "").strip()
    category = raw.get("category", "").strip()
    if not name or not definition:
        return None
    if category not in VALID_CATEGORIES:
        category = "核心概念"
    return {"name": name, "definition": definition, "category": category}


def _validate_edge(raw: dict, node_name_set: set) -> Optional[dict]:
    """Validate and clean a raw edge dict from LLM output."""
    source_name = raw.get("source_name", "").strip()
    target_name = raw.get("target_name", "").strip()
    relation_type = raw.get("relation_type", "").strip()
    description = raw.get("description", "").strip()

    if not source_name or not target_name:
        return None
    if source_name not in node_name_set or target_name not in node_name_set:
        return None
    if source_name == target_name:
        return None
    if relation_type not in VALID_RELATIONS:
        relation_type = "parallel"
    if not description:
        description = f"{source_name} 与 {target_name} 的关系"

    return {
        "source_name": source_name,
        "target_name": target_name,
        "relation_type": relation_type,
        "description": description,
    }


def _extract_chapter(chapter_title: str, content: str) -> tuple[list, list]:
    """Extract nodes and edges from a single chapter via LLM."""
    result = _call_llm(chapter_title, content)
    if not result:
        return [], []

    raw_nodes = [_validate_node(n) for n in result.get("nodes", [])]
    raw_nodes = [n for n in raw_nodes if n is not None]

    node_name_set = {n["name"] for n in raw_nodes}
    raw_edges = [_validate_edge(e, node_name_set) for e in result.get("edges", [])]
    raw_edges = [e for e in raw_edges if e is not None]

    return raw_nodes, raw_edges


def _deduplicate_nodes(nodes: list) -> list:
    """Deduplicate nodes by name, keeping the one with the longest definition."""
    by_name = {}
    for n in nodes:
        name = n["name"]
        if name not in by_name or len(n["definition"]) > len(by_name[name]["definition"]):
            by_name[name] = n
    return list(by_name.values())


def _build_graph(
    textbook_id: str,
    filename: str,
    all_raw_nodes: list,
    all_raw_edges: list,
) -> GraphData:
    """Convert raw extracted data into GraphData with proper IDs."""
    color = _get_textbook_color(filename)

    # Deduplicate nodes
    deduped = _deduplicate_nodes(all_raw_nodes)

    # Build name -> id mapping
    name_to_id = {}
    nodes = []
    for i, n in enumerate(deduped):
        node_id = f"{textbook_id}_node_{i + 1:03d}"
        name_to_id[n["name"]] = node_id
        nodes.append(GraphNode(
            id=node_id,
            name=n["name"],
            definition=n["definition"],
            category=n["category"],
            chapter=n.get("chapter", ""),
            page=n.get("page"),
            textbook=filename,
            textbook_color=color,
            frequency=1,
        ))

    # Build edges with proper IDs
    edges = []
    seen_edge_keys = set()
    for e in all_raw_edges:
        src_id = name_to_id.get(e["source_name"])
        tgt_id = name_to_id.get(e["target_name"])
        if not src_id or not tgt_id:
            continue
        edge_key = (src_id, tgt_id, e["relation_type"])
        if edge_key in seen_edge_keys:
            continue
        seen_edge_keys.add(edge_key)
        edge_id = f"{textbook_id}_edge_{len(edges) + 1:03d}"
        edges.append(GraphEdge(
            id=edge_id,
            source=src_id,
            target=tgt_id,
            relation_type=e["relation_type"],
            relation_color=RELATION_COLORS.get(e["relation_type"], "#999"),
            description=e["description"],
        ))

    return GraphData(
        nodes=nodes,
        edges=edges,
        stats=GraphStats(
            totalNodes=len(nodes),
            totalEdges=len(edges),
            bookCount=1,
        ),
    )


def extract_graph(textbook_id: str) -> GraphData:
    """Main entry point: extract knowledge graph from a parsed textbook."""
    parsed = load_parsed(textbook_id)
    if not parsed:
        raise ValueError(f"Textbook {textbook_id} not found or not parsed")

    api_key = os.environ.get("DEEPSEEK_API_KEY")
    if not api_key:
        logger.error("DEEPSEEK_API_KEY environment variable is not set! Cannot extract graph.")
        save_graph_build_status(textbook_id, "failed", error="DEEPSEEK_API_KEY not set")
        raise ValueError("DEEPSEEK_API_KEY not set — cannot perform LLM extraction")

    logger.info("Starting graph extraction for: %s (%d chapters)", parsed.filename, len(parsed.chapters))
    save_graph_build_status(textbook_id, "building", progress=0)

    all_raw_nodes = []
    all_raw_edges = []
    total_chapters = len(parsed.chapters)

    for i, chapter in enumerate(parsed.chapters):
        logger.info(
            "Extracting from chapter %d/%d: %s",
            i + 1, total_chapters, chapter.title,
        )
        try:
            raw_nodes, raw_edges = _extract_chapter(chapter.title, chapter.content)
            # Tag nodes with chapter info
            for n in raw_nodes:
                n["chapter"] = chapter.title
                n["page"] = chapter.page_start
            all_raw_nodes.extend(raw_nodes)
            all_raw_edges.extend(raw_edges)
            logger.info("Chapter '%s': extracted %d nodes, %d edges", chapter.title, len(raw_nodes), len(raw_edges))
        except Exception as e:
            logger.warning("Failed to extract from chapter '%s': %s", chapter.title, e, exc_info=True)

        progress = int((i + 1) / total_chapters * 100)
        save_graph_build_status(textbook_id, "building", progress=progress)

    if not all_raw_nodes:
        save_graph_build_status(textbook_id, "failed", error="No knowledge points extracted")
        raise ValueError("No knowledge points extracted from any chapter")

    graph = _build_graph(textbook_id, parsed.filename, all_raw_nodes, all_raw_edges)

    save_graph(textbook_id, graph)
    save_graph_build_status(textbook_id, "completed", progress=100)
    logger.info(
        "Graph built for %s: %d nodes, %d edges",
        parsed.filename, len(graph.nodes), len(graph.edges),
    )
    return graph
