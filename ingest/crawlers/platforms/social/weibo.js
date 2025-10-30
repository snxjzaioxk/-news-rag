// ingest/crawlers/platforms/social/weibo.js
import { BaseCrawler } from '../../base.js';
import fetch from 'node-fetch';
import RSSParser from 'rss-parser';
import { cacheManager } from '../../utils/cache.js';

const rss = new RSSParser();

/**
 * 微博热搜爬虫
 * 采用混合策略: 官方API -> RSSHub
 */
export class WeiboCrawler extends BaseCrawler {
  constructor() {
    super({
      name: '微博热搜',
      platform: 'weibo',
      category: 'social',
      enabled: true,
      cache_ttl: 120000, // 2分钟
      retry: 3,
      timeout: 15000
    });

    this.strategies = [
      {
        name: 'official-api',
        priority: 1,
        url: 'https://weibo.com/ajax/side/hotSearch',
        type: 'api'
      },
      {
        name: 'rsshub',
        priority: 2,
        url: 'https://rsshub.app/weibo/search/hot',
        type: 'rss'
      }
    ];
  }

  async fetch(options = {}) {
    const cacheKey = `weibo:hotlist`;

    // 尝试从缓存获取
    const cached = await cacheManager.get(cacheKey, {
      ttl: this.cache_ttl,
      persistent: true
    });

    if (cached && !options.skipCache) {
      console.log(`  ✓ 使用缓存数据`);
      return cached;
    }

    console.log(`正在抓取 ${this.name}...`);

    // 按优先级尝试每个策略
    for (const strategy of this.strategies) {
      try {
        console.log(`  尝试策略: ${strategy.name}`);
        const data = await this.fetchByStrategy(strategy);

        if (data && data.length > 0) {
          console.log(`  ✓ 成功 (${strategy.name}): 获取 ${data.length} 条`);
          const normalized = this.normalize(data);

          // 写入缓存
          await cacheManager.set(cacheKey, normalized, {
            ttl: this.cache_ttl,
            persistent: true
          });

          return normalized;
        }
      } catch (error) {
        console.log(`  ✗ 失败 (${strategy.name}): ${error.message}`);
      }
    }

    throw new Error('所有策略都失败');
  }

  async fetchByStrategy(strategy) {
    switch (strategy.type) {
      case 'api':
        return this.fetchFromApi(strategy.url);
      case 'rss':
        return this.fetchFromRSS(strategy.url);
      default:
        throw new Error(`未知策略类型: ${strategy.type}`);
    }
  }

  async fetchFromApi(url) {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://weibo.com'
      },
      timeout: this.timeout
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json();

    if (json.data?.realtime) {
      return json.data.realtime.map(item => ({
        id: item.word_scheme || item.word,
        title: item.word,
        url: `https://s.weibo.com/weibo?q=${encodeURIComponent(item.word_scheme || item.word)}`,
        description: item.note || '',
        hotIndex: item.num || 0
      }));
    }

    throw new Error('未知的API响应格式');
  }

  async fetchFromRSS(url) {
    const feed = await rss.parseURL(url);
    return feed.items.map(item => ({
      id: item.link,
      title: item.title,
      url: item.link,
      description: item.contentSnippet || item.content || '',
      pubDate: item.pubDate || item.isoDate
    }));
  }
}

// 导出实例
export const weibo = new WeiboCrawler();
