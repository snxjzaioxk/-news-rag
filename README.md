# 新闻热榜 RAG - News RAG Zero

基于 RAG (Retrieval-Augmented Generation) 技术的 AI 驱动新闻热榜与智能问答系统。

## 项目结构

```
.
├── api/                    # 后端 API 服务
│   ├── index.js           # Express 主服务器
│   ├── llm.js             # LLM 生成适配器
│   ├── articles.js        # 文章 API
│   ├── hotlist.js         # 热榜 API
│   ├── direct-hotlist.js  # 直接 API 热榜
│   ├── query.js           # RAG 查询 API
│   └── stats.js           # 统计信息 API
│
├── web/                    # Next.js 前端应用
│   ├── pages/             # 页面路由
│   │   ├── index.js       # 首页
│   │   ├── hotlist.js     # 热榜页面
│   │   ├── articles.js    # 文章列表
│   │   ├── search.js      # 智能搜索
│   │   └── api/           # Next.js API 路由
│   ├── styles/            # 样式文件
│   ├── ingest/            # 爬虫和数据处理
│   ├── lib/               # 工具库
│   └── public/            # 静态资源
│
├── config/                 # 配置文件
├── data/                   # 数据存储
├── public/                 # 公共静态资源
├── docs/                   # 文档
└── package.json           # 根项目依赖

```

## 快速开始

### 1. 安装依赖

```bash
# 安装根项目依赖
npm install

# 安装 web 项目依赖
cd web
npm install
```

### 2. 配置环境变量

复制 `.env.example` 到 `.env` 并填写配置:

```bash
cp .env.example .env
```

主要配置项:
- `SILICONFLOW_API_KEY` - 硅基流动 API Key (用于 LLM 和 Embedding)
- `SUPABASE_URL` - Supabase 数据库 URL
- `SUPABASE_ANON_KEY` - Supabase 匿名密钥

### 3. 启动服务

#### 开发模式

```bash
# 启动后端 API 服务 (端口 3005)
npm run api

# 启动前端开发服务器 (端口 3000)
cd web
npm run dev
```

#### 生产模式

```bash
# 构建前端
cd web
npm run build

# 启动前端生产服务器
npm start
```

## 主要功能

### 📰 热榜聚合
- 支持多平台热榜聚合 (知乎、微博、百度、GitHub 等)
- 双重爬虫策略 (RSSHub + 直接 API)
- 实时更新,热度排序

### 🤖 AI 智能问答
- 基于 RAG 技术的语义搜索
- 使用硅基流动的 Qwen2.5-14B 模型生成回答
- 向量化存储,快速检索

### 📊 数据统计
- 文章数量、文本片段、向量数量
- 多数据源统计
- 实时更新时间

## 技术栈

### 前端
- **Next.js 14** - React 框架
- **Tailwind CSS** - 样式框架
- **React 18** - UI 库

### 后端
- **Express** - Node.js 服务器框架
- **Node.js 22** - 运行环境 (原生 fetch 支持)

### AI & 数据
- **硅基流动** - LLM 生成和 Embedding
  - LLM: Qwen2.5-14B-Instruct
  - Embedding: BAAI/bge-large-zh-v1.5 (免费)
- **Supabase** - PostgreSQL 数据库
- **Upstash Redis** - 缓存服务

### 爬虫
- **Cheerio** - HTML 解析
- **RSS Parser** - RSS 订阅解析
- **Axios** - HTTP 客户端

## API 端点

### 后端 API (端口 3005)
- `GET /api/health` - 健康检查
- `GET /api/stats` - 统计信息
- `GET /api/hotlist` - 热榜数据
- `GET /api/direct-hotlist` - 直接 API 热榜
- `GET /api/articles` - 文章列表
- `POST /api/query` - RAG 查询
- `POST /api/crawl-hotlist` - 触发热榜爬取

### 前端 API (Next.js)
- `GET /api/health` - 健康检查
- `GET /api/hotlist` - 热榜数据
- `POST /api/llm` - LLM 生成

## 爬虫命令

```bash
# 爬取热榜
npm run crawl:hotlist

# 爬取完整新闻
npm run crawl

# 使用 orchestrator (推荐)
npm run crawl:v2
npm run crawl:v2:full
npm run crawl:v2:category
```

## 部署

### Vercel 部署

项目已配置 Vercel 部署,根目录为 `web/`:

```bash
# vercel.json 已配置
vercel --prod
```

### 环境变量

在 Vercel 中配置以下环境变量:
- `SILICONFLOW_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `UPSTASH_REDIS_REST_URL` (可选)
- `UPSTASH_REDIS_REST_TOKEN` (可选)

## 优化说明

### 项目结构优化
1. ✅ 删除了重复的 `ingest/` 和 `lib/` 文件夹 (保留在 `web/` 下)
2. ✅ 删除了冗余的 `api-vercel/` 目录
3. ✅ 移除了所有测试和临时文件
4. ✅ 将文档整理到 `docs/` 目录
5. ✅ 使用 Node.js 原生 `fetch`,移除 `node-fetch` 依赖

### 性能优化
- 使用 Next.js 14 静态生成
- Tailwind CSS JIT 编译
- API 路由优化
- 向量化存储加速检索

## 许可证

MIT

## 贡献

欢迎提交 Issue 和 Pull Request!
