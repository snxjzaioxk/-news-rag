// ingest/crawlers/platforms/video/douyin.js
import { BaseCrawler } from '../../base.js';
import fetch from 'node-fetch';
import { cacheManager } from '../../utils/cache.js';

/**
 * 抖音热榜爬虫
 */
export class DouyinCrawler extends BaseCrawler {
  constructor() {
    super({
      name: '抖音热榜',
      platform: 'douyin',
      category: 'video',
      enabled: true,
      cache_ttl: 180000
    });
  }

  async fetch(options = {}) {
    const cacheKey = `douyin:hotlist`;

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
      const res = await fetch('https://www.iesdouyin.com/web/api/v2/hotsearch/billboard/word/', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://www.douyin.com/'
        },
        timeout: this.timeout
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();

      if (!data.word_list) {
        throw new Error('数据格式错误');
      }

      const rawData = data.word_list.slice(0, 50).map(item => ({
        id: item.word,
        title: item.word,
        url: `https://www.douyin.com/search/${encodeURIComponent(item.word)}`,
        description: item.event_time || '',
        hotIndex: item.hot_value || 0
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
export const douyin = new DouyinCrawler();
