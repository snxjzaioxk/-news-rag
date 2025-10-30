# ✅ Vercel 部署问题修复总结

## 问题诊断

由于您的 Vercel 根目录设置为 `web`，遇到了以下问题：
1. ❌ `module is not defined in ES module scope` - next.config.js 模块系统冲突
2. ❌ `api/` 文件夹在 `web/` 外，Vercel 无法访问
3. ⚠️  警告：Next.js 建议将 API 放在 `pages/api/` 而不是单独的 `api/` 目录

## 修复方案

### ✅ 1. 修复 next.config.js 的模块系统错误

**问题**：package.json 有 `"type": "module"` 但 next.config.js 使用 `module.exports`

**解决**：
- 移除 package.json 中的 `"type": "module"`
- 保持 next.config.js 使用 CommonJS 格式 (`module.exports`)

**文件**: `web/package.json`, `web/next.config.js`

### ✅ 2. 将 API 移动到 Next.js 标准位置

**问题**：API 文件在 `web/api/`，不符合 Next.js 最佳实践

**解决**：
- 移动 `web/api/` → `web/pages/api/`
- Next.js 会自动处理 `pages/api/` 下的所有文件作为 API 路由

**修改**：
```bash
mv web/api web/pages/api
```

### ✅ 3. 修复路径引用

**问题**：API 文件中的相对路径不正确

**解决**：
- `pages/api/crawl-hotlist.js` 中：
  - 从 `../ingest/` 改为 `../../ingest/`

### ✅ 4. 简化 vercel.json

**问题**：不需要手动配置 API runtime

**解决**：
- 简化为空配置 `{}`
- Next.js 自动处理 `pages/api/` 的 serverless 函数

### ✅ 5. 删除冲突文件

**问题**：`pages/api/index.js` 导致导入错误

**解决**：
- 删除 `pages/api/index.js`（Next.js 不需要这个文件）

### ✅ 6. 修复 query.js

**问题**：引用了不存在的 `handleRAGQuery` 函数

**解决**：
- 简化为占位实现，返回开发中提示

## 最终文件结构

```
web/ (Vercel 根目录)
├── pages/
│   ├── api/              # ✅ Next.js API 路由
│   │   ├── articles.js
│   │   ├── crawl-hotlist.js
│   │   ├── direct-hotlist.js
│   │   ├── health.js
│   │   ├── hotlist.js
│   │   ├── hotlist-latest.js
│   │   ├── llm.js
│   │   ├── query.js
│   │   └── stats.js
│   ├── index.js          # 首页
│   ├── hotlist.js
│   ├── search.js
│   └── articles.js
├── ingest/               # 爬虫脚本
├── lib/                  # 工具库
├── config/               # 配置
├── styles/               # 样式
├── package.json          # ✅ 无 "type": "module"
├── next.config.js        # ✅ CommonJS 格式
├── vercel.json           # ✅ 空配置 {}
└── .gitignore
```

## 构建测试结果

✅ **构建成功！无警告！**

```
✓ Compiled successfully
✓ Generating static pages (6/6)

Route (pages)                              Size     First Load JS
┌ ○ /                                      3.32 kB        83.6 kB
├ λ /api/articles                          0 B            77.9 kB
├ λ /api/crawl-hotlist                     0 B            77.9 kB
├ λ /api/direct-hotlist                    0 B            77.9 kB
├ λ /api/health                            0 B            77.9 kB
├ λ /api/hotlist                           0 B            77.9 kB
├ λ /api/query                             0 B            77.9 kB
├ λ /api/stats                             0 B            77.9 kB
├ ○ /articles                              1.58 kB        81.9 kB
├ ○ /hotlist                               2.51 kB        82.8 kB
└ ○ /search                                1.91 kB        82.2 kB
```

## Vercel 部署配置

### 1. 项目设置
- **Root Directory**: `web` ✅
- **Framework**: Next.js ✅
- **Node.js Version**: 22.x ✅
- **Build Command**: `npm run build` (默认) ✅
- **Output Directory**: `.next` (默认) ✅

### 2. 环境变量
在 Vercel 项目设置中添加：
```
UPSTASH_REDIS_REST_URL=xxx
UPSTASH_REDIS_REST_TOKEN=xxx
SUPABASE_URL=xxx
SUPABASE_KEY=xxx
CRAWL_TOKEN=xxx
NEXT_PUBLIC_API_BASE_URL=https://your-domain.vercel.app
```

### 3. 部署
```bash
git add web/
git commit -m "fix: 修复 Vercel 部署配置"
git push
```

Vercel 会自动触发部署。

## API 端点

部署后可用：
- `https://your-domain.vercel.app/api/health` ✅
- `https://your-domain.vercel.app/api/hotlist` ✅
- `https://your-domain.vercel.app/api/direct-hotlist` ✅
- `https://your-domain.vercel.app/api/crawl-hotlist` ✅
- `https://your-domain.vercel.app/api/articles` ✅
- `https://your-domain.vercel.app/api/stats` ✅
- `https://your-domain.vercel.app/api/query` ✅ (占位实现)

## 修复的文件列表

1. ✅ `web/next.config.js` - 改为 CommonJS 格式
2. ✅ `web/package.json` - 移除 "type": "module"
3. ✅ `web/vercel.json` - 简化为 {}
4. ✅ `web/pages/api/*` - 所有 API 文件移动到正确位置
5. ✅ `web/pages/api/crawl-hotlist.js` - 修复路径引用
6. ✅ `web/pages/api/query.js` - 简化实现
7. ✅ `web/.gitignore` - 更新忽略规则
8. ✅ 删除 `web/pages/api/index.js`

## 注意事项

1. **所有后端代码必须在 web/ 内**，因为这是 Vercel 根目录
2. **API 路由自动可用**：`pages/api/xxx.js` → `/api/xxx`
3. **query.js 是占位实现**，需要后续补充 RAG 查询逻辑
4. **环境变量必须在 Vercel 控制台配置**

## 下一步

现在可以安全地推送到 Git，Vercel 将成功部署！🚀
