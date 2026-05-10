# 学科知识整合智能体

AI 全栈极速黑客松参赛作品 — 跨教材知识整合智能体

对多本教材进行知识整合：构建可视化知识图谱｜跨教材去重提纯｜RAG 精准问答｜自主设计 Agent 架构

## 环境依赖

- Python >= 3.11
- Node.js >= 18
- uv (Python 包管理)

## 安装步骤

```bash
# 安装 Python 依赖
uv sync

# 安装前端依赖
cd frontend && npm install
```

## 配置说明

环境变量配置（可选）：
```bash
# DeepSeek API（用于 LLM 调用，可选）
DEEPSEEK_API_KEY=your_api_key_here
```

教材文件通过前端上传，不依赖仓库内固定文件。

## 启动命令

```bash
# 启动后端 (端口 8000)
uv run uvicorn src.main:app --reload --port 8000

# 启动前端 (端口 5173)
cd frontend ; npm run dev
```

访问 http://localhost:5173 即可使用。

## 功能

- 多格式教材上传与解析 (PDF, Markdown, TXT, DOCX)
- 自动识别章节结构
- 知识图谱构建与可视化（D3.js 力导向图）
- 跨教材去重提纯，压缩比 ≤ 30%
- RAG 精准问答（带引用来源）
- 多轮对话式整合决策调整
- 整合报告生成

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | FastAPI (Python) |
| 前端 | React + Vite |
| 图谱可视化 | D3.js |
| PDF 解析 | PyMuPDF (fitz) |
| 向量嵌入 | sentence-transformers (BGE-small-zh) |
| 向量存储 | FAISS |
| LLM | DeepSeek API |

## 项目结构

```
src/
├── main.py              # FastAPI 入口
├── models.py            # Pydantic 数据模型
├── config.py            # 配置
├── storage.py           # 文件存储
├── parsers/             # 各格式解析器
│   ├── pdf_parser.py   # PDF 解析
│   ├── markdown_parser.py
│   ├── txt_parser.py
│   └── docx_parser.py
└── routes/              # API 路由
    └── textbooks.py
frontend/                # React 前端 (SPA)
data/                    # 数据目录（不提交到 git）
├── uploads/            # 上传文件
└── parsed/             # 解析结果
docs/                    # 开发文档
report/                  # 整合报告
```

## 开发文档

- [需求分析](docs/需求分析.md) — 子问题分解、粒度定义、重复判定标准、压缩比计算、RAG 分块策略
- [系统设计](docs/系统设计.md) — 架构设计、数据流、技术选型、API 接口
- [Agent 架构说明](docs/Agent架构说明.md) — 架构设计决策与论证
- [接口文档](docs/接口文档.md) — 完整 API 接口定义
- [整合报告](report/整合报告.md) — 以 7 本教材为例的整合报告

## 引用说明

本项目使用了以下开源项目：
- [PyMuPDF](https://pymupdf.readthedocs.io/) — PDF 解析
- [sentence-transformers](https://sbert.net/) — 文本嵌入
- [FAISS](https://github.com/facebookresearch/faiss) — 向量检索
- [D3.js](https://d3js.org/) — 数据可视化
