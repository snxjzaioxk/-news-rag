// ingest/crawlers/platforms/social/zhihu.js
import { BaseCrawler } from '../../base.js';
import RSSParser from 'rss-parser';
import { cacheManager } from '../../utils/cache.js';

const rss = new RSSParser();

/**
 * 知乎热榜爬虫
 * 采用混合策略: 官方API -> RSSHub -> 备用API
 */
export class ZhihuCrawler extends BaseCrawler {
  constructor() {
    super({
      name: '知乎热榜',
      platform: 'zhihu',
      category: 'social',
      enabled: true,
      cache_ttl: 120000, // 2分钟
      retry: 3,
      timeout: 15000
    });

    // 定义多个获取策略
    this.strategies = [
      {
        name: 'third-party-api',
        priority: 1,
        url: 'https://tenapi.cn/v2/zhihuhot',
        type: 'api'
      },
      {
        name: 'rsshub-mirror',
        priority: 2,
        url: 'https://rsshub.rssforever.com/zhihu/hotlist',
        type: 'rss'
      },
      {
        name: 'another-api',
        priority: 3,
        url: 'https://api.oioweb.cn/api/common/zhihuHotSearch',
        type: 'api'
      }
    ];
  }

  /**
   * 主抓取方法
   */
  async fetch(options = {}) {
    const cacheKey = `zhihu:hotlist`;

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

  /**
   * 根据策略类型执行
   */
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

  /**
   * 从官方API获取
   */
  async fetchFromApi(url) {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.zhihu.com/hot'
      },
      timeout: this.timeout
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json();

    // 处理多种API响应格式

    // 格式1: tenapi.cn 格式 { code: 200, data: { list: [...] } }
    if (json.code === 200 && json.data?.list) {
      return json.data.list.map(item => ({
        id: item.target?.id || item.id || String(item.index),
        title: item.target?.title || item.title || item.query,
        url: item.target?.url || item.url || `https://www.zhihu.com/question/${item.target?.id || item.id}`,
        description: item.target?.excerpt || item.excerpt || item.desc || '',
        pubDate: item.target?.created
          ? new Date(item.target.created * 1000).toISOString()
          : new Date().toISOString(),
        hotIndex: item.detail_text || item.hot || 0
      }));
    }

    // 格式2: oioweb.cn 格式 { code: 200, result: [...] }
    if (json.code === 200 && json.result) {
      return json.result.map(item => ({
        id: String(item.index || item.id),
        title: item.title || item.query,
        url: item.url || `https://www.zhihu.com/question/${item.id}`,
        description: item.desc || item.excerpt || '',
        hotIndex: item.hot || 0
      }));
    }

    // 格式3: 官方API格式 { data: [...] }
    if (json.data && Array.isArray(json.data)) {
      return json.data.map(item => ({
        id: item.target?.id || item.id,
        title: item.target?.title || item.title,
        url: item.target?.link?.url || `https://www.zhihu.com/question/${item.target?.id}`,
        description: item.target?.excerpt || '',
        pubDate: item.target?.created
          ? new Date(item.target.created * 1000).toISOString()
          : new Date().toISOString()
      }));
    }

    // 格式4: 简单的success格式
    if ((json.success || json.ok) && json.data) {
      return json.data.map(item => ({
        id: item.index,
        title: item.title,
        url: item.url,
        description: item.desc || ''
      }));
    }

    throw new Error('未知的API响应格式: ' + JSON.stringify(json).substring(0, 100));
  }

  /**
   * 从RSSHub获取
   */
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
export const zhihu = new ZhihuCrawler();
