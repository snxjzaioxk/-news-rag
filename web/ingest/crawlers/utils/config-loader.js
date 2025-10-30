// ingest/crawlers/utils/config-loader.js

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * 配置加载器
 * 负责加载和管理爬虫配置
 */
export class ConfigLoader {
  constructor(configPath = null) {
    this.configPath = configPath || path.join(__dirname, '../../../config/crawler-config.json');
    this.config = null;
  }

  /**
   * 加载配置
   */
  async load() {
    try {
      const content = await fs.readFile(this.configPath, 'utf-8');
      this.config = JSON.parse(content);
      console.log(`✓ 配置加载成功: ${this.config.version}`);
      return this.config;
    } catch (error) {
      console.error('配置加载失败:', error);
      throw error;
    }
  }

  /**
   * 获取全局配置
   */
  getGlobal() {
    return this.config?.global || {};
  }

  /**
   * 获取分类配置
   */
  getCategories() {
    return this.config?.categories || {};
  }

  /**
   * 获取单个分类
   */
  getCategory(name) {
    return this.config?.categories?.[name] || null;
  }

  /**
   * 获取平台配置
   */
  getPlatforms() {
    return this.config?.platforms || {};
  }

  /**
   * 获取单个平台
   */
  getPlatform(name) {
    return this.config?.platforms?.[name] || null;
  }

  /**
   * 获取启用的平台
   */
  getEnabledPlatforms() {
    const platforms = this.getPlatforms();
    return Object.entries(platforms)
      .filter(([_, config]) => config.enabled)
      .map(([name, _]) => name);
  }

  /**
   * 按分类获取平台
   */
  getPlatformsByCategory(category) {
    const platforms = this.getPlatforms();
    return Object.entries(platforms)
      .filter(([_, config]) => config.category === category && config.enabled)
      .map(([name, _]) => name);
  }

  /**
   * 获取RSSHub配置
   */
  getRSSHubConfig() {
    return this.config?.rsshub || {};
  }

  /**
   * 获取调度配置
   */
  getSchedule() {
    return this.config?.schedule || {};
  }

  /**
   * 验证配置
   */
  validate() {
    const errors = [];

    if (!this.config) {
      errors.push('配置未加载');
      return errors;
    }

    // 验证平台配置
    const platforms = this.getPlatforms();
    for (const [name, config] of Object.entries(platforms)) {
      if (!config.name) errors.push(`平台 ${name} 缺少 name`);
      if (!config.category) errors.push(`平台 ${name} 缺少 category`);
      if (!config.strategies || config.strategies.length === 0) {
        errors.push(`平台 ${name} 缺少 strategies`);
      }
    }

    return errors;
  }
}

// 导出单例
export const configLoader = new ConfigLoader();
