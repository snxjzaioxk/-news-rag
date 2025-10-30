import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

/**
 * 获取热榜列表 (兼容前端格式)
 * GET /api/hotlist?limit=10&platform=xxx&category=xxx
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
    const { limit = 10, platform, category } = req.query;

    // 从 Redis 读取最新热榜数据
    const data = await redis.get('hotlist:latest');

    if (!data) {
      return res.status(200).json({
        count: 0,
        platforms: [],
        updatedAt: new Date().toISOString()
      });
    }

    let hotlists = data.hotlists || [];

    // 按平台过滤
    if (platform && platform !== 'all') {
      hotlists = hotlists.filter(h => h.platform === platform);
    }

    // 按分类过滤
    if (category && category !== 'all') {
      hotlists = hotlists.filter(h => h.category === category);
    }

    // 格式化返回数据,限制每个平台的条目数
    const result = hotlists.map(hotlist => ({
      platform: hotlist.platform,
      name: hotlist.name,
      category: hotlist.category,
      items: (hotlist.items || []).slice(0, parseInt(limit)).map(item => ({
        id: item.id || item.url,
        title: item.title,
        url: item.url,
        hotIndex: item.hotIndex || item.hot,
        description: item.description || item.summary,
        pubDate: item.pubDate || item.timestamp || new Date().toISOString()
      })),
      count: hotlist.items?.length || 0,
      updatedAt: hotlist.updatedAt || data.stats?.updatedAt || new Date().toISOString()
    }));

    return res.status(200).json({
      count: result.length,
      platforms: result,
      updatedAt: data.stats?.updatedAt || new Date().toISOString()
    });

  } catch (error) {
    console.error('获取热榜失败:', error);
    return res.status(500).json({
      error: '获取热榜失败',
      message: error.message
    });
  }
}
