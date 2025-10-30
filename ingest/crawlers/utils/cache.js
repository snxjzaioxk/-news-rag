// ingest/crawlers/utils/cache.js

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * 多级缓存管理器
 * L1: 内存缓存 (2分钟)
 * L2: 文件缓存 (30分钟)
 */
export class CacheManager {
  constructor(options = {}) {
    this.memoryCache = new Map();
    this.cacheDir = options.cacheDir || path.join(__dirname, '../../../data/cache');
    this.defaultTTL = options.defaultTTL || 120000; // 2分钟
    this.maxMemorySize = options.maxMemorySize || 100; // 最多缓存100个项目

    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0
    };
  }

  /**
   * 初始化缓存目录
   */
  async init() {
    await fs.mkdir(this.cacheDir, { recursive: true });
  }

  /**
   * 获取缓存
   */
  async get(key, options = {}) {
    // L1: 内存缓存
    const memoryData = this.getFromMemory(key, options.ttl);
    if (memoryData) {
      this.stats.hits++;
      console.log(`  [Cache] 内存命中: ${key}`);
      return memoryData;
    }

    // L2: 文件缓存
    if (options.persistent !== false) {
      const fileData = await this.getFromFile(key, options.ttl || this.defaultTTL * 15);
      if (fileData) {
        this.stats.hits++;
        console.log(`  [Cache] 文件命中: ${key}`);

        // 回写到内存缓存
        this.setToMemory(key, fileData, options.ttl);
        return fileData;
      }
    }

    this.stats.misses++;
    return null;
  }

  /**
   * 设置缓存
   */
  async set(key, data, options = {}) {
    this.stats.sets++;

    // 写入内存缓存
    this.setToMemory(key, data, options.ttl);

    // 写入文件缓存
    if (options.persistent !== false) {
      await this.setToFile(key, data);
    }
  }

  /**
   * 从内存获取
   */
  getFromMemory(key, ttl = this.defaultTTL) {
    const item = this.memoryCache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > ttl) {
      this.memoryCache.delete(key);
      return null;
    }

    return item.data;
  }

  /**
   * 写入内存
   */
  setToMemory(key, data, ttl = this.defaultTTL) {
    // LRU: 如果超过最大容量,删除最老的项
    if (this.memoryCache.size >= this.maxMemorySize) {
      const firstKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(firstKey);
    }

    this.memoryCache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * 从文件获取
   */
  async getFromFile(key, ttl) {
    try {
      const filePath = this.getCacheFilePath(key);
      const content = await fs.readFile(filePath, 'utf-8');
      const item = JSON.parse(content);

      if (Date.now() - item.timestamp > ttl) {
        await fs.unlink(filePath).catch(() => {});
        return null;
      }

      return item.data;
    } catch (error) {
      return null;
    }
  }

  /**
   * 写入文件
   */
  async setToFile(key, data) {
    try {
      const filePath = this.getCacheFilePath(key);
      const content = JSON.stringify({
        data,
        timestamp: Date.now()
      }, null, 2);

      await fs.writeFile(filePath, content);
    } catch (error) {
      console.error(`写入缓存失败: ${key}`, error);
    }
  }

  /**
   * 获取缓存文件路径
   */
  getCacheFilePath(key) {
    const safeKey = key.replace(/[^a-z0-9]/gi, '_');
    return path.join(this.cacheDir, `${safeKey}.json`);
  }

  /**
   * 清除缓存
   */
  async clear(key = null) {
    if (key) {
      // 清除指定缓存
      this.memoryCache.delete(key);
      const filePath = this.getCacheFilePath(key);
      await fs.unlink(filePath).catch(() => {});
    } else {
      // 清除所有缓存
      this.memoryCache.clear();
      try {
        const files = await fs.readdir(this.cacheDir);
        await Promise.all(
          files.map(file => fs.unlink(path.join(this.cacheDir, file)))
        );
      } catch (error) {
        // 忽略错误
      }
    }
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      ...this.stats,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) * 100 || 0,
      memorySize: this.memoryCache.size
    };
  }

  /**
   * 打印统计
   */
  printStats() {
    const stats = this.getStats();
    console.log('\n========== 缓存统计 ==========');
    console.log(`命中: ${stats.hits}`);
    console.log(`未命中: ${stats.misses}`);
    console.log(`设置: ${stats.sets}`);
    console.log(`命中率: ${stats.hitRate.toFixed(2)}%`);
    console.log(`内存项数: ${stats.memorySize}`);
    console.log('==============================\n');
  }
}

// 导出单例
export const cacheManager = new CacheManager();
