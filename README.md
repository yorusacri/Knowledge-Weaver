# 学科知识整合智能体

AI 全栈极速黑客松参赛作品 — 跨教材知识整合智能体

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

无需额外配置。教材文件通过前端上传，不依赖仓库内固定文件。

## 启动命令

```bash
# 启动后端 (端口 8000)
uv run uvicorn src.main:app --reload --port 8000

# 启动前端 (端口 5173)
cd frontend && npm run dev
```

访问 http://localhost:5173 即可使用。

## 功能

- 多格式教材上传与解析 (PDF, Markdown, TXT, DOCX)
- 自动识别章节结构
- 解析结果可视化预览

## 项目结构

```
src/
├── main.py              # FastAPI 入口
├── models.py            # 数据模型
├── config.py            # 配置
├── storage.py           # 文件存储
├── parsers/             # 各格式解析器
└── routes/              # API 路由
frontend/                # React 前端
data/uploads/            # 上传文件 (不提交)
data/parsed/             # 解析结果 (不提交)
```
