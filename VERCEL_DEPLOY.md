# Vercel部署完整指南

## 🚀 快速部署步骤

### 1. 准备工作

#### 1.1 注册必需服务
- **Vercel账号**：https://vercel.com/
- **AI模型API密钥**（至少一个）：
  - [智谱AI](https://open.bigmodel.cn/) - 推荐
  - [硅基流动](https://siliconflow.cn/)
  - [OpenAI](https://platform.openai.com/)
- **数据库服务**（推荐Upstash Redis）：
  - [Upstash Redis](https://upstash.com/) - 免费额度大

#### 1.2 获取API密钥
```bash
# 智谱AI
GLM_API_KEY=your_key_here

# Upstash Redis
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token
```

### 2. Vercel项目配置

#### 2.1 导入项目
1. 登录Vercel控制台
2. 点击"Add New..." → "Project"
3. 连接GitHub仓库
4. 选择项目根目录（Root Directory: `/`）

#### 2.2 构建设置
```
Framework: Next.js (自动检测)
Root Directory: /
Build Command: cd web && npm run build
Install Command: cd web && npm install
Output Directory: web/.next
```

#### 2.3 环境变量配置
在Vercel项目设置中添加以下环境变量：

**必需配置**：
```bash
NODE_ENV=production
GLM_API_KEY=your_glm_api_key  # 或其他AI模型密钥
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token
```

**可选配置**：
```bash
CACHE_TTL=600
QUERY_CACHE_TTL=1800
MAX_QUERY_LENGTH=500
MAX_TOP_K=10
REQUEST_TIMEOUT=25000
```

### 3. 部署验证

#### 3.1 测试接口
部署完成后，测试以下端点：

1. **配置检查**：`GET /api/config`
   ```json
   {
     "status": "healthy",
     "services": {
       "ai": { "available": true, "provider": "glm" },
       "database": { "available": true, "type": "upstash-redis" }
     }
   }
   ```

2. **简单测试**：`GET /api/test`
   ```json
   {
     "message": "Vercel API 测试成功！",
     "timestamp": "2024-01-01T00:00:00.000Z"
   }
   ```

3. **健康检查**：`GET /health`
   ```json
   {
     "status": "ok",
     "timestamp": "2024-01-01T00:00:00.000Z",
     "platform": "vercel"
   }
   ```

#### 3.2 API功能测试
- **文章列表**：`GET /api/articles`
- **RAG查询**：`POST /api/query` (需要数据)
- **前端页面**：访问根路径

### 4. 常见问题解决

#### 4.1 API超时问题
**症状**：504 Gateway Timeout
**解决**：
- 检查AI模型API密钥是否正确
- 减少查询参数（如topK值）
- 确保请求在30秒内完成

#### 4.2 数据加载失败
**症状**：返回空数据或错误
**解决**：
- 检查Upstash Redis配置
- 确认数据文件存在（开发环境）
- 检查GitHub Actions是否正常运行

#### 4.3 配置错误
**症状**：500内部错误
**解决**：
- 访问`/api/config`检查配置状态
- 确保至少配置了一个AI模型
- 检查环境变量拼写

### 5. 性能优化

#### 5.1 缓存策略
- **文章列表**：10分钟缓存
- **AI查询结果**：30分钟缓存
- **统计信息**：1小时缓存

#### 5.2 监控建议
- 使用Vercel Analytics监控性能
- 设置Uptime监控API健康状态
- 定期检查API额度使用情况

### 6. 数据同步方案

由于Vercel无持久化存储，建议采用以下方案：

#### 6.1 自动数据更新
```yaml
# .github/workflows/vercel-data-sync.yml
name: 同步数据到Vercel

on:
  schedule:
    - cron: '0 */6 * * *'  # 每6小时
  workflow_dispatch:

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: 设置Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: 安装依赖
        run: npm ci

      - name: 执行数据爬取
        env:
          # 环境变量配置
          GLM_API_KEY: ${{ secrets.GLM_API_KEY }}
          UPSTASH_REDIS_REST_URL: ${{ secrets.UPSTASH_REDIS_REST_URL }}
          UPSTASH_REDIS_REST_TOKEN: ${{ secrets.UPSTASH_REDIS_REST_TOKEN }}
        run: |
          node ingest/main.js
          node scripts/sync-to-vercel.js
```

#### 6.2 数据同步脚本
创建`scripts/sync-to-vercel.js`将数据同步到Upstash Redis。

### 7. 成本估算

#### 7.1 免费额度
- **Vercel Hobby**：$0/月
  - 100GB带宽/月
  - 100万次函数调用

- **Upstash Redis**：$0/月
  - 10,000次请求/天
  - 256MB存储

- **智谱AI**：免费额度
  - 一定量的免费tokens

#### 7.2 付费升级
- 高流量时建议升级到Vercel Pro ($20/月)
- 大量缓存需求可升级Upstash Redis

### 8. 域名配置（可选）

#### 8.1 自定义域名
1. 在Vercel项目设置中点击"Domains"
2. 添加你的域名
3. 配置DNS记录：
   ```
   CNAME -> cname.vercel-dns.com
   ```

#### 8.2 SSL证书
Vercel自动提供SSL证书，无需手动配置。

### 9. 故障排查清单

- [ ] 检查Vercel部署日志
- [ ] 验证环境变量配置
- [ ] 测试API密钥有效性
- [ ] 检查数据库连接
- [ ] 访问`/api/config`查看状态
- [ ] 确认GitHub Actions运行状态
- [ ] 检查前端API调用地址

### 10. 生产环境建议

1. **安全建议**：
   - 使用环境变量存储密钥
   - 启用Vercel的密码保护（如需要）
   - 定期轮换API密钥

2. **性能建议**：
   - 实施多层缓存策略
   - 压缩API响应
   - 使用CDN分发静态资源

3. **监控建议**：
   - 设置错误告警
   - 监控API响应时间
   - 跟踪用户使用情况

---

🎉 **完成以上步骤后，你的新闻RAG系统就成功部署在Vercel上了！**