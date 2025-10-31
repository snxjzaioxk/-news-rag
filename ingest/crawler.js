// ingest/crawler.js
import RSSParser from 'rss-parser';
import * as cheerio from 'cheerio';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rss = new RSSParser();

// 加载配置
async function loadSources() {
  try {
    const configPath = path.join(__dirname, '../config/sources.json');
    const data = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(data);
    return config.sources.filter(s => s.enabled);
  } catch (error) {
    console.error('加载配置文件失败:', error);
    return [];
  }
}

// 延迟函数
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 获取文章HTML内容
async function fetchArticleHtml(url) {
  try {
    const res = await fetch(url, {
      timeout: 20000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    return await res.text();
  } catch (e) {
    console.error(`抓取失败 ${url}:`, e.message);
    return '';
  }
}

// 提取正文内容
function extractContent(html, url) {
  if (!html) return '';

  try {
    const $ = cheerio.load(html);

    // 移除脚本和样式
    $('script, style, nav, header, footer, aside, .ad, .advertisement').remove();

    // 尝试多种选择器提取正文
    let text = '';
    const selectors = [
      'article',
      '.article-content',
      '.post-content',
      '.entry-content',
      'main',
      '.content',
      '[role="main"]'
    ];

    for (const selector of selectors) {
      const element = $(selector);
      if (element.length > 0) {
        text = element.text();
        break;
      }
    }

    // 如果没有找到,使用body
    if (!text) {
      text = $('body').text();
    }

    // 清理文本
    text = text
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .trim()
      .slice(0, 50000); // 限制最大长度

    return text;
  } catch (error) {
    console.error('提取内容失败:', error);
    return '';
  }
}

// 爬取单个RSS源
async function crawlRSSSource(source) {
  const items = [];

  try {
    console.log(`正在抓取 ${source.name}...`);
    const feed = await rss.parseURL(source.url);

    const maxArticles = parseInt(process.env.MAX_ARTICLES_PER_SOURCE) || 30;
    const articles = feed.items.slice(0, maxArticles);

    for (const item of articles) {
      const article = {
        id: Buffer.from(item.link).toString('base64').slice(0, 32),
        source: source.name,
        category: source.category,
        title: item.title || '',
        url: item.link || '',
        pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
        description: item.contentSnippet || item.content || '',
        text: ''
      };

      // 抓取完整内容
      await delay(1000); // 避免请求过快
      const html = await fetchArticleHtml(article.url);
      article.text = extractContent(html, article.url);

      if (article.text.length > 100) { // 只保留有效内容
        items.push(article);
        console.log(`  ✓ ${article.title.slice(0, 50)}...`);
      }
    }

    console.log(`${source.name} 完成,获取 ${items.length} 篇文章`);
  } catch (error) {
    console.error(`${source.name} 抓取失败:`, error.message);
  }

  return items;
}

// 去重
function deduplicateArticles(articles) {
  const seen = new Set();
  const unique = [];

  for (const article of articles) {
    const key = article.url || article.title;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(article);
    }
  }

  return unique;
}

// 主爬取函数
export async function crawlOnce() {
  console.log('========== 开始爬取新闻 ==========');
  console.log(`时间: ${new Date().toISOString()}`);

  const sources = await loadSources();
  console.log(`已加载 ${sources.length} 个新闻源`);

  let allArticles = [];

  // 串行抓取每个源(避免并发过高)
  for (const source of sources) {
    const items = await crawlRSSSource(source);
    allArticles = allArticles.concat(items);
    await delay(2000); // 源之间延迟
  }

  // 去重
  allArticles = deduplicateArticles(allArticles);

  // 按发布时间排序
  allArticles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

  // 保存到文件
  const dataDir = path.join(__dirname, '../data');
  await fs.mkdir(dataDir, { recursive: true });

  const timestamp = new Date().toISOString().split('T')[0];
  const outputPath = path.join(dataDir, `articles-${timestamp}.json`);
  await fs.writeFile(outputPath, JSON.stringify(allArticles, null, 2));

  // 同时保存为latest.json
  const latestPath = path.join(dataDir, 'latest.json');
  await fs.writeFile(latestPath, JSON.stringify(allArticles, null, 2));

  console.log(`========== 爬取完成 ==========`);
  console.log(`总计: ${allArticles.length} 篇文章`);
  console.log(`保存至: ${outputPath}`);

  return allArticles;
}

// 直接运行
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  crawlOnce()
    .then(() => console.log('爬取任务完成'))
    .catch(console.error);
}
