# 部署文档

本文档详细说明如何从零开始部署整个新闻 RAG 系统。

## 准备工作

### 必需账号

1. **GitHub** - 代码托管和自动化
2. **AI 模型 API** (至少一个):
   - [智谱AI](https://open.bigmodel.cn/) - 推荐,国内快
   - [硅基流动](https://siliconflow.cn/)
   - [OpenAI](https://platform.openai.com/)
3. **Zeabur** - API 和前端部署
4. **Cloudflare** (可选) - R2 存储

### 可选服务

- **Pinecone** - 向量数据库(有免费层)
- **Supabase** - PostgreSQL + pgvector

## 步骤 1: 获取 API Keys

### 1.1 智谱 AI (GLM)

1. 访问 https://open.bigmodel.cn/
2. 注册并登录
3. 进入控制台,创建 API Key
4. 记录:
   - `GLM_API_KEY`

### 1.2 硅基流动(可选)

1. 访问 https://siliconflow.cn/
2. 注册并实名认证
3. 获取 API Key
4. 记录:
   - `SILICONFLOW_API_KEY`

### 1.3 Pinecone(可选,推荐)

1. 访问 https://www.pinecone.io/
2. 注册免费账号
3. 创建索引(Index):
   - 名称: `news-index`
   - 维度: 1024 (GLM) 或 1536 (OpenAI)
   - Metric: cosine
4. 记录:
   - `PINECONE_API_KEY`
   - `PINECONE_ENVIRONMENT` (如 us-east-1)
   - `PINECONE_INDEX` (索引名)

## 步骤 2: 设置 GitHub 仓库

### 2.1 创建仓库

```bash
# 初始化 git
git init
git add .
git commit -m "Initial commit"

# 创建 GitHub 仓库并推送
git remote add origin <your-repo-url>
git push -u origin main
```

### 2.2 配置 Secrets

进入 GitHub 仓库 -> Settings -> Secrets and variables -> Actions

添加以下 Secrets:

**AI 模型**(至少一个):
```
GLM_API_KEY
GLM_EMBED_URL=https://open.bigmodel.cn/api/paas/v4/embeddings
GLM_CHAT_URL=https://open.bigmodel.cn/api/paas/v4/chat/completions

SILICONFLOW_API_KEY (可选)
SILICONFLOW_EMBED_URL=https://api.siliconflow.cn/v1/embeddings
SILICONFLOW_CHAT_URL=https://api.siliconflow.cn/v1/chat/completions

OPENAI_API_KEY (可选)
```

**向量数据库**(可选):
```
PINECONE_API_KEY
PINECONE_ENVIRONMENT
PINECONE_INDEX
```

### 2.3 测试 GitHub Actions

1. 进入 Actions 标签
2. 启用 Workflows
3. 手动触发 "每日新闻爬取与入库"
4. 查看运行日志,确保成功

## 步骤 3: 部署 API 服务

### 3.1 Zeabur 部署

1. 访问 https://zeabur.com/
2. 使用 GitHub 登录
3. 创建新项目
4. 添加服务 -> 从 Git 导入 -> 选择你的仓库
5. 配置服务:
   - **名称**: news-rag-api
   - **Root Directory**: `/` (根目录)
   - **Build Command**: `npm install`
   - **Start Command**: `node api/index.js`
   - **Port**: 3000

6. 添加环境变量:

```env
NODE_ENV=production
PORT=3000

# AI 模型配置(与 GitHub Secrets 相同)
GLM_API_KEY=<your-key>
GLM_EMBED_URL=https://open.bigmodel.cn/api/paas/v4/embeddings
GLM_CHAT_URL=https://open.bigmodel.cn/api/paas/v4/chat/completions

# 如果使用 Pinecone
PINECONE_API_KEY=<your-key>
PINECONE_ENVIRONMENT=us-east-1
PINECONE_INDEX=news-index
```

7. 点击部署
8. 等待部署完成,记录 API URL (如 `https://news-rag-api.zeabur.app`)

### 3.2 测试 API

```bash
# 健康检查
curl https://your-api-url.zeabur.app/health

# 应返回: {"status":"ok","timestamp":"..."}
```

## 步骤 4: 部署前端

### 4.1 Zeabur 部署前端

1. 在同一个 Zeabur 项目中,添加新服务
2. 选择同一个 GitHub 仓库
3. 配置:
   - **名称**: news-rag-web
   - **Root Directory**: `/web`
   - **Framework**: Next.js (自动检测)
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

4. 添加环境变量:

```env
API_BASE_URL=https://your-api-url.zeabur.app
```

5. 部署并获取前端 URL

### 4.2 Cloudflare Pages 部署(备选)

1. 登录 Cloudflare Dashboard
2. Pages -> 创建项目
3. 连接 GitHub 仓库
4. 配置:
   - **Framework**: Next.js
   - **Root directory**: `web`
   - **Build command**: `npm run build`
   - **Build output directory**: `.next`

5. 添加环境变量:
   ```
   API_BASE_URL=https://your-api-url.zeabur.app
   ```

6. 部署

## 步骤 5: 配置域名(可选)

### 5.1 Zeabur 绑定域名

1. 在 Zeabur 服务设置中
2. Networking -> Add Domain
3. 输入你的域名
4. 在 DNS 提供商添加 CNAME 记录

### 5.2 Cloudflare DNS

如果使用 Cloudflare Pages:

1. 在 Cloudflare DNS 中添加记录
2. Pages 会自动配置 SSL

## 步骤 6: 首次运行

### 6.1 手动触发入库

1. 进入 GitHub Actions
2. 运行 "每日新闻爬取与入库"
3. 等待完成(约 5-10 分钟)
4. 检查 Artifacts 中的数据文件

### 6.2 验证系统

访问前端 URL:

1. **首页** - 应显示热榜(如果有数据)
2. **智能搜索** - 测试问答功能
3. **文章列表** - 查看所有文章

## 故障排查

### API 无法启动

1. 检查 Zeabur 日志
2. 确认环境变量配置正确
3. 确认至少有一个 AI API Key 可用

### GitHub Actions 失败

1. 查看 Actions 运行日志
2. 检查 Secrets 是否配置
3. 确认 API Key 额度充足

### 前端无法连接 API

1. 检查 `API_BASE_URL` 环境变量
2. 确认 API 服务正常运行
3. 检查 CORS 配置

### 向量检索不工作

1. 确认向量已生成(查看 data/vectors.jsonl)
2. 如果使用 Pinecone,确认索引存在
3. 检查 embedding 维度是否匹配

## 性能优化

### 1. 使用 CDN

- 前端部署到 Cloudflare Pages
- 静态资源自动 CDN 加速

### 2. 向量数据库优化

- 数据量 > 10k 时,迁移到 Pinecone
- 使用批量 upsert 提升性能

### 3. API 缓存

在 `api/index.js` 中添加缓存层:

```javascript
// 使用 node-cache
const NodeCache = require('node-cache')
const cache = new NodeCache({ stdTTL: 600 }) // 10分钟缓存
```

### 4. 爬取频率

根据需求调整:
- 新闻类: 每 6 小时
- 资讯类: 每 12 小时
- 博客类: 每天一次

## 成本估算

### 完全免费方案

- GitHub Actions: 免费(公开仓库)
- Zeabur: 免费层(512MB RAM)
- Cloudflare R2: 免费 10GB
- GLM API: 免费额度(测试用)

**总成本**: ¥0/月

### 推荐方案

- GitHub Actions: 免费
- Zeabur Pro: $5/月
- Pinecone: $70/月(Starter)
- GLM API: ~¥50/月

**总成本**: ~¥100/月

## 监控和告警

### 1. Zeabur 监控

查看服务健康状态和资源使用

### 2. GitHub Actions 通知

失败时会自动发邮件

### 3. 自定义告警(可选)

在 Actions 中添加:

```yaml
- name: 发送通知
  if: failure()
  run: |
    curl -X POST ${{ secrets.WEBHOOK_URL }} \
      -d '{"text":"入库任务失败"}'
```

## 下一步

- [ ] 添加更多新闻源
- [ ] 优化分类算法
- [ ] 实现用户反馈机制
- [ ] 添加数据分析功能
- [ ] 实现多语言支持

## 支持

遇到问题?

1. 查看 [常见问题](./README.md#常见问题)
2. 提交 Issue
3. 参考官方文档

## 更新日志

### v1.0.0 (2024-01)

- 初始版本
- 支持多源新闻爬取
- RAG 问答功能
- 自动化部署
