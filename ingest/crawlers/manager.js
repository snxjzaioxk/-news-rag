// ingest/crawlers/manager.js
import { EventEmitter } from 'events';

/**
 * 爬虫管理器
 * 负责注册、管理和调度所有平台爬虫
 */
export class CrawlerManager extends EventEmitter {
  constructor() {
    super();
    this.crawlers = new Map();
    this.stats = {
      total: 0,
      success: 0,
      failed: 0,
      skipped: 0
    };
  }

  /**
   * 注册爬虫
   * @param {string} platform - 平台名称
   * @param {Object} crawler - 爬虫实例
   */
  register(platform, crawler) {
    if (this.crawlers.has(platform)) {
      console.warn(`平台 ${platform} 已注册,将被覆盖`);
    }
    this.crawlers.set(platform, crawler);
    console.log(`✓ 注册平台: ${platform}`);
  }

  /**
   * 批量注册爬虫
   */
  registerAll(crawlers) {
    Object.entries(crawlers).forEach(([platform, crawler]) => {
      this.register(platform, crawler);
    });
  }

  /**
   * 获取爬虫
   */
  get(platform) {
    const crawler = this.crawlers.get(platform);
    if (!crawler) {
      throw new Error(`平台 ${platform} 未注册`);
    }
    return crawler;
  }

  /**
   * 执行单个爬虫
   */
  async crawl(platform, options = {}) {
    const crawler = this.get(platform);

    this.emit('crawl:start', { platform });
    this.stats.total++;

    try {
      const data = await crawler.fetch(options);
      this.stats.success++;
      this.emit('crawl:success', { platform, count: data.length });
      return data;
    } catch (error) {
      this.stats.failed++;
      this.emit('crawl:error', { platform, error: error.message });
      throw error;
    }
  }

  /**
   * 批量执行爬虫
   */
  async crawlAll(platforms = null, options = {}) {
    const targetPlatforms = platforms || Array.from(this.crawlers.keys());
    const results = new Map();

    console.log(`\n========== 开始爬取 ${targetPlatforms.length} 个平台 ==========\n`);

    for (const platform of targetPlatforms) {
      try {
        const data = await this.crawl(platform, options);
        results.set(platform, { success: true, data });

        // 平台间延迟
        if (options.delay) {
          await new Promise(resolve => setTimeout(resolve, options.delay));
        }
      } catch (error) {
        results.set(platform, { success: false, error: error.message });
      }
    }

    this.printStats();
    return results;
  }

  /**
   * 按分类爬取
   */
  async crawlByCategory(category, options = {}) {
    const platforms = Array.from(this.crawlers.entries())
      .filter(([_, crawler]) => crawler.category === category)
      .map(([platform, _]) => platform);

    return this.crawlAll(platforms, options);
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      ...this.stats,
      successRate: this.stats.total > 0
        ? (this.stats.success / this.stats.total * 100).toFixed(2) + '%'
        : '0%',
      platforms: this.crawlers.size
    };
  }

  /**
   * 打印统计信息
   */
  printStats() {
    const stats = this.getStats();
    console.log('\n========== 爬取统计 ==========');
    console.log(`总计: ${stats.total}`);
    console.log(`成功: ${stats.success}`);
    console.log(`失败: ${stats.failed}`);
    console.log(`跳过: ${stats.skipped}`);
    console.log(`成功率: ${stats.successRate}`);
    console.log(`注册平台数: ${stats.platforms}`);
    console.log('==============================\n');
  }

  /**
   * 重置统计
   */
  resetStats() {
    this.stats = { total: 0, success: 0, failed: 0, skipped: 0 };
  }
}

// 导出单例
export const crawlerManager = new CrawlerManager();
