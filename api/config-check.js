// api-vercel/config-check.js - 配置检查接口
import config, { checkRequiredEnv, getAvailableAIModel } from '../lib/config.js';

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
    const envCheck = checkRequiredEnv();
    const aiModel = getAvailableAIModel();

    const status = {
      timestamp: new Date().toISOString(),
      environment: config.app.nodeEnv,
      services: {
        ai: {
          available: !!aiModel,
          provider: aiModel?.provider || 'none',
          hasConfig: !!(config.ai.glm.apiKey || config.ai.siliconflow.apiKey || config.ai.openai.apiKey)
        },
        database: {
          available: !!(config.database.upstash.redisUrl || config.database.supabase.url),
          type: config.database.upstash.redisUrl ? 'upstash-redis' :
                config.database.supabase.url ? 'supabase' : 'none'
        },
        cache: {
          enabled: !!config.database.upstash.redisUrl,
          ttl: config.cache.defaultTtl
        }
      },
      config: {
        cacheTtl: config.cache.defaultTtl,
        queryTtl: config.cache.queryTtl,
        maxQueryLength: config.limits.maxQueryLength,
        maxTopK: config.limits.maxTopK,
        requestTimeout: config.limits.requestTimeout
      },
      status: envCheck.ok ? 'healthy' : 'misconfigured',
      issues: envCheck.missing
    };

    res.status(envCheck.ok ? 200 : 503).json(status);

  } catch (error) {
    console.error('配置检查失败:', error);
    res.status(500).json({
      error: '配置检查失败',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}