# Vercel 部署配置说明

## 📁 项目结构

当前项目已经配置为：**Vercel 根目录设置为 `web` 文件夹**

```
web/
├── api/              # Vercel Serverless Functions (后端 API)
├── pages/            # Next.js 页面 (前端)
├── ingest/           # 爬虫和数据处理脚本
├── lib/              # 工具库
├── config/           # 配置文件
├── styles/           # 样式文件
├── package.json      # 包含前端和后端所有依赖
├── vercel.json       # Vercel 配置
└── .gitignore        # Git 忽略文件

```

## ⚙️ Vercel 配置步骤

### 1. 在 Vercel 控制台设置

1. 进入项目设置 (Settings)
2. **Root Directory**: 设置为 `web`
3. **Framework Preset**: Next.js
4. **Node.js Version**: 22.x
5. **Build Command**: `npm run build` (默认)
6. **Output Directory**: `.next` (默认)

### 2. 环境变量配置

在 Vercel 项目设置的 **Environment Variables** 中添加：

**必需的环境变量：**
```
UPSTASH_REDIS_REST_URL=your_upstash_redis_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
CRAWL_TOKEN=your_crawl_token
```

**可选的环境变量：**
```
NEXT_PUBLIC_API_BASE_URL=https://your-domain.vercel.app
NODE_ENV=production
```

### 3. 部署

完成上述配置后：
1. 提交代码到 Git 仓库
2. Vercel 会自动触发部署
3. 等待部署完成

## 📡 API 端点

部署后，API 端点将自动可用：

- `https://your-domain.vercel.app/api/hotlist` - 热榜列表
- `https://your-domain.vercel.app/api/direct-hotlist` - 直接 API 热榜
- `https://your-domain.vercel.app/api/crawl-hotlist` - 触发爬虫 (需要 token)
- `https://your-domain.vercel.app/api/query` - RAG 查询
- `https://your-domain.vercel.app/api/stats` - 统计信息
- `https://your-domain.vercel.app/api/health` - 健康检查

## 🔧 关键配置文件

### web/vercel.json
```json
{
  "functions": {
    "api/**/*.js": {
      "runtime": "@vercel/node@3.0.0"
    }
  }
}
```

### web/package.json
- 包含所有前端依赖 (Next.js, React)
- 包含所有后端依赖 (Express, Axios, Cheerio, etc.)
- `"type": "module"` - 支持 ES6 模块

## ✅ 验证部署

部署成功后，访问：
1. `https://your-domain.vercel.app` - 前端首页
2. `https://your-domain.vercel.app/api/health` - API 健康检查

如果返回 `{"status":"ok","timestamp":"..."}` 说明部署成功！

## 🐛 常见问题

### 1. Module not found 错误
**原因**: 依赖未安装或路径错误
**解决**: 检查 `web/package.json` 是否包含所需依赖

### 2. 500 Internal Server Error
**原因**: 环境变量缺失或配置错误
**解决**: 检查 Vercel 环境变量配置

### 3. API 路由 404
**原因**: `vercel.json` 配置错误或文件位置错误
**解决**: 确保 API 文件在 `web/api/` 目录下

### 4. Build 失败
**原因**: Node 版本不兼容或依赖冲突
**解决**: 确保 Vercel 设置中 Node.js 版本为 22.x

## 📝 注意事项

1. **所有后端代码必须在 `web/` 目录内**，因为 Vercel 根目录设置为 `web`
2. **不要在代码中使用根目录外的文件路径**（如 `../../api/`）
3. **环境变量必须在 Vercel 控制台配置**，不要提交 `.env` 文件
4. **API 函数有执行时间限制**（Hobby: 10s, Pro: 60s）
5. **静态文件放在 `web/public/` 目录**

## 🚀 本地开发

```bash
cd web
npm install
npm run dev
```

前端: http://localhost:3000
API: http://localhost:3000/api/*

## 📦 依赖说明

### 前端依赖
- next: Next.js 框架
- react, react-dom: React 库
- tailwindcss: CSS 框架

### 后端依赖
- @upstash/redis: Redis 客户端
- @supabase/supabase-js: Supabase 客户端
- axios: HTTP 客户端
- cheerio: HTML 解析
- node-fetch: Fetch API
- rss-parser: RSS 解析
- natural: 自然语言处理

## 🔄 更新部署

修改代码后：
```bash
git add .
git commit -m "your message"
git push
```

Vercel 会自动重新部署。
