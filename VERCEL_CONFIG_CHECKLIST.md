# Vercel 部署配置清单

## ⚠️ 必须在 Vercel 控制台完成以下配置

### 1. 项目设置 (Settings → General)

访问: https://vercel.com/dashboard → 选择项目 `news-rag` → Settings → General

#### 1.1 Root Directory
```
Root Directory: web
```
点击 Edit → 输入 `web` → Save

#### 1.2 Node.js Version
```
Node.js Version: 18.x
```
点击 Edit → 选择 `18.x` → Save

⚠️ **这一步非常重要!** 如果不修改,将继续报错 "Found invalid Node.js Version: 22.x"

#### 1.3 Framework Preset
```
Framework Preset: Next.js (自动检测)
```
应该已经自动设置为 Next.js

---

### 2. 环境变量 (Settings → Environment Variables)

访问: https://vercel.com/dashboard → 选择项目 → Settings → Environment Variables

#### 必需的环境变量:

| 变量名 | 值 | 环境 | 说明 |
|--------|-----|------|------|
| `UPSTASH_REDIS_REST_URL` | 你的 Redis URL | Production, Preview, Development | Upstash Redis 连接地址 |
| `UPSTASH_REDIS_REST_TOKEN` | 你的 Redis Token | Production, Preview, Development | Upstash Redis 认证令牌 |

#### 可选的环境变量:

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `CRAWL_TOKEN` | 自定义密钥 | 保护爬虫 API 端点 |
| `NODE_ENV` | production | 生产环境标识 |

---

### 3. 获取 Upstash Redis 凭证

如果还没有 Upstash Redis:

1. 访问 https://console.upstash.com/
2. 注册/登录账号
3. 点击 **Create Database**
4. 配置:
   - **Name**: news-rag-db
   - **Type**: Regional (免费)
   - **Region**: 选择离 Vercel 部署区域近的 (建议 us-east-1)
   - **Eviction**: 默认即可
5. 创建后,在数据库详情页找到 **REST API** 部分:
   - 复制 `UPSTASH_REDIS_REST_URL`
   - 复制 `UPSTASH_REDIS_REST_TOKEN`
6. 将这两个值添加到 Vercel 环境变量

---

### 4. 部署验证清单

完成上述配置后,点击 **Redeploy**:

- [ ] Vercel 项目 Root Directory 已设置为 `web`
- [ ] Node.js Version 已设置为 `18.x`
- [ ] 已添加 `UPSTASH_REDIS_REST_URL` 环境变量
- [ ] 已添加 `UPSTASH_REDIS_REST_TOKEN` 环境变量
- [ ] 点击 Deployments → 最新部署 → Redeploy

---

### 5. 部署成功后的验证步骤

部署成功后,测试以下端点:

#### 5.1 健康检查
```bash
curl https://news-rag-iota.vercel.app/api/health
```
预期返回:
```json
{
  "status": "ok",
  "timestamp": "2024-10-30T...",
  "platform": "vercel"
}
```

#### 5.2 统计信息
```bash
curl https://news-rag-iota.vercel.app/api/stats
```

#### 5.3 访问首页
```
https://news-rag-iota.vercel.app/
```
应该能看到样式正常的页面

---

### 6. 首次数据填充

部署成功后,需要手动触发一次爬虫来填充数据:

```bash
curl -X POST https://news-rag-iota.vercel.app/api/crawl-hotlist
```

如果设置了 `CRAWL_TOKEN`:
```bash
curl -X POST https://news-rag-iota.vercel.app/api/crawl-hotlist \
  -H "Authorization: Bearer 你的CRAWL_TOKEN"
```

---

### 7. 常见问题排查

#### 问题 1: 样式丢失
- **原因**: Tailwind CSS 未正确编译
- **解决**: 确保 Root Directory 设置为 `web`

#### 问题 2: API 404
- **原因**: API 路由未正确部署
- **解决**: 确保 `web/pages/api/` 目录下有所有 API 文件

#### 问题 3: Redis 连接失败
- **原因**: 环境变量未设置或错误
- **解决**: 检查 Upstash Redis 凭证是否正确

#### 问题 4: Node.js 版本错误
- **原因**: Vercel 项目设置中 Node.js 版本仍为 22.x
- **解决**: 在 Settings → General → Node.js Version 改为 18.x

---

### 8. 设置自动更新 (可选)

可以使用 GitHub Actions 定期触发爬虫:

创建 `.github/workflows/crawl.yml`:
```yaml
name: 定时爬取热榜

on:
  schedule:
    - cron: '0 */2 * * *'  # 每2小时
  workflow_dispatch:

jobs:
  crawl:
    runs-on: ubuntu-latest
    steps:
      - name: 触发爬虫
        run: |
          curl -X POST https://news-rag-iota.vercel.app/api/crawl-hotlist \
            -H "Authorization: Bearer ${{ secrets.CRAWL_TOKEN }}"
```

---

## 🎯 快速开始命令

```bash
# 1. 克隆仓库
git clone https://github.com/snxjzaioxk/news-rag.git
cd news-rag

# 2. 安装依赖
cd web && npm install

# 3. 本地开发
npm run dev

# 4. 访问
# http://localhost:3000
```

---

## 📞 需要帮助?

如果遇到问题:
1. 检查 Vercel 部署日志
2. 查看浏览器控制台错误
3. 验证环境变量是否正确配置
4. 确认 Upstash Redis 可以正常访问
