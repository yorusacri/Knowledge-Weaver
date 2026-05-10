# RAG 精准问答技术方案

## 1. 整体架构

```
用户问题
    │
    ▼
┌─────────────────────┐
│  BAAI/bge-small-zh  │  句子嵌入模型 → 1024维向量
│  question → vec     │
└────────┬────────────┘
         │ vec
         ▼
┌─────────────────────┐
│   FAISS IndexFlatIP │  top-5 向量检索（余弦相似度）
│                     │
└────────┬────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────┐
│              Prompt 构建                                 │
│  system_prompt（行为约束）                                │
│  + user_prompt（上下文片段 + 问题）                      │
└────────┬─────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────┐
│  DeepSeek Chat API  │  deepseek-chat, temperature=0.3
│  → 带引用回答       │
└─────────────────────────────────────────────────────────┘
```

---

## 2. 文档分块策略（Chunking）

### 2.1 分块参数

| 参数 | 值 | 说明 |
|------|-----|------|
| chunk_size | 600 字 | 每块字符数（题目标准 500-800，取中间值） |
| chunk_overlap | 100 字 | 相邻块之间的重叠字符数（题目标准 50-100，取上限） |

### 2.2 分割逻辑

按以下优先级依次尝试分割，遇到合适粒度即停：

```
输入文本
    │
    ▼
① 按 \n\n 分割为段落
    │
    ├── 段落数 > 1 且每段 ≤ 600字 → 直接分块
    │
    └── 否则进入 ②
    │
    ▼
② 按句末标点分割：。！？；？！·
    │
    ├── 单句 ≤ 600字 → 直接分块
    │
    └── 否则进入 ③
    │
    ▼
③ 硬截断（保留重叠）
```

**为什么这样分层？**

- **段落优先**：同一段落内语义连贯，截断段落会破坏语义完整性
- **句子次之**：医学教材的句子是独立语义单元，按句末标点切分最小程度损失信息
- **重叠机制**：相邻块保留 100 字重叠，确保跨块知识点不被截断

示例：

```
原文（1200字段落）：
"炎症是机体对各种损伤因子刺激所发生的以防御为主的反应。炎症的基本病理变化包括变质、渗出和增生。在临床上可出现红、肿、热、痛、功能障碍等表现..."

分块结果：
块1[600字] : "炎症是机体对各种损伤因子刺激所发生的以防御为主的反应。炎症的基本病理变化包括变质、渗出和增生。在临床上可出现红、肿、热、痛..."
          + "...功能障碍等表现" [后100字重叠]
块2[600字] : "功能障碍等表现是炎症的典型临床特征..."
```

### 2.3 分块粒度选择依据

| 粒度 | 优点 | 缺点 | 适用性 |
|------|------|------|--------|
| < 300 字 | 上下文纯净，噪声少 | 丢失段落上下文，关系链断裂 | 差 |
| **600 字** | **段落内完整，overlap 足够** | **轻微噪声** | **推荐** |
| > 1000 字 | 上下文丰富 | 单块信息密度低，检索精度下降 | 差 |

医学文本的特点是定义-机制-应用通常在连续 500-800 字内完整呈现，600 字是经过实验验证的平衡点。

---

## 3. 向量嵌入（Embedding）

### 3.1 模型选型

**模型**：`BAAI/bge-small-zh-v1.5`

| 指标 | 值 |
|------|-----|
| 维度 | 1024 |
| 参数量 | ~118M |
| 特点 | 中文优化，支持多语言，对医学术语有较好支持 |

**备选模型对比**：

| 模型 | 维度 | 中文支持 | 速度 | 推荐度 |
|------|------|----------|------|--------|
| `BAAI/bge-small-zh-v1.5` | 1024 | ★★★★★ | 快 | **推荐** |
| `paraphrase-multilingual-MiniLM-L12-v2` | 384 | ★★★★ | 很快 | 次选 |
| `text-embedding-3-small` (OpenAI) | 1536 | ★★★★ | 快 | 需 API 费用 |

### 3.2 归一化处理

```python
# 编码时归一化为单位向量
embeddings = model.encode(texts, normalize_embeddings=True)

# 使得 FAISS IndexFlatIP 等价于余弦相似度
# 内积 = 余弦相似度（当 ||vec|| = 1 时）
```

**为什么用单位向量 + 内积而不是欧氏距离？**

- 欧氏距离对向量长度敏感，长文本的向量模长大，距离天然偏大
- 余弦相似度只看方向，不受长度影响，更适合语义检索
- 归一化后内积等价余弦相似度，且计算更快

---

## 4. 向量存储与检索（FAISS）

### 4.1 索引类型选择

```python
dimension = 1024
index = faiss.IndexFlatIP(dimension)  # Inner Product（归一化后=余弦相似度）
index.add(embeddings.astype(np.float32))
```

| 索引类型 | 适用场景 | 精确度 | 搜索速度 |
|----------|----------|--------|----------|
| `IndexFlatIP` | < 100万向量 | 精确 | 慢（线性扫描） |
| `IndexIVFFlat` | > 100万向量 | 近似 | 快（需训练） |
| `IndexHNSW` | > 1000万向量 | 近似 | 极快 |

本赛题场景（7本教材，约数万个 chunk）使用 `IndexFlatIP` 精确检索即可，无需近似索引。

### 4.2 检索参数

```python
k = min(5, index.ntotal)  # 最多返回5个最相似 chunk
scores, indices = index.search(question_embedding.astype(np.float32), k)
```

**Top-5 选择依据**：

- 太少（1-2个）：答案覆盖不全面，容易遗漏跨章节知识
- 太多（>10个）：上下文窗口稀释，噪声增加，token 消耗增大
- 5个：是题目标配"引用来源"的合理数量

---

## 5. Prompt 工程

### 5.1 System Prompt

```
你是一个医学知识问答助手。你的任务是基于提供的上下文片段回答用户的问题。

要求：
1. 只根据提供的上下文片段回答问题，不要编造信息
2. 每个答案必须包含适当的引用来源，格式为：[教材名称, 第X章, 第X页]
3. 如果上下文中没有包含答案的相关信息，请回复"当前知识库中未找到相关信息"
4. 回答使用中文，保持专业、清晰、简洁
5. 如果多个上下文片段都包含相关信息，合并它们的答案并引用所有相关来源
```

### 5.2 User Prompt 模板

```
上下文片段：
[1] [生理学, 第二章, 第35页]
炎症是机体对各种损伤因子刺激所发生的以防御为主的反应...

[2] [病理学, 第四章, 第78页]
炎症的基本病理变化包括变质、渗出和增生三种改变...

[3] [免疫学, 第九章, 第302页]
固有免疫和适应性免疫均参与炎症反应的调控...

用户问题：什么是炎症？其基本病理变化有哪些？

请基于上述上下文片段回答问题，并确保引用所有相关来源。
```

### 5.3 引用标签构建逻辑

```python
def _build_citation_label(textbook_title: str, chapter_title: str, page: Optional[int]) -> str:
    # 从章节标题提取"第X章"中的数字/中文数字
    chapter_match = re.search(r'第\s*([一二三四五六七八九十百千零\d]+)\s*章', chapter_title)
    if chapter_match:
        chapter_str = f"第{chapter_match.group(1)}章"
    else:
        chapter_str = chapter_title  # 非标准格式保留原标题

    if page is not None:
        return f"[{textbook_title}, {chapter_str}, 第{page}页]"
    else:
        return f"[{textbook_title}, {chapter_str}]"
```

**生成示例**：
- 输入：`("生理学", "第二章 细胞的基本功能", 35)` → `"[生理学, 第二章, 第35页]"`
- 输入：`("生物化学", "第五章 核酸化学", None)` → `"[生物化学, 第五章 核酸化学]"`

### 5.4 上下文注入格式

```python
context_parts = []
for i, (chunk, citation) in enumerate(zip(retrieved_chunks, citations)):
    cite_label = _build_citation_label(citation.textbook, citation.chapter, citation.page)
    context_parts.append(f"[{i+1}] {cite_label}\n{chunk}")

context = "\n\n".join(context_parts)
# 输出：
# [1] [生理学, 第二章, 第35页]
# 炎症是机体对各种损伤因子刺激所发生的以防御为主的反应...
#
# [2] [病理学, 第四章, 第78页]
# 炎症的基本病理变化包括变质、渗出和增生三种改变...
```

每个片段前加 `[序号]` 是为了让 LLM 明确知道有多个来源，便于合并引用。

### 5.5 LLM 调用参数

```python
response = client.chat.completions.create(
    model="deepseek-chat",
    messages=[
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ],
    temperature=0.3,   # 低随机性，保证回答一致性
    max_tokens=1024,  # 限制输出长度，控制成本
)
```

| 参数 | 值 | 理由 |
|------|-----|------|
| temperature | 0.3 | 医学问答需要准确性，低随机性减少幻觉 |
| max_tokens | 1024 | 足够回答长度（约500字），避免过长输出 |
| model | deepseek-chat | 性价比高，中文能力强 |

---

## 6. 回答数据结构

```json
{
  "answer": "炎症是机体对致炎因子刺激所发生的防御性反应。基本病理变化包括变质（组织细胞损伤）、渗出（血管反应）和增生（组织修复）。[生理学, 第二章, 第35页] [病理学, 第四章, 第78页]",
  "citations": [
    {
      "textbook": "生理学",
      "chapter": "第二章 细胞的基本功能",
      "page": 35,
      "relevance_score": 0.92
    },
    {
      "textbook": "病理学",
      "chapter": "第四章 炎症",
      "page": 78,
      "relevance_score": 0.88
    }
  ],
  "source_chunks": [
    "炎症是机体对各种损伤因子刺激所发生的以防御为主的反应...",
    "炎症的基本病理变化包括变质、渗出和增生三种改变..."
  ]
}
```

---

## 7. 元数据保留策略

每个 chunk 携带以下元数据，确保可溯源：

```json
{
  "textbook_id": "book_abc12345",
  "textbook_title": "生理学",
  "filename": "生理学（第9版）.pdf",
  "chapter_id": "ch_02",
  "chapter_title": "第二章 细胞的基本功能",
  "page_start": 30,
  "page_end": 45,
  "chunk_index": 3,
  "text": "动作电位是细胞兴奋的核心事件...",
  "estimated_page": 35
}
```

**estimated_page 估算逻辑**：

```python
chunk_char_pos = idx * (CHUNK_SIZE - CHUNK_OVERLAP)  # 500（无重叠部分）
ratio = chunk_char_pos / total_chars_in_chapter
page_range = page_end - page_start + 1
est_page = page_start + int(ratio * page_range)
```

对于 PDF 教材，页码是精确的；对于 MD/TXT/DOCX，用估算页。

---

## 8. 边界情况处理

### 8.1 无相关结果

```python
if not retrieved_chunks:
    return RAGQueryResponse(
        answer="当前知识库中未找到相关信息",
        citations=[],
        source_chunks=[],
    )
```

### 8.2 API Key 未设置

```python
if not api_key:
    # 返回检索片段作为提示，不报错
    combined = "\n\n---\n\n".join(
        f"[{cite.textbook}, {cite.chapter}, 第{cite.page}页]\n{chunk}"
        for chunk, cite in zip(retrieved_chunks, citations)
    )
    return RAGQueryResponse(
        answer="[提示] DEEPSEEK_API_KEY 未设置，无法生成AI答案。以下是检索到的相关片段：\n\n" + combined,
        citations=citations,
        source_chunks=retrieved_chunks,
    )
```

### 8.3 LLM 调用失败

```python
except Exception as e:
    logger.error("LLM call failed: %s", e)
    return RAGQueryResponse(
        answer=f"[提示] LLM调用失败。以下是检索到的相关片段：\n\n{combined_chunks}",
        citations=citations,
        source_chunks=retrieved_chunks,
    )
```

---

## 9. API 接口定义

### POST /api/rag/index

**功能**：构建 RAG 向量索引

**响应**：
```json
{
  "status": "indexed",
  "textbook_count": 7,
  "chunk_count": 2847
}
```

**处理流程**：
1. 扫描 `data/parsed/*.json` 加载所有教材
2. 对每个章节调用 `split_into_chunks()` 分块
3. 用 `BAAI/bge-small-zh-v1.5` 嵌入所有 chunk
4. 保存 FAISS 索引到 `data/vector_index/index.faiss`
5. 保存 chunk 元数据到 `data/vector_index/chunks.json`

### POST /api/rag/query

**输入**：`{"question": "什么是炎症？"}`

**响应**：
```json
{
  "answer": "炎症是机体对致炎因子刺激发生的防御性反应...[引用]...",
  "citations": [...],
  "source_chunks": [...]
}
```

### GET /api/rag/status

**响应**：
```json
{
  "indexed": true,
  "textbook_count": 7,
  "chunk_count": 2847
}
```

---

## 10. 与赛题要求的对应关系

| 赛题要求 | 实现方案 |
|----------|----------|
| 500-800字/块 | 600字/块 ✅ |
| 50-100字重叠 | 100字重叠 ✅ |
| 保留教材名/章节/页码元数据 | chunk 携带完整元数据 ✅ |
| 引用格式 `[教材名称, 第X章, 第X页]` | `_build_citation_label()` ✅ |
| top-5 检索 | `k=5` ✅ |
| 无法回答时回复"未找到" | 空检索结果处理 ✅ |
| 调用 LLM 生成回答 | DeepSeek API ✅ |
