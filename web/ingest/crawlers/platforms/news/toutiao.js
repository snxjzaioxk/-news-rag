// ingest/crawlers/platforms/news/toutiao.js
import { BaseCrawler } from '../../base.js';
import { cacheManager } from '../../utils/cache.js';

/**
 * 今日头条热榜爬虫
 */
export class ToutiaoCrawler extends BaseCrawler {
  constructor() {
    super({
      name: '今日头条',
      platform: 'toutiao',
      category: 'news',
      enabled: true,
      cache_ttl: 180000
    });
  }

  async fetch(options = {}) {
    const cacheKey = `toutiao:hotlist`;

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
      const res = await fetch('https://www.toutiao.com/hot-event/hot-board/?origin=toutiao_pc', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: this.timeout
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();

      if (!data.data) {
        throw new Error('数据格式错误');
      }

      const rawData = data.data.slice(0, 50).map(item => ({
        id: item.ClusterId,
        title: item.Title,
        url: item.Url || `https://www.toutiao.com/search/?keyword=${encodeURIComponent(item.Title)}`,
        description: item.Abstract || '',
        hotIndex: item.HotValue || 0
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
export const toutiao = new ToutiaoCrawler();
