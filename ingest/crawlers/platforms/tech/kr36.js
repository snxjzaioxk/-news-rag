// ingest/crawlers/platforms/tech/kr36.js
import { BaseCrawler } from '../../base.js';
import fetch from 'node-fetch';
import { cacheManager } from '../../utils/cache.js';

/**
 * 36氪热榜爬虫
 */
export class KrCrawler extends BaseCrawler {
  constructor() {
    super({
      name: '36氪热榜',
      platform: 'kr36',
      category: 'tech',
      enabled: true,
      cache_ttl: 300000
    });
  }

  async fetch(options = {}) {
    const cacheKey = `kr36:hotlist`;

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
      const res = await fetch('https://36kr.com/api/search-column/mainsite/hot-list', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://36kr.com/'
        },
        timeout: this.timeout
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();

      if (!data.data || !data.data.hotListData) {
        throw new Error('数据格式错误');
      }

      const rawData = data.data.hotListData.slice(0, 30).map(item => ({
        id: String(item.itemId),
        title: item.templateMaterial.widgetTitle,
        url: `https://36kr.com/p/${item.itemId}`,
        description: item.templateMaterial.widgetSummary || ''
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
export const kr36 = new KrCrawler();
