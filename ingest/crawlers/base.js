// ingest/crawlers/base.js
import { EventEmitter } from 'events';

/**
 * 爬虫基础类
 * 所有平台爬虫都应该继承此类
 */
export class BaseCrawler extends EventEmitter {
  constructor(config) {
    super();
    this.name = config.name;
    this.platform = config.platform;
    this.category = config.category;
    this.enabled = config.enabled !== false;
    this.strategies = config.strategies || [];
    this.cache_ttl = config.cache_ttl || 120000; // 默认2分钟
    this.retry = config.retry || 3;
    this.timeout = config.timeout || 15000;
  }

  /**
   * 核心抓取方法 - 子类必须实现
   */
  async fetch(options = {}) {
    throw new Error('fetch() 方法必须由子类实现');
  }

  /**
   * 数据标准化
   */
  normalize(rawData) {
    return rawData.map((item, index) => ({
      id: item.id || this.generateId(item),
      source: this.name,
      platform: this.platform,
      category: this.category,
      title: item.title || '',
      url: item.url || '',
      pubDate: item.pubDate || new Date().toISOString(),
      description: item.description || '',
      hotIndex: item.hotIndex || index + 1,
      crawledAt: new Date().toISOString(),
      extra: item.extra || {}
    }));
  }

  /**
   * 生成唯一ID
   */
  generateId(item) {
    const str = item.url || item.title || JSON.stringify(item);
    return Buffer.from(str).toString('base64').slice(0, 32);
  }

  /**
   * 带重试的执行
   */
  async executeWithRetry(fn, retries = this.retry) {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === retries - 1) throw error;
        const delay = Math.min(1000 * Math.pow(2, i), 10000);
        console.log(`  重试 ${i + 1}/${retries},等待 ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * 验证数据
   */
  validate(data) {
    if (!Array.isArray(data)) {
      throw new Error('数据必须是数组');
    }
    if (data.length === 0) {
      console.warn(`${this.name}: 未获取到数据`);
    }
    return data;
  }
}
