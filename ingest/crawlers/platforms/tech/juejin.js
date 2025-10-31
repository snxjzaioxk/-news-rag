// ingest/crawlers/platforms/tech/juejin.js
import { BaseCrawler } from '../../base.js';
import RSSParser from 'rss-parser';
import { cacheManager } from '../../utils/cache.js';

const rss = new RSSParser();

/**
 * 掘金热榜爬虫
 * 使用RSSHub获取周热榜
 */
export class JuejinCrawler extends BaseCrawler {
  constructor() {
    super({
      name: '掘金热榜',
      platform: 'juejin',
      category: 'tech',
      enabled: true,
      cache_ttl: 180000 // 3分钟
    });
  }

  async fetch(options = {}) {
    const cacheKey = `juejin:trending`;

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
      const feed = await rss.parseURL('https://rsshub.rssforever.com/juejin/trending/all/weekly');

      const rawData = feed.items.slice(0, 50).map(item => ({
        id: item.link,
        title: item.title,
        url: item.link,
        description: item.contentSnippet || item.content || '',
        pubDate: item.pubDate || item.isoDate
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
export const juejin = new JuejinCrawler();
