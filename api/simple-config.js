export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 检查环境变量
  const status = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    services: {
      ai: {
        available: !!(process.env.GLM_API_KEY || process.env.SILICONFLOW_API_KEY || process.env.OPENAI_API_KEY),
        glm: !!process.env.GLM_API_KEY,
        siliconflow: !!process.env.SILICONFLOW_API_KEY,
        openai: !!process.env.OPENAI_API_KEY
      },
      database: {
        available: !!(process.env.UPSTASH_REDIS_REST_URL || process.env.SUPABASE_URL),
        upstash: !!process.env.UPSTASH_REDIS_REST_URL,
        supabase: !!process.env.SUPABASE_URL
      }
    },
    status: 'healthy',
    message: '基础配置检查完成'
  };

  // 判断整体健康状态
  const hasAI = status.services.ai.available;
  const hasDB = status.services.database.available;

  if (!hasAI) {
    status.status = 'misconfigured';
    status.issues = ['缺少AI模型API密钥'];
  }

  if (process.env.NODE_ENV === 'production' && !hasDB) {
    status.status = 'misconfigured';
    status.issues = status.issues || [];
    status.issues.push('生产环境需要数据库配置');
  }

  res.status(status.status === 'healthy' ? 200 : 503).json(status);
}