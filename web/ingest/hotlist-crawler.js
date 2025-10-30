// ingest/hotlist-crawler.js - 热榜专用爬虫
import RSSParser from 'rss-parser';
import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rss = new RSSParser();

// 加载热榜源配置
async function loadHotlistSources() {
  try {
    const configPath = path.join(__dirname, '../config/sources.json');
    const data = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(data);
    return config.hotlist_sources?.filter(s => s.enabled) || [];
  } catch (error) {
    console.error('加载热榜配置文件失败:', error);
    return [];
  }
}

// 获取 RSSHub 配置
async function getRSSHubConfig() {
  try {
    const configPath = path.join(__dirname, '../config/sources.json');
    const data = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(data);
    return config.rsshub_config || {
      default_instance: 'https://rsshub.app',
      backup_instances: [],
      timeout: 15000
    };
  } catch (error) {
    return {
      default_instance: 'https://rsshub.app',
      backup_instances: [],
      timeout: 15000
    };
  }
}

// 延迟函数
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 带重试的 RSS 获取
async function fetchRSSWithRetry(url, rsshubConfig) {
  const instances = [rsshubConfig.default_instance, ...rsshubConfig.backup_instances];

  for (const instance of instances) {
    try {
      // 替换默认实例为当前实例
      const finalUrl = url.replace('https://rsshub.app', instance);
      console.log(`  尝试获取: ${finalUrl}`);

      const feed = await rss.parseURL(finalUrl);
      console.log(`  ✓ 成功 (使用 ${instance})`);
      return feed;
    } catch (error) {
      console.log(`  ✗ 失败 (${instance}): ${error.message}`);
      if (instance === instances[instances.length - 1]) {
        throw error; // 最后一个实例也失败了
      }
      await delay(1000); // 尝试下一个实例前等待
    }
  }
}

// 爬取单个热榜源
async function crawlHotlistSource(source, rsshubConfig) {
  const items = [];

  try {
    console.log(`正在抓取 ${source.name}...`);

    const feed = await fetchRSSWithRetry(source.url, rsshubConfig);

    const maxItems = parseInt(process.env.MAX_HOTLIST_ITEMS) || 50;
    const hotlistItems = feed.items.slice(0, maxItems);

    for (const item of hotlistItems) {
      const hotItem = {
        id: Buffer.from(item.link || item.title).toString('base64').slice(0, 32),
        source: source.name,
        platform: source.platform,
        category: source.category,
        title: item.title || '',
        url: item.link || '',
        pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
        description: item.contentSnippet || item.content || item.summary || '',
        // 热榜特有字段
        hotIndex: items.length + 1, // 热度排名
        crawledAt: new Date().toISOString()
      };

      items.push(hotItem);
    }

    console.log(`${source.name} 完成,获取 ${items.length} 条热榜`);
  } catch (error) {
    console.error(`${source.name} 抓取失败:`, error.message);
  }

  return items;
}

// 主爬取函数
export async function crawlHotlistOnce() {
  console.log('========== 开始爬取热榜 ==========');
  console.log(`时间: ${new Date().toISOString()}`);

  const sources = await loadHotlistSources();
  const rsshubConfig = await getRSSHubConfig();

  console.log(`已加载 ${sources.length} 个热榜源`);
  console.log(`RSSHub 实例: ${rsshubConfig.default_instance}`);

  const allHotlists = [];

  // 串行抓取每个源(避免并发过高)
  for (const source of sources) {
    const items = await crawlHotlistSource(source, rsshubConfig);
    allHotlists.push({
      platform: source.platform,
      name: source.name,
      category: source.category,
      items: items,
      updatedAt: new Date().toISOString()
    });
    await delay(2000); // 源之间延迟
  }

  // 保存到文件
  const dataDir = path.join(__dirname, '../data');
  await fs.mkdir(dataDir, { recursive: true });

  const timestamp = new Date().toISOString().split('T')[0];
  const outputPath = path.join(dataDir, `hotlist-${timestamp}.json`);
  await fs.writeFile(outputPath, JSON.stringify(allHotlists, null, 2));

  // 同时保存为 hotlist-latest.json
  const latestPath = path.join(dataDir, 'hotlist-latest.json');
  await fs.writeFile(latestPath, JSON.stringify(allHotlists, null, 2));

  // 生成统计信息
  const totalItems = allHotlists.reduce((sum, h) => sum + h.items.length, 0);
  const stats = {
    totalPlatforms: allHotlists.length,
    totalItems: totalItems,
    platforms: allHotlists.map(h => ({
      platform: h.platform,
      name: h.name,
      category: h.category,
      count: h.items.length
    })),
    updatedAt: new Date().toISOString()
  };

  const statsPath = path.join(dataDir, 'hotlist-stats.json');
  await fs.writeFile(statsPath, JSON.stringify(stats, null, 2));

  console.log(`========== 热榜爬取完成 ==========`);
  console.log(`平台数: ${allHotlists.length}`);
  console.log(`总条目: ${totalItems}`);
  console.log(`保存至: ${outputPath}`);

  return { hotlists: allHotlists, stats };
}

// 合并热榜和普通文章
export async function mergeHotlistToArticles() {
  try {
    console.log('========== 合并热榜到文章库 ==========');

    const dataDir = path.join(__dirname, '../data');
    const hotlistPath = path.join(dataDir, 'hotlist-latest.json');
    const articlesPath = path.join(dataDir, 'latest.json');

    // 读取热榜数据
    let hotlists = [];
    try {
      const hotlistData = await fs.readFile(hotlistPath, 'utf-8');
      hotlists = JSON.parse(hotlistData);
    } catch (error) {
      console.log('未找到热榜数据,跳过合并');
      return;
    }

    // 读取文章数据
    let articles = [];
    try {
      const articlesData = await fs.readFile(articlesPath, 'utf-8');
      articles = JSON.parse(articlesData);
    } catch (error) {
      console.log('未找到文章数据,仅保存热榜');
    }

    // 将热榜转换为文章格式
    const hotlistArticles = [];
    for (const hotlist of hotlists) {
      for (const item of hotlist.items) {
        hotlistArticles.push({
          id: item.id,
          source: item.source,
          platform: item.platform,
          category: item.category,
          title: item.title,
          url: item.url,
          pubDate: item.pubDate,
          description: item.description,
          text: item.description, // 热榜通常没有全文
          isHotlist: true, // 标记为热榜项
          hotIndex: item.hotIndex,
          crawledAt: item.crawledAt
        });
      }
    }

    console.log(`热榜文章数: ${hotlistArticles.length}`);
    console.log(`原有文章数: ${articles.length}`);

    // 合并并去重
    const merged = [...hotlistArticles, ...articles];
    const seen = new Set();
    const unique = [];

    for (const article of merged) {
      const key = article.url || article.title;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(article);
      }
    }

    // 按时间排序
    unique.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

    // 保存合并结果
    const mergedPath = path.join(dataDir, 'merged-latest.json');
    await fs.writeFile(mergedPath, JSON.stringify(unique, null, 2));

    console.log(`合并后总数: ${unique.length}`);
    console.log(`保存至: ${mergedPath}`);

    return unique;
  } catch (error) {
    console.error('合并失败:', error);
    throw error;
  }
}

// 直接运行
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  crawlHotlistOnce()
    .then(() => mergeHotlistToArticles())
    .then(() => console.log('热榜爬取任务完成'))
    .catch(console.error);
}
