// ingest/crawlers/platforms/video/bilibili.js
import { BaseCrawler } from '../../base.js';
import { cacheManager } from '../../utils/cache.js';

/**
 * B站热门爬虫
 */
export class BilibiliCrawler extends BaseCrawler {
  constructor() {
    super({
      name: 'B站热门',
      platform: 'bilibili',
      category: 'video',
      enabled: true,
      cache_ttl: 180000
    });
  }

  async fetch(options = {}) {
    const cacheKey = `bilibili:popular`;

    // 尝试缓存
    const cached = await cacheManager.get(cacheKey, {
      ttl: this.cache_ttl,
      persistent: true
    });
    if (cached && !options.skipCache) {
      console.log(`  ✓ 使用缓存数据`);
      return cached;
    }

    console.log(`正在抓取 ${this.name}...`);

    try {
      const res = await fetch('https://api.bilibili.com/x/web-interface/popular?ps=50&pn=1', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://www.bilibili.com'
        },
        timeout: this.timeout
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();

      if (data.code !== 0 || !data.data?.list) {
        throw new Error('数据格式错误');
      }

      const rawData = data.data.list.map(item => ({
        id: String(item.aid),
        title: item.title,
        url: `https://www.bilibili.com/video/${item.bvid}`,
        description: item.desc || '',
        pubDate: new Date(item.pubdate * 1000).toISOString()
      }));

      const normalized = this.normalize(rawData);

      // 写入缓存
      await cacheManager.set(cacheKey, normalized, {
        ttl: this.cache_ttl,
        persistent: true
      });

      console.log(`  ✓ 成功获取 ${normalized.length} 条数据`);
      return normalized;

    } catch (error) {
      console.error(`  ✗ 抓取失败: ${error.message}`);
      throw error;
    }
  }
}

// 导出实例
export const bilibili = new BilibiliCrawler();
