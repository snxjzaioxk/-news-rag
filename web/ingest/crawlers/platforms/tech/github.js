// ingest/crawlers/platforms/tech/github.js
import { BaseCrawler } from '../../base.js';
import { cacheManager } from '../../utils/cache.js';

/**
 * GitHub Trending 爬虫
 */
export class GithubCrawler extends BaseCrawler {
  constructor() {
    super({
      name: 'GitHub Trending',
      platform: 'github',
      category: 'tech',
      enabled: true,
      cache_ttl: 300000 // 5分钟
    });
  }

  async fetch(options = {}) {
    const cacheKey = `github:trending`;

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
      const res = await fetch('https://api.github.com/search/repositories?q=created:>2024-01-01&sort=stars&order=desc&per_page=25', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/vnd.github.v3+json'
        },
        timeout: this.timeout
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();

      if (!data.items) throw new Error('数据格式错误');

      const rawData = data.items.map(item => ({
        id: item.html_url,
        title: `${item.full_name}`,
        url: item.html_url,
        description: item.description || '',
        pubDate: item.created_at,
        extra: {
          stars: item.stargazers_count,
          language: item.language,
          forks: item.forks_count
        }
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
export const github = new GithubCrawler();
