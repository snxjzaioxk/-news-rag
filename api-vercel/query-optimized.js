// api-vercel/query-optimized.js - 优化的RAG查询接口
import { handleRAGQuery } from '../api/query.js';
import database from '../lib/database.js';
import config, { getAvailableAIModel, checkRequiredEnv } from '../lib/config.js';

export default async function handler(req, res) {
  const startTime = Date.now();

  // 设置CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 环境检查
    const envCheck = checkRequiredEnv();
    if (!envCheck.ok) {
      return res.status(500).json({
        error: '配置错误',
        message: '服务配置不完整',
        details: envCheck.missing
      });
    }

    const { q, query, topK = 5, useCache = true } = req.body;
    const question = q || query;

    if (!question) {
      return res.status(400).json({ error: '缺少查询参数 q 或 query' });
    }

    // 长度检查
    if (question.length > config.limits.maxQueryLength) {
      return res.status(400).json({
        error: '查询过长',
        maxLength: config.limits.maxQueryLength
      });
    }

    topK = Math.min(parseInt(topK), config.limits.maxTopK);

    // 缓存检查
    if (useCache) {
      const cachedResult = await database.getCachedQuery(question);
      if (cachedResult) {
        return res.status(200).json({
          ...cachedResult,
          cached: true,
          timestamp: new Date().toISOString(),
          executionTime: Date.now() - startTime
        });
      }
    }

    // 设置请求超时
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('请求超时')), config.limits.requestTimeout);
    });

    // 执行查询（带超时）
    const resultPromise = handleRAGQuery(question, { topK });
    const result = await Promise.race([resultPromise, timeoutPromise]);

    const finalResult = {
      ...result,
      cached: false,
      timestamp: new Date().toISOString(),
      executionTime: Date.now() - startTime,
      aiModel: getAvailableAIModel()?.provider
    };

    // 异步缓存结果（不等待）
    if (useCache) {
      database.cacheQuery(question, finalResult, config.cache.queryTtl);
    }

    res.status(200).json(finalResult);

  } catch (error) {
    console.error('查询失败:', error);

    // 根据错误类型返回不同状态码
    if (error.message.includes('超时')) {
      return res.status(408).json({
        error: '请求超时',
        message: 'AI处理时间过长，请稍后重试',
        executionTime: Date.now() - startTime
      });
    }

    if (error.message.includes('额度') || error.message.includes('quota')) {
      return res.status(429).json({
        error: 'API额度不足',
        message: 'AI服务暂时不可用，请稍后重试'
      });
    }

    res.status(500).json({
      error: '查询失败',
      message: error.message,
      executionTime: Date.now() - startTime
    });
  }
}