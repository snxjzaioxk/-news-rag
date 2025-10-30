import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function handler(req, res) {
  // 设置CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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

    res.status(200).json({
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
}