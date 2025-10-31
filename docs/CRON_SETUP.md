# GitHub Actions + Vercel + Redis 定时爬取方案

## 🎯 架构说明

这是一个**完全免费**的高频 Cron 解决方案，绕过 Vercel 免费账户的 Cron Jobs 限制。

```
GitHub Actions (定时触发)
    ↓
调用 Vercel Function (/api/crawl-hotlist)
    ↓
执行爬取 → 处理数据 → 写入 Upstash Redis
    ├─ hotlist:latest (TTL 1h)
    └─ hotlist:YYYY-MM-DD (历史数据)

用户/前端 → /api/hotlist-latest ← 从 Redis 读取缓存
```

## ✅ 方案优势

1. **完全免费**
   - GitHub Actions: 公共仓库无限免费
   - Vercel: Hobby 账户免费
   - Upstash Redis: 免费层 10K 命令/天

2. **高频调度**
   - 可精确到分钟级别
   - 不受 Vercel 免费账户"每天一次"限制
   - 当前配置: **每 30 分钟**执行一次

3. **架构清晰**
   - Actions: 调度器
   - Vercel: 业务逻辑
   - Redis: 缓存 + 持久化

## 📦 配置清单

### 1. Upstash Redis 环境变量

在 **Vercel 项目设置** → **Environment Variables** 中添加:

```env
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXX...
CRAWL_TOKEN=your-secret-token-here  # 自定义密钥
```

> 💡 在 [Upstash](https://upstash.com/) 创建 Redis 数据库获取上述配置

### 2. GitHub Secrets 配置

在 **GitHub 仓库** → **Settings** → **Secrets and variables** → **Actions** 中添加:

```
VERCEL_ENDPOINT=https://your-domain.vercel.app/api/crawl-hotlist
CRAWL_TOKEN=your-secret-token-here  # 与 Vercel 中的保持一致
```

## 🚀 部署步骤

### Step 1: 创建 Upstash Redis

1. 访问 https://upstash.com/
2. 注册并登录
3. 创建数据库 (选择免费层)
4. 复制 REST API 配置:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

### Step 2: 配置 Vercel 环境变量

1. 进入 Vercel 项目设置
2. Environment Variables 添加:
   ```
   UPSTASH_REDIS_REST_URL
   UPSTASH_REDIS_REST_TOKEN
   CRAWL_TOKEN (自己生成一个随机字符串)
   ```
3. **Redeploy** 项目

### Step 3: 配置 GitHub Secrets

1. 进入 GitHub 仓库设置
2. Secrets and variables → Actions
3. 添加:
   ```
   VERCEL_ENDPOINT: https://your-app.vercel.app/api/crawl-hotlist
   CRAWL_TOKEN: (与 Vercel 中相同)
   ```

### Step 4: 推送代码并验证

```bash
# 提交代码
git add .
git commit -m "feat: 配置 GitHub Actions + Vercel + Redis 定时爬取"
git push

# 等待部署完成后...

# 手动触发测试
# 方法1: GitHub Actions → crawl-vercel.yml → Run workflow

# 方法2: 本地 curl 测试
curl -X GET \
  -H "Authorization: Bearer your-crawl-token" \
  https://your-app.vercel.app/api/crawl-hotlist
```

## 📋 API 端点说明

### 写入端点: `/api/crawl-hotlist`

**用途**: 执行爬取并写入 Redis

**鉴权**: Bearer Token (`CRAWL_TOKEN`)

**触发方式**:
- GitHub Actions 自动调用 (每 30 分钟)
- 手动触发 (通过 Actions 或 curl)

**返回示例**:
```json
{
  "ok": true,
  "platforms": 3,
  "totalItems": 150,
  "duration": "8234ms",
  "updatedAt": "2025-01-30T10:30:00.000Z"
}
```

### 读取端点: `/api/hotlist-latest`

**用途**: 获取最新热榜数据

**鉴权**: 无需 (公开访问)

**查询参数**:
- `date`: 指定日期 (格式: YYYY-MM-DD)
- `platform`: 过滤平台 (zhihu, weibo, baidu 等)

**示例**:
```bash
# 获取最新数据
curl https://your-app.vercel.app/api/hotlist-latest

# 获取指定日期
curl https://your-app.vercel.app/api/hotlist-latest?date=2025-01-30

# 过滤知乎热榜
curl https://your-app.vercel.app/api/hotlist-latest?platform=zhihu
```

**返回示例**:
```json
{
  "ok": true,
  "hotlists": [
    {
      "platform": "zhihu",
      "name": "知乎热榜",
      "category": "hotlist",
      "items": [...]
    }
  ],
  "stats": {
    "totalPlatforms": 3,
    "totalItems": 150
  }
}
```

## ⚙️ 调整执行频率

编辑 `.github/workflows/crawl-vercel.yml`:

```yaml
on:
  schedule:
    # 每 30 分钟 (当前配置)
    - cron: "*/30 * * * *"

    # 其他示例:
    # - cron: "0 * * * *"      # 每小时
    # - cron: "0 */2 * * *"    # 每 2 小时
    # - cron: "0 8,12,18 * * *" # 每天 8:00, 12:00, 18:00 (UTC)
```

> ⚠️ 注意: cron 表达式使用 **UTC 时间**，北京时间需要 -8 小时

## 🔒 安全说明

### 分布式锁

使用 Redis 实现分布式锁，防止并发执行:

```javascript
const locked = await redis.set('lock:crawl-hotlist', '1', { nx: true, ex: 120 });
```

- 锁定时间: 120 秒
- 如果任务正在运行，返回 202 状态码

### 身份验证

只有携带正确 `CRAWL_TOKEN` 的请求才能触发爬取:

```bash
curl -H "Authorization: Bearer your-token" https://...
```

## 📊 监控与日志

### 查看 GitHub Actions 日志

1. 进入仓库 → Actions 标签
2. 选择 "热榜爬取 (Vercel + Redis)"
3. 查看每次执行的详细日志

### 查看 Vercel 函数日志

1. Vercel Dashboard → 你的项目
2. Logs → Filter by `/api/crawl-hotlist`
3. 查看执行时间、错误等

### 查看 Redis 数据

使用 Upstash 控制台:

1. 进入你的 Redis 数据库
2. Data Browser → 查看所有 keys
3. 常用 keys:
   - `hotlist:latest` - 最新数据
   - `hotlist:2025-01-30` - 历史数据
   - `lock:crawl-hotlist` - 分布式锁

## 🐛 故障排查

### 1. Actions 执行失败

**检查项**:
- [ ] `VERCEL_ENDPOINT` 是否正确
- [ ] `CRAWL_TOKEN` 是否配置
- [ ] Vercel 函数是否部署成功

**调试命令**:
```bash
# 测试端点可访问性
curl -I https://your-app.vercel.app/api/crawl-hotlist

# 测试身份验证
curl -H "Authorization: Bearer wrong-token" \
  https://your-app.vercel.app/api/crawl-hotlist
# 应返回 401
```

### 2. Redis 连接失败

**检查项**:
- [ ] `UPSTASH_REDIS_REST_URL` 格式正确
- [ ] `UPSTASH_REDIS_REST_TOKEN` 有效
- [ ] Vercel 已重新部署

**测试**:
在 Vercel 函数日志中查找 Redis 相关错误

### 3. 读取接口返回 404

**可能原因**:
- Redis 中没有数据 (首次运行或 TTL 过期)
- 爬取任务尚未成功执行

**解决方法**:
1. 手动触发 Actions: Run workflow
2. 等待执行完成 (约 1-2 分钟)
3. 重新访问 `/api/hotlist-latest`

## 💡 进阶配置

### 调整 TTL (缓存时间)

编辑 `api/crawl-hotlist.js`:

```javascript
// 缓存最新数据 (1 小时 → 改为 30 分钟)
await redis.set('hotlist:latest', result, { ex: 1800 });
```

### 添加更多历史快照

```javascript
// 按小时归档
const hour = new Date().toISOString().slice(0, 13); // 2025-01-30T10
await redis.set(`hotlist:${hour}`, result, { ex: 86400 }); // 保留 24 小时
```

### 并发控制

如果需要更长的锁定时间:

```javascript
// 锁定 300 秒 (5 分钟)
const locked = await redis.set('lock:crawl-hotlist', '1', { nx: true, ex: 300 });
```

## 📈 成本估算

### 免费层配额

| 服务 | 免费额度 | 预估使用量 |
|------|---------|-----------|
| GitHub Actions | 2000 分钟/月 | ~30 分钟/月 |
| Vercel Functions | 100GB-Hrs/月 | ~5GB-Hrs/月 |
| Upstash Redis | 10K 命令/天 | ~2K 命令/天 |

**结论**: 完全在免费额度内 ✅

## 🎉 总结

使用 GitHub Actions + Vercel + Redis 方案，你可以:

1. ✅ 绕过 Vercel 免费账户 Cron 限制
2. ✅ 实现高频定时任务 (最高每分钟)
3. ✅ 完全免费运行
4. ✅ 架构清晰，易于维护

**推荐配置**: 每 30 分钟执行一次，缓存 1 小时

## 📚 相关文档

- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [Vercel 函数文档](https://vercel.com/docs/functions)
- [Upstash Redis 文档](https://docs.upstash.com/redis)
