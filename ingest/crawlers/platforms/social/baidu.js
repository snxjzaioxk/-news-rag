// ingest/crawlers/platforms/social/baidu.js
import { BaseCrawler } from '../../base.js';
import fetch from 'node-fetch';
import { cacheManager } from '../../utils/cache.js';

/**
 * 百度热搜爬虫
 */
export class BaiduCrawler extends BaseCrawler {
  constructor() {
    super({
      name: '百度热搜',
      platform: 'baidu',
      category: 'social',
      enabled: true,
      cache_ttl: 120000
    });
  }

  async fetch(options = {}) {
    const cacheKey = `baidu:hotlist`;

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
      const res = await fetch('https://top.baidu.com/api/board?platform=wise&tab=realtime', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: this.timeout
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();

      if (!data.data?.cards?.[0]?.content) {
        throw new Error('数据格式错误');
      }

      const rawData = data.data.cards[0].content.slice(0, 50).map(item => ({
        id: item.query,
        title: item.query,
        url: item.url || `https://www.baidu.com/s?wd=${encodeURIComponent(item.query)}`,
        description: item.desc || '',
        hotIndex: item.hotScore || 0
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
export const baidu = new BaiduCrawler();
