// lib/database.js - 统一数据库操作
import { Redis } from '@upstash/redis';

// Upstash Redis配置
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

// 数据库操作类
class Database {
  constructor() {
    this.useRedis = redis.url && redis.token;
  }

  // 获取文章列表
  async getArticles(category = null, limit = 20, offset = 0) {
    try {
      if (this.useRedis) {
        const cacheKey = `articles:${category || 'all'}:${limit}:${offset}`;
        const cached = await redis.get(cacheKey);
        if (cached) return cached;
      }

      // 回退到本地JSON文件（开发环境）
      const fs = await import('fs/promises');
      const path = await import('path');
      const { fileURLToPath } = await import('url');

      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const dataPath = path.join(__dirname, '../data/processed-articles.json');

      const data = await fs.readFile(dataPath, 'utf-8');
      let articles = JSON.parse(data);

      // 按分类过滤
      if (category && category !== 'all') {
        articles = articles.filter(a => a.category === category);
      }

      // 分页
      const start = parseInt(offset);
      const end = start + parseInt(limit);
      const paginatedArticles = articles.slice(start, end);

      const result = {
        total: articles.length,
        offset: start,
        limit: parseInt(limit),
        articles: paginatedArticles.map(a => ({
          id: a.id,
          title: a.title,
          source: a.source,
          category: a.category,
          url: a.url,
          pubDate: a.pubDate,
          summary: a.summary,
          keywords: a.keywords
        }))
      };

      // 缓存结果（10分钟）
      if (this.useRedis) {
        const cacheKey = `articles:${category || 'all'}:${limit}:${offset}`;
        await redis.setex(cacheKey, 600, JSON.stringify(result));
      }

      return result;
    } catch (error) {
      console.error('获取文章失败:', error);
      return { total: 0, articles: [] };
    }
  }

  // 获取热榜数据
  async getHotlist(platform = null, limit = 10) {
    try {
      if (this.useRedis) {
        const cacheKey = `hotlist:${platform || 'all'}:${limit}`;
        const cached = await redis.get(cacheKey);
        if (cached) return cached;
      }

      const fs = await import('fs/promises');
      const path = await import('path');
      const { fileURLToPath } = await import('url');

      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const dataPath = path.join(__dirname, '../data/hotlist-latest.json');

      const data = await fs.readFile(dataPath, 'utf-8');
      let hotlists = JSON.parse(data);

      // 按平台过滤
      if (platform && platform !== 'all') {
        hotlists = hotlists.filter(h => h.platform === platform);
      }

      const result = {
        count: hotlists.length,
        platforms: hotlists.map(hotlist => ({
          platform: hotlist.platform,
          name: hotlist.name,
          category: hotlist.category,
          items: hotlist.items.slice(0, parseInt(limit)).map(item => ({
            id: item.id,
            title: item.title,
            url: item.url,
            hotIndex: item.hotIndex,
            description: item.description,
            pubDate: item.pubDate
          })),
          count: hotlist.items.length,
          updatedAt: hotlist.updatedAt
        })),
        updatedAt: new Date().toISOString()
      };

      // 缓存结果（5分钟）
      if (this.useRedis) {
        const cacheKey = `hotlist:${platform || 'all'}:${limit}`;
        await redis.setex(cacheKey, 300, JSON.stringify(result));
      }

      return result;
    } catch (error) {
      console.error('获取热榜失败:', error);
      return { count: 0, platforms: [] };
    }
  }

  // 获取统计信息
  async getStats() {
    try {
      if (this.useRedis) {
        const cached = await redis.get('stats');
        if (cached) return JSON.parse(cached);
      }

      const fs = await import('fs/promises');
      const path = await import('path');
      const { fileURLToPath } = await import('url');

      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const reportPath = path.join(__dirname, '../data/report.json');

      const data = await fs.readFile(reportPath, 'utf-8');
      const report = JSON.parse(data);

      // 缓存统计信息（1小时）
      if (this.useRedis) {
        await redis.setex('stats', 3600, JSON.stringify(report));
      }

      return report;
    } catch (error) {
      console.error('获取统计失败:', error);
      return { categories: {}, totalArticles: 0 };
    }
  }

  // 缓存AI查询结果
  async cacheQuery(query, result, ttl = 1800) { // 30分钟
    if (!this.useRedis) return;

    const key = `query:${Buffer.from(query).toString('base64')}`;
    await redis.setex(key, ttl, JSON.stringify(result));
  }

  // 获取缓存的查询结果
  async getCachedQuery(query) {
    if (!this.useRedis) return null;

    const key = `query:${Buffer.from(query).toString('base64')}`;
    const cached = await redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }
}

export default new Database();