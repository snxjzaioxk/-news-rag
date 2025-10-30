/**
 * 统一爬虫管理器 - 整合所有爬虫功能
 * 负责调度不同类型的爬虫，处理错误重试和降级策略
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class CrawlerManager {
  constructor() {
    this.config = null;
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5分钟缓存
  }

  /**
   * 初始化配置
   */
  async init() {
    try {
      const configPath = path.join(__dirname, '../config/sources.json');
      const configData = await fs.readFile(configPath, 'utf-8');
      this.config = JSON.parse(configData);
      console.log('✅ 爬虫管理器初始化成功');
    } catch (error) {
      console.error('❌ 爬虫管理器初始化失败:', error);
      throw error;
    }
  }

  /**
   * 检查缓存
   */
  getCachedData(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  /**
   * 设置缓存
   */
  setCachedData(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * 安全的网络请求 - 带重试机制
   */
  async safeFetch(url, options = {}, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        console.warn(`请求失败 (尝试 ${i + 1}/${retries}): ${url}`, error.message);
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }

  /**
   * 安全的RSS/XML请求
   */
  async safeFetchRSS(url, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(url, {
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.text();
      } catch (error) {
        console.warn(`RSS请求失败 (尝试 ${i + 1}/${retries}): ${url}`, error.message);
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }

  /**
   * 爬取直接API数据
   */
  async crawlDirectAPIs() {
    if (!this.config?.direct_apis) {
      throw new Error('直接API配置未找到');
    }

    const enabledAPIs = this.config.direct_apis.filter(api => api.enabled);
    if (enabledAPIs.length === 0) {
      console.log('⚠️ 没有启用的直接API源');
      return [];
    }

    const results = [];

    for (const api of enabledAPIs) {
      try {
        console.log(`🔄 爬取直接API: ${api.name}`);

        const cacheKey = `direct_${api.platform}`;
        const cached = this.getCachedData(cacheKey);
        if (cached) {
          console.log(`✅ 使用缓存数据: ${api.name}`);
          results.push(cached);
          continue;
        }

        let data;
        if (api.url.includes('.xml') || api.url.includes('/rss')) {
          // RSS/XML格式
          const xmlContent = await this.safeFetchRSS(api.url);
          data = this.parseRSSContent(xmlContent, api);
        } else {
          // JSON格式
          data = await this.safeFetch(api.url, {
            headers: api.headers || {}
          });

          // 根据data_path提取数据
          if (api.data_path && api.data_path !== 'data') {
            const paths = api.data_path.split('.');
            for (const path of paths) {
              data = data[path];
            }
          }
        }

        const processedData = this.processAPIData(data, api);
        this.setCachedData(cacheKey, processedData);
        results.push(processedData);

        console.log(`✅ 成功爬取: ${api.name}, 获得 ${processedData.items?.length || 0} 条数据`);

      } catch (error) {
        console.error(`❌ 爬取失败: ${api.name}`, error.message);
        // 继续处理其他API，不中断整个流程
      }
    }

    return results;
  }

  /**
   * 解析RSS内容
   */
  parseRSSContent(xmlContent, api) {
    const items = [];
    const lines = xmlContent.split('\n');

    let currentItem = {};
    let inItem = false;

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.includes('<item>')) {
        inItem = true;
        currentItem = {};
      } else if (trimmed.includes('</item>')) {
        if (currentItem.title && currentItem.link) {
          items.push({
            title: this.stripHTML(currentItem.title),
            url: currentItem.link,
            summary: currentItem.description ? this.stripHTML(currentItem.description) : null,
            pubDate: currentItem.pubDate || new Date().toISOString(),
            id: this.generateId(currentItem.link)
          });
        }
        inItem = false;
        currentItem = {};
      } else if (inItem) {
        if (trimmed.includes('<title>')) {
          currentItem.title = trimmed.replace(/.*<title>(.*?)<\/title>.*/, '$1');
        } else if (trimmed.includes('<link>')) {
          currentItem.link = trimmed.replace(/.*<link>(.*?)<\/link>.*/, '$1');
        } else if (trimmed.includes('<description>')) {
          currentItem.description = trimmed.replace(/.*<description>(.*?)<\/description>.*/, '$1');
        } else if (trimmed.includes('<pubDate>')) {
          currentItem.pubDate = trimmed.replace(/.*<pubDate>(.*?)<\/pubDate>.*/, '$1');
        }
      }
    }

    return { data: items };
  }

  /**
   * 处理API数据
   */
  processAPIData(data, api) {
    const items = Array.isArray(data) ? data : (data.data || []);

    const processedItems = items.map((item, index) => ({
      id: item.id || this.generateId(item.url || `${api.platform}_${index}`),
      title: item.title || this.extractTitle(item),
      url: item.url || item.link || this.extractUrl(item),
      summary: item.summary || item.description || this.extractSummary(item),
      hotIndex: item.hot_index || item.hotIndex || this.extractHotIndex(item),
      pubDate: item.pub_date || item.pubDate || item.publishedAt || new Date().toISOString(),
      extra: item.extra || {
        thumbnail: item.thumbnail || item.image_url || this.extractThumbnail(item)
      }
    })).filter(item => item.title && item.url);

    return {
      platform: api.platform,
      name: api.name,
      category: api.category,
      items: processedItems,
      count: processedItems.length,
      updatedAt: new Date().toISOString(),
      sourceType: 'direct'
    };
  }

  /**
   * 辅助方法
   */
  stripHTML(str) {
    return str ? str.replace(/<[^>]*>/g, '').trim() : '';
  }

  generateId(url) {
    return Buffer.from(url).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
  }

  extractTitle(item) {
    return item.title || item.name || item.text || '';
  }

  extractUrl(item) {
    return item.url || item.link || item.permalink || '';
  }

  extractSummary(item) {
    return item.description || item.summary || item.excerpt || '';
  }

  extractHotIndex(item) {
    return item.hot || item.heat || item.score || item.hot_index || item.hotIndex || 0;
  }

  extractThumbnail(item) {
    return item.thumbnail || item.image || item.pic || item.cover || '';
  }

  /**
   * 保存结果
   */
  async saveResults(results, filename = 'direct-hotlist-latest.json') {
    try {
      const dataDir = path.join(__dirname, '../data');
      await fs.mkdir(dataDir, { recursive: true });

      const filePath = path.join(dataDir, filename);
      const output = {
        timestamp: new Date().toISOString(),
        platforms: results,
        count: results.length,
        totalItems: results.reduce((sum, r) => sum + (r.items?.length || 0), 0)
      };

      await fs.writeFile(filePath, JSON.stringify(output, null, 2));
      console.log(`💾 数据已保存到: ${filename}`);
      return output;
    } catch (error) {
      console.error('❌ 保存数据失败:', error);
      throw error;
    }
  }

  /**
   * 主要执行方法
   */
  async run() {
    try {
      await this.init();
      console.log('🚀 开始爬取直接API数据...');

      const results = await this.crawlDirectAPIs();

      if (results.length > 0) {
        await this.saveResults(results);
        console.log(`🎉 爬取完成! 共获取 ${results.length} 个平台的数据`);
      } else {
        console.log('⚠️ 没有获取到任何数据');
      }

      return results;
    } catch (error) {
      console.error('❌ 爬虫管理器执行失败:', error);
      throw error;
    }
  }
}

// 如果直接运行此文件
if (import.meta.url === `file://${process.argv[1]}`) {
  const manager = new CrawlerManager();
  manager.run().catch(console.error);
}

export default CrawlerManager;