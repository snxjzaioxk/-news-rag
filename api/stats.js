import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

/**
 * 获取统计信息
 * GET /api/stats
 */
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
    // 从 Redis 读取最新热榜数据
    const data = await redis.get('hotlist:latest');

    if (!data || !data.stats) {
      // 返回默认统计信息
      return res.status(200).json({
        stats: {
          articles: 0,
          chunks: 0,
          vectors: 0
        },
        sources: {},
        timestamp: new Date().toISOString()
      });
    }

    // 计算数据源统计
    const sources = {};
    if (data.hotlists) {
      data.hotlists.forEach(hotlist => {
        const source = hotlist.platform || hotlist.name;
        sources[source] = hotlist.items?.length || 0;
      });
    }

    return res.status(200).json({
      stats: {
        articles: data.stats.totalItems || 0,
        chunks: 0, // 如果有向量化数据可以从其他地方读取
        vectors: 0
      },
      sources: sources,
      timestamp: data.stats.updatedAt || new Date().toISOString()
    });

  } catch (error) {
    console.error('获取统计失败:', error);
    return res.status(200).json({
      stats: {
        articles: 0,
        chunks: 0,
        vectors: 0
      },
      sources: {},
      timestamp: new Date().toISOString()
    });
  }
}
