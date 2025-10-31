# GitHub Actions & Vercel 部署配置清单

## ✅ 已完成的配置

### 1. GitHub Actions 工作流

已配置的自动化任务:

#### 🔥 热榜爬取 (`hotlist-cron.yml`)
- **频率**: 每 2 小时
- **执行**: `node web/ingest/hotlist-crawler.js`
- **输出**: `web/data/hotlist-*.json`
- **状态**: ✅ 已更新路径

#### 📰 完整新闻爬取 (`ingest-cron.yml`)
- **频率**: 每天 2 次 (北京时间 8:00 和 20:00)
- **执行**: `node web/ingest/main.js`
- **输出**: `web/data/*.json`
- **状态**: ✅ 已更新路径

#### 🚀 Vercel 触发爬取 (`crawl-vercel.yml`)
- **频率**: 每 30 分钟
- **方式**: 调用 Vercel API 端点
- **状态**: ✅ 配置完整

### 2. Vercel 部署配置

#### 根目录 `vercel.json`
```json
{
  "functions": {
    "api/**/*.js": {
      "runtime": "@vercel/node@3.0.0"
    }
  }
}
```
- **作用**: 配置后端 API 函数
- **状态**: ✅ 正确

#### Web 目录 `web/vercel.json`
```json
{}
```
- **作用**: Next.js 项目配置
- **状态**: ✅ Next.js 自动处理

## 📋 需要在 GitHub 配置的 Secrets

### 必需的 Secrets (用于爬虫)

在 GitHub 仓库 Settings → Secrets and variables → Actions 中添加:

```
SILICONFLOW_API_KEY=sk-xxxxxxxxxxxxx
```

### 可选的 Secrets (增强功能)

```
# Upstash Redis (缓存加速)
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here

# Supabase (向量存储)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here

# Vercel 触发 (用于 crawl-vercel.yml)
VERCEL_ENDPOINT=https://your-app.vercel.app/api/crawl-hotlist
CRAWL_TOKEN=your-secret-token
```

## 📋 需要在 Vercel 配置的环境变量

在 Vercel 项目 Settings → Environment Variables 中添加:

### 必需的变量

```
SILICONFLOW_API_KEY=sk-xxxxxxxxxxxxx
```

### 推荐的变量

```
# Redis 缓存 (提升性能)
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here

# Supabase (向量搜索)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here

# Node 环境
NODE_ENV=production
```

## 🔄 工作流程图

### GitHub Actions 自动爬取

```
定时触发 (每2小时)
    ↓
GitHub Actions 运行
    ↓
node web/ingest/hotlist-crawler.js
    ↓
生成 web/data/hotlist-latest.json
    ↓
上传到 GitHub Artifacts
    ↓
(可选) 提交到仓库
    ↓
Vercel 检测更新 → 自动部署
```

### Vercel 部署流程

```
推送代码到 GitHub
    ↓
Vercel 检测到变更
    ↓
自动构建 (cd web && npm run build)
    ↓
部署到生产环境
    ↓
网站更新
```

## 🧪 测试 GitHub Actions

### 手动触发测试

1. 进入 GitHub 仓库
2. 点击 Actions 标签
3. 选择工作流 (如 "每日热榜爬取")
4. 点击 "Run workflow"
5. 查看执行日志

### 验证结果

```bash
# 检查 Artifacts
# 在 Actions 运行记录中下载 hotlist-data-xxx 文件

# 或查看仓库中的数据文件
# web/data/hotlist-latest.json
```

## 📝 当前配置状态总结

### ✅ 已完成
- [x] GitHub Actions 路径已更新 (从 `ingest/` 到 `web/ingest/`)
- [x] Node.js 版本更新到 22
- [x] Vercel 部署配置正确
- [x] Next.js 配置正确
- [x] 项目结构优化完成

### ⚠️ 需要手动配置
- [ ] 在 GitHub Secrets 添加 `SILICONFLOW_API_KEY`
- [ ] 在 Vercel 环境变量添加 `SILICONFLOW_API_KEY`
- [ ] (可选) 配置 Redis 和 Supabase

### 🎯 验证清单

#### 验证 GitHub Actions
```bash
# 1. 推送代码
git add .
git commit -m "fix: 更新 GitHub Actions 配置"
git push

# 2. 在 GitHub Actions 查看是否成功运行
```

#### 验证 Vercel 部署
```bash
# 访问你的 Vercel 网址
https://your-app.vercel.app

# 检查:
# - 样式是否正常 (渐变背景)
# - API 是否可访问
# - 数据是否显示
```

## 🚀 下一步建议

1. **立即执行**:
   ```bash
   # 提交所有更改
   git add .
   git commit -m "chore: 优化项目结构和 CI/CD 配置"
   git push
   ```

2. **配置 Secrets**:
   - GitHub: 添加 `SILICONFLOW_API_KEY`
   - Vercel: 添加环境变量

3. **测试工作流**:
   - 手动触发一次 "每日热榜爬取"
   - 查看是否成功生成数据

4. **验证部署**:
   - 访问 Vercel 网站
   - 检查样式和功能

## 💡 提示

- GitHub Actions 使用 `web/ingest/` 下的脚本
- Vercel 部署使用 `web/` 作为根目录
- 数据文件统一存储在 `web/data/`
- Redis 配置是可选的,不影响核心功能
