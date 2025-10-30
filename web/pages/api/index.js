// api/index.js - API服务主入口
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { handleRAGQuery, generateHotlistSummary } from './query.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载环境变量
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json());

// 请求日志
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// ========== API路由 ==========

/**
 * 健康检查
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * RAG查询接口
 */
app.post('/api/query', async (req, res) => {
  try {
    const { q, query, topK = 5 } = req.body;
    const question = q || query;

    if (!question) {
      return res.status(400).json({ error: '缺少查询参数 q 或 query' });
    }

    const result = await handleRAGQuery(question, { topK });
    res.json(result);
  } catch (error) {
    console.error('查询失败:', error);
    res.status(500).json({ error: '查询失败', message: error.message });
  }
});

/**
 * 获取最新文章列表
 */
app.get('/api/articles', async (req, res) => {
  try {
    const { category, limit = 20, offset = 0 } = req.query;

    const dataPath = path.join(__dirname, '../data/processed-articles.json');
    const data = await fs.readFile(dataPath, 'utf-8');
    let articles = JSON.parse(data);

    // 按分类过滤
    if (category && category !== 'all') {
      articles = articles.filter(a => a.category === category);
    }

    // 分页
    const start = parseInt(offset);
    const end = start + parseInt(limit);
    const paginatedArticles = articles.slice(start, end);

    res.json({
      total: articles.length,
      offset: start,
      limit: parseInt(limit),
      articles: paginatedArticles.map(a => ({
        id: a.id,
        title: a.title,
        source: a.source,
        category: a.category,
        url: a.url,
        pubDate: a.pubDate,
        summary: a.summary,
        keywords: a.keywords
      }))
    });
  } catch (error) {
    console.error('获取文章列表失败:', error);
    res.status(500).json({ error: '获取文章失败' });
  }
});

/**
 * 获取热榜 (增强版)
 */
app.get('/api/hotlist', async (req, res) => {
  try {
    const { platform, category, limit = 10 } = req.query;

    const dataPath = path.join(__dirname, '../data/hotlist-latest.json');
    const data = await fs.readFile(dataPath, 'utf-8');
    const hotlists = JSON.parse(data);

    let filteredHotlists = hotlists;

    // 按平台过滤
    if (platform && platform !== 'all') {
      filteredHotlists = filteredHotlists.filter(h => h.platform === platform);
    }

    // 按分类过滤
    if (category && category !== 'all') {
      filteredHotlists = filteredHotlists.filter(h => h.category === category);
    }

    // 限制每个平台的数量
    const result = filteredHotlists.map(hotlist => ({
      platform: hotlist.platform,
      name: hotlist.name,
      category: hotlist.category,
      items: hotlist.items.slice(0, parseInt(limit)).map(item => ({
        id: item.id,
        title: item.title,
        url: item.url,
        hotIndex: item.hotIndex,
        description: item.description,
        pubDate: item.pubDate
      })),
      count: hotlist.items.length,
      updatedAt: hotlist.updatedAt
    }));

    res.json({
      count: result.length,
      platforms: result,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('获取热榜失败:', error);
    res.status(500).json({ error: '获取热榜失败' });
  }
});

/**
 * 生成热榜摘要
 */
app.post('/api/hotlist/summary', async (req, res) => {
  try {
    const { topN = 10 } = req.body;

    const dataPath = path.join(__dirname, '../data/processed-articles.json');
    const data = await fs.readFile(dataPath, 'utf-8');
    const articles = JSON.parse(data);

    const summary = await generateHotlistSummary(articles, topN);
    res.json(summary);
  } catch (error) {
    console.error('生成摘要失败:', error);
    res.status(500).json({ error: '生成摘要失败' });
  }
});

/**
 * 获取统计信息
 */
app.get('/api/stats', async (req, res) => {
  try {
    const reportPath = path.join(__dirname, '../data/report.json');
    const data = await fs.readFile(reportPath, 'utf-8');
    const report = JSON.parse(data);
    res.json(report);
  } catch (error) {
    console.error('获取统计失败:', error);
    res.status(500).json({ error: '获取统计失败' });
  }
});

/**
 * 获取分类列表
 */
app.get('/api/categories', async (req, res) => {
  try {
    const reportPath = path.join(__dirname, '../data/report.json');
    const data = await fs.readFile(reportPath, 'utf-8');
    const report = JSON.parse(data);

    const categories = Object.entries(report.categories || {}).map(([name, count]) => ({
      name,
      count
    }));

    res.json({ categories });
  } catch (error) {
    res.json({ categories: [] });
  }
});

/**
 * 获取热榜平台列表
 */
app.get('/api/hotlist/platforms', async (req, res) => {
  try {
    const statsPath = path.join(__dirname, '../data/hotlist-stats.json');
    const data = await fs.readFile(statsPath, 'utf-8');
    const stats = JSON.parse(data);
    res.json(stats);
  } catch (error) {
    res.json({ platforms: [], totalPlatforms: 0, totalItems: 0 });
  }
});

/**
 * 获取直接API爬取的热榜数据 - 使用独立路径避免路由冲突
 */
app.get('/api/direct-hotlist', async (req, res) => {
  try {
    const { platform, category, limit = 10 } = req.query;

    const dataPath = path.join(__dirname, '../data/direct-hotlist-latest.json');
    const data = await fs.readFile(dataPath, 'utf-8');
    const hotlists = JSON.parse(data);

    let filteredHotlists = hotlists.platforms || [];

    // 按平台过滤
    if (platform && platform !== 'all') {
      filteredHotlists = filteredHotlists.filter(h => h.platform === platform);
    }

    // 按分类过滤
    if (category && category !== 'all') {
      filteredHotlists = filteredHotlists.filter(h => h.category === category);
    }

    // 限制每个平台的数量
    const result = filteredHotlists.map(hotlist => ({
      platform: hotlist.platform,
      name: hotlist.name,
      category: hotlist.category,
      items: hotlist.items.slice(0, parseInt(limit)).map(item => ({
        id: item.id,
        title: item.title,
        url: item.url,
        hotIndex: item.hotIndex,
        summary: item.summary,
        pubDate: item.pubDate,
        extra: item.extra
      })),
      count: hotlist.items.length,
      updatedAt: hotlist.updatedAt
    }));

    res.json({
      count: result.length,
      platforms: result,
      totalItems: filteredHotlists.reduce((sum, p) => sum + p.count, 0),
      updatedAt: hotlists.timestamp || new Date().toISOString()
    });
  } catch (error) {
    console.error('获取直接API热榜失败:', error);
    res.status(500).json({ error: '获取直接API热榜失败' });
  }
});

/**
 * 获取单个平台的热榜详情
 */
app.get('/api/hotlist/:platform', async (req, res) => {
  try {
    const { platform } = req.params;
    const { limit = 50 } = req.query;

    const dataPath = path.join(__dirname, '../data/hotlist-latest.json');
    const data = await fs.readFile(dataPath, 'utf-8');
    const hotlists = JSON.parse(data);

    const platformData = hotlists.find(h => h.platform === platform);

    if (!platformData) {
      return res.status(404).json({ error: '平台不存在' });
    }

    res.json({
      platform: platformData.platform,
      name: platformData.name,
      category: platformData.category,
      items: platformData.items.slice(0, parseInt(limit)),
      total: platformData.items.length,
      updatedAt: platformData.updatedAt
    });
  } catch (error) {
    console.error('获取平台热榜失败:', error);
    res.status(500).json({ error: '获取平台热榜失败' });
  }
});

/**
 * 手动触发直接API爬取
 */
app.post('/api/trigger/direct', async (req, res) => {
  try {
    console.log('收到手动触发直接API爬取请求');

    // 返回立即响应,后台执行
    res.json({
      status: 'started',
      message: '直接API爬取任务已启动,请稍后查看结果',
      timestamp: new Date().toISOString()
    });

    // 后台执行爬取
    const projectRoot = path.join(__dirname, '..');
    const crawlerManagerScript = path.join(projectRoot, 'ingest/crawler-manager.js');

    const child = spawn('node', [crawlerManagerScript], {
      cwd: projectRoot,
      detached: true,
      stdio: 'ignore'
    });

    child.unref();
    console.log('直接API爬取任务已在后台启动');
  } catch (error) {
    console.error('启动直接API爬取失败:', error);
    res.status(500).json({ error: '启动失败', message: error.message });
  }
});

/**
 * 手动触发爬取 - 仅爬取热榜
 */
app.post('/api/trigger/hotlist', async (req, res) => {
  try {
    console.log('收到手动触发热榜爬取请求');

    // 返回立即响应,后台执行
    res.json({
      status: 'started',
      message: '热榜爬取任务已启动,请稍后查看结果',
      timestamp: new Date().toISOString()
    });

    // 后台执行爬取
    const projectRoot = path.join(__dirname, '..');
    const hotlistScript = path.join(projectRoot, 'ingest/hotlist-crawler.js');

    const child = spawn('node', [hotlistScript], {
      cwd: projectRoot,
      detached: true,
      stdio: 'ignore'
    });

    child.unref();
    console.log('热榜爬取任务已在后台启动');
  } catch (error) {
    console.error('启动热榜爬取失败:', error);
    res.status(500).json({ error: '启动失败', message: error.message });
  }
});

/**
 * 手动触发爬取 - 完整入库流程
 */
app.post('/api/trigger/ingest', async (req, res) => {
  try {
    console.log('收到手动触发完整入库请求');

    // 返回立即响应,后台执行
    res.json({
      status: 'started',
      message: '完整入库任务已启动,包括文章爬取、热榜爬取、清洗和向量化',
      timestamp: new Date().toISOString()
    });

    // 后台执行入库
    const projectRoot = path.join(__dirname, '..');
    const mainScript = path.join(projectRoot, 'ingest/main.js');

    const child = spawn('node', [mainScript], {
      cwd: projectRoot,
      detached: true,
      stdio: 'ignore'
    });

    child.unref();
    console.log('完整入库任务已在后台启动');
  } catch (error) {
    console.error('启动入库失败:', error);
    res.status(500).json({ error: '启动失败', message: error.message });
  }
});

/**
 * 手动触发爬取 - 仅普通文章
 */
app.post('/api/trigger/articles', async (req, res) => {
  try {
    console.log('收到手动触发文章爬取请求');

    res.json({
      status: 'started',
      message: '文章爬取任务已启动',
      timestamp: new Date().toISOString()
    });

    const projectRoot = path.join(__dirname, '..');
    const crawlerScript = path.join(projectRoot, 'ingest/crawler.js');

    const child = spawn('node', [crawlerScript], {
      cwd: projectRoot,
      detached: true,
      stdio: 'ignore'
    });

    child.unref();
    console.log('文章爬取任务已在后台启动');
  } catch (error) {
    console.error('启动文章爬取失败:', error);
    res.status(500).json({ error: '启动失败', message: error.message });
  }
});

// 错误处理
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({ error: '服务器内部错误' });
});

// 404处理
app.use((req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

// 启动服务器
app.listen(PORT, () => {
  console.log('========================================');
  console.log('   新闻RAG API 服务已启动');
  console.log('========================================');
  console.log(`端口: ${PORT}`);
  console.log(`时间: ${new Date().toISOString()}`);
  console.log('\nAPI端点:');
  console.log('  GET  /health                    - 健康检查');
  console.log('  POST /api/query                 - RAG查询');
  console.log('  GET  /api/articles              - 文章列表');
  console.log('  GET  /api/hotlist               - 热榜列表');
  console.log('  GET  /api/direct-hotlist        - 直接API热榜');
  console.log('  GET  /api/hotlist/platforms     - 平台列表');
  console.log('  GET  /api/hotlist/:platform     - 单个平台热榜');
  console.log('  POST /api/hotlist/summary       - 热榜摘要');
  console.log('  GET  /api/stats                 - 统计信息');
  console.log('  GET  /api/categories            - 分类列表');
  console.log('  POST /api/trigger/hotlist       - 手动触发热榜爬取');
  console.log('  POST /api/trigger/direct        - 手动触发直接API爬取');
  console.log('  POST /api/trigger/articles      - 手动触发文章爬取');
  console.log('  POST /api/trigger/ingest        - 手动触发完整入库');
  console.log('========================================');
});

export default app;
