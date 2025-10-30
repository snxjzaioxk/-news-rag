// ingest/hybrid-hotlist-crawler.js - 混合热榜爬虫(直接爬取 + RSSHub 备用)
import { directCrawlers } from './direct-crawlers.js';
import { crawlHotlistOnce, mergeHotlistToArticles } from './hotlist-crawler.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 延迟函数
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 混合爬取热榜
 * 策略:
 * 1. 优先使用直接爬取(速度快,稳定)
 * 2. 直接爬取失败时,回退到 RSSHub
 */
export async function crawlHotlistHybrid() {
  console.log('========== 开始混合爬取热榜 ==========');
  console.log(`时间: ${new Date().toISOString()}`);

  const allHotlists = [];

  // 1. 直接爬取的平台
  const directPlatforms = [
    { name: '知乎热榜', crawler: directCrawlers.zhihu, platform: 'zhihu', category: 'social' },
    { name: '微博热搜', crawler: directCrawlers.weibo, platform: 'weibo', category: 'social' },
    { name: '百度热搜', crawler: directCrawlers.baidu, platform: 'baidu', category: 'search' },
    { name: '抖音热榜', crawler: directCrawlers.douyin, platform: 'douyin', category: 'video' },
    { name: 'B站热门', crawler: directCrawlers.bilibili, platform: 'bilibili', category: 'video' },
    { name: 'GitHub Trending', crawler: directCrawlers.github, platform: 'github', category: 'tech' },
    { name: '今日头条', crawler: directCrawlers.toutiao, platform: 'toutiao', category: 'news' },
    { name: '36氪热榜', crawler: directCrawlers['36kr'], platform: '36kr', category: 'tech' }
  ];

  console.log(`\n[阶段1] 直接爬取 ${directPlatforms.length} 个平台`);

  for (const platform of directPlatforms) {
    try {
      console.log(`\n正在爬取 ${platform.name}...`);
      const items = await platform.crawler();

      if (items && items.length > 0) {
        allHotlists.push({
          platform: platform.platform,
          name: platform.name,
          category: platform.category,
          items: items,
          updatedAt: new Date().toISOString(),
          method: 'direct' // 标记为直接爬取
        });
        console.log(`✅ ${platform.name} 成功,获取 ${items.length} 条`);
      } else {
        console.log(`⚠️  ${platform.name} 未获取到数据`);
      }
    } catch (error) {
      console.error(`❌ ${platform.name} 失败:`, error.message);
    }

    await delay(1000); // 避免请求过快
  }

  // 2. RSSHub 爬取的平台(补充直接爬取失败的)
  console.log(`\n[阶段2] RSSHub 爬取其他平台`);

  try {
    const rsshubResult = await crawlHotlistOnce();

    // 合并 RSSHub 结果,但不覆盖已有数据
    const existingPlatforms = new Set(allHotlists.map(h => h.platform));

    for (const rsshubHotlist of rsshubResult.hotlists) {
      if (!existingPlatforms.has(rsshubHotlist.platform) && rsshubHotlist.items.length > 0) {
        allHotlists.push({
          ...rsshubHotlist,
          method: 'rsshub' // 标记为 RSSHub 爬取
        });
        console.log(`✅ ${rsshubHotlist.name} (RSSHub) 成功,获取 ${rsshubHotlist.items.length} 条`);
      }
    }
  } catch (error) {
    console.error('RSSHub 爬取失败:', error.message);
  }

  // 3. 保存结果
  const dataDir = path.join(__dirname, '../data');
  await fs.mkdir(dataDir, { recursive: true });

  const timestamp = new Date().toISOString().split('T')[0];
  const outputPath = path.join(dataDir, `hotlist-${timestamp}.json`);
  await fs.writeFile(outputPath, JSON.stringify(allHotlists, null, 2));

  const latestPath = path.join(dataDir, 'hotlist-latest.json');
  await fs.writeFile(latestPath, JSON.stringify(allHotlists, null, 2));

  // 4. 生成统计
  const totalItems = allHotlists.reduce((sum, h) => sum + h.items.length, 0);
  const directCount = allHotlists.filter(h => h.method === 'direct').length;
  const rsshubCount = allHotlists.filter(h => h.method === 'rsshub').length;

  const stats = {
    totalPlatforms: allHotlists.length,
    totalItems: totalItems,
    directCrawled: directCount,
    rsshubCrawled: rsshubCount,
    platforms: allHotlists.map(h => ({
      platform: h.platform,
      name: h.name,
      category: h.category,
      count: h.items.length,
      method: h.method
    })),
    updatedAt: new Date().toISOString()
  };

  const statsPath = path.join(dataDir, 'hotlist-stats.json');
  await fs.writeFile(statsPath, JSON.stringify(stats, null, 2));

  console.log('\n========== 混合爬取完成 ==========');
  console.log(`平台总数: ${allHotlists.length}`);
  console.log(`  - 直接爬取: ${directCount} 个`);
  console.log(`  - RSSHub: ${rsshubCount} 个`);
  console.log(`总条目: ${totalItems}`);
  console.log(`保存至: ${outputPath}`);
  console.log('========================================');

  return { hotlists: allHotlists, stats };
}

// 直接运行
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  crawlHotlistHybrid()
    .then(() => mergeHotlistToArticles())
    .then(() => console.log('\n✅ 所有任务完成'))
    .catch(error => {
      console.error('\n❌ 任务失败:', error);
      process.exit(1);
    });
}
