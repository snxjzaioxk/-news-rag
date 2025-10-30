// api-vercel/articles-optimized.js - 优化的文章列表接口
import database from '../lib/database.js';

export default async function handler(req, res) {
  const startTime = Date.now();

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
    const { category, limit = 20, offset = 0, useCache = true } = req.query;

    // 参数验证
    const parsedLimit = Math.max(1, Math.min(100, parseInt(limit) || 20));
    const parsedOffset = Math.max(0, parseInt(offset) || 0);

    // 获取数据（带缓存）
    const result = await database.getArticles(
      category,
      parsedLimit,
      parsedOffset,
      useCache
    );

    // 添加元数据
    const response = {
      ...result,
      meta: {
        category: category || 'all',
        useCache,
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      }
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('获取文章列表失败:', error);
    res.status(500).json({
      error: '获取文章失败',
      message: error.message,
      executionTime: Date.now() - startTime
    });
  }
}