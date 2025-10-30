// ingest/orchestrator.js
import { crawlerManager } from './crawlers/manager.js';
import { cacheManager } from './crawlers/utils/cache.js';
import { configLoader } from './crawlers/utils/config-loader.js';
import { EventEmitter } from 'events';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * 爬虫调度器
 * 负责初始化、注册和调度所有爬虫
 */
export class CrawlerOrchestrator extends EventEmitter {
  constructor() {
    super();
    this.isRunning = false;
    this.startTime = null;
    this.stats = {
      totalRuns: 0,
      successfulRuns: 0,
      failedRuns: 0
    };
  }

  /**
   * 初始化
   */
  async init() {
    console.log('\n========== 初始化爬虫调度器 ==========\n');

    // 1. 加载配置
    await configLoader.load();
    const errors = configLoader.validate();
    if (errors.length > 0) {
      console.error('配置验证失败:');
      errors.forEach(err => console.error(`  - ${err}`));
      throw new Error('配置无效');
    }

    // 2. 初始化缓存
    await cacheManager.init();

    // 3. 注册所有爬虫
    await this.registerCrawlers();

    console.log('✓ 调度器初始化完成\n');
  }

  /**
   * 注册爬虫
   */
  async registerCrawlers() {
    const platforms = configLoader.getEnabledPlatforms();

    console.log(`正在注册 ${platforms.length} 个启用的平台...\n`);

    let successCount = 0;
    let failedCount = 0;

    for (const platform of platforms) {
      try {
        const config = configLoader.getPlatform(platform);
        const category = config.category;

        // 动态导入爬虫模块
        const modulePath = `./crawlers/platforms/${category}/${platform}.js`;
        const module = await import(modulePath);

        if (module[platform]) {
          crawlerManager.register(platform, module[platform]);
          successCount++;
        } else {
          console.warn(`  ⚠ 平台 ${platform} 模块未导出实例`);
          failedCount++;
        }
      } catch (error) {
        console.warn(`  ⚠ 跳过未实现的平台: ${platform}`);
        failedCount++;
      }
    }

    console.log(`\n✓ 成功注册 ${successCount} 个爬虫`);
    if (failedCount > 0) {
      console.log(`⚠ ${failedCount} 个平台尚未实现,已跳过`);
    }
    console.log();
  }

  /**
   * 执行热榜爬取
   */
  async runHotlistCrawl() {
    console.log('\n========== 执行热榜爬取 ==========\n');
    this.startTime = Date.now();
    this.isRunning = true;

    try {
      // 获取热榜相关分类
      const hotlistCategories = ['social', 'tech', 'news', 'video'];
      const platforms = hotlistCategories.flatMap(cat =>
        configLoader.getPlatformsByCategory(cat)
      );

      const results = await crawlerManager.crawlAll(platforms, {
        delay: 2000 // 平台间延迟2秒
      });

      // 处理结果
      const allData = [];
      for (const [platform, result] of results) {
        if (result.success) {
          allData.push(...result.data);
        }
      }

      // 保存数据
      await this.saveHotlistData(allData);

      this.stats.successfulRuns++;
      this.emit('crawl:complete', { type: 'hotlist', count: allData.length });

      return allData;
    } catch (error) {
      this.stats.failedRuns++;
      this.emit('crawl:error', { type: 'hotlist', error });
      throw error;
    } finally {
      this.isRunning = false;
      this.stats.totalRuns++;
      console.log(`\n总耗时: ${((Date.now() - this.startTime) / 1000).toFixed(2)}秒\n`);
    }
  }

  /**
   * 执行完整爬取
   */
  async runFullCrawl() {
    console.log('\n========== 执行完整爬取 ==========\n');
    this.startTime = Date.now();
    this.isRunning = true;

    try {
      // 爬取所有启用的平台
      const results = await crawlerManager.crawlAll(null, {
        delay: 2000
      });

      // 处理和保存数据
      const allData = [];
      for (const [platform, result] of results) {
        if (result.success) {
          allData.push(...result.data);
        }
      }

      await this.saveFullData(allData);

      this.stats.successfulRuns++;
      this.emit('crawl:complete', { type: 'full', count: allData.length });

      return allData;
    } catch (error) {
      this.stats.failedRuns++;
      this.emit('crawl:error', { type: 'full', error });
      throw error;
    } finally {
      this.isRunning = false;
      this.stats.totalRuns++;
      console.log(`\n总耗时: ${((Date.now() - this.startTime) / 1000).toFixed(2)}秒\n`);
    }
  }

  /**
   * 按分类爬取
   */
  async runCategoryCrawl(category) {
    console.log(`\n========== 执行 ${category} 分类爬取 ==========\n`);

    const results = await crawlerManager.crawlByCategory(category, {
      delay: 2000
    });

    return results;
  }

  /**
   * 保存热榜数据
   */
  async saveHotlistData(data) {
    const dataDir = path.join(__dirname, '../data');
    await fs.mkdir(dataDir, { recursive: true });

    const timestamp = new Date().toISOString().split('T')[0];
    const outputPath = path.join(dataDir, `hotlist-${timestamp}.json`);
    const latestPath = path.join(dataDir, 'hotlist-latest.json');

    await fs.writeFile(outputPath, JSON.stringify(data, null, 2));
    await fs.writeFile(latestPath, JSON.stringify(data, null, 2));

    console.log(`✓ 数据已保存: ${outputPath}`);
  }

  /**
   * 保存完整数据
   */
  async saveFullData(data) {
    const dataDir = path.join(__dirname, '../data');
    await fs.mkdir(dataDir, { recursive: true });

    const timestamp = new Date().toISOString().split('T')[0];
    const outputPath = path.join(dataDir, `full-${timestamp}.json`);
    const latestPath = path.join(dataDir, 'latest.json');

    await fs.writeFile(outputPath, JSON.stringify(data, null, 2));
    await fs.writeFile(latestPath, JSON.stringify(data, null, 2));

    console.log(`✓ 数据已保存: ${outputPath}`);
  }

  /**
   * 获取状态
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      stats: this.stats,
      registeredCrawlers: crawlerManager.crawlers.size,
      cacheStats: cacheManager.getStats()
    };
  }

  /**
   * 打印状态
   */
  printStatus() {
    const status = this.getStatus();

    console.log('\n========== 调度器状态 ==========');
    console.log(`运行状态: ${status.isRunning ? '运行中' : '空闲'}`);
    console.log(`总运行次数: ${status.stats.totalRuns}`);
    console.log(`成功次数: ${status.stats.successfulRuns}`);
    console.log(`失败次数: ${status.stats.failedRuns}`);
    console.log(`注册爬虫数: ${status.registeredCrawlers}`);
    console.log('\n缓存统计:');
    console.log(`  命中: ${status.cacheStats.hits}`);
    console.log(`  未命中: ${status.cacheStats.misses}`);
    console.log(`  命中率: ${status.cacheStats.hitRate.toFixed(2)}%`);
    console.log('==============================\n');
  }
}

// 导出单例
export const orchestrator = new CrawlerOrchestrator();

// CLI入口
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const command = process.argv[2] || 'hotlist';

  orchestrator.init()
    .then(async () => {
      switch (command) {
        case 'hotlist':
          await orchestrator.runHotlistCrawl();
          break;
        case 'full':
          await orchestrator.runFullCrawl();
          break;
        case 'category':
          const category = process.argv[3];
          if (!category) {
            console.error('请指定分类,如: node orchestrator.js category tech');
            process.exit(1);
          }
          await orchestrator.runCategoryCrawl(category);
          break;
        case 'status':
          orchestrator.printStatus();
          break;
        default:
          console.error(`未知命令: ${command}`);
          console.log('可用命令: hotlist | full | category <name> | status');
          process.exit(1);
      }
    })
    .then(() => {
      orchestrator.printStatus();
      cacheManager.printStats();
      process.exit(0);
    })
    .catch(error => {
      console.error('执行失败:', error);
      process.exit(1);
    });
}
