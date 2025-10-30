import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

/**
 * 获取直接API爬取的热榜数据
 * GET /api/direct-hotlist?limit=10&platform=xxx&category=xxx
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

    // 从 Redis 读取最新热榜数据 (与 /api/hotlist 使用相同数据源)
    const data = await redis.get('hotlist:latest');

    if (!data) {
      return res.status(200).json({
        count: 0,
        platforms: [],
        totalItems: 0,
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

    // 格式化返回数据
    const result = hotlists.map(hotlist => ({
      platform: hotlist.platform,
      name: hotlist.name,
      category: hotlist.category,
      items: (hotlist.items || []).slice(0, parseInt(limit)).map(item => ({
        id: item.id || item.url,
        title: item.title,
        url: item.url,
        hotIndex: item.hotIndex || item.hot,
        summary: item.summary || item.description,
        pubDate: item.pubDate || item.timestamp || new Date().toISOString(),
        extra: item.extra || {}
      })),
      count: hotlist.items?.length || 0,
      updatedAt: hotlist.updatedAt || data.stats?.updatedAt || new Date().toISOString()
    }));

    const totalItems = result.reduce((sum, p) => sum + (p.count || 0), 0);

    return res.status(200).json({
      count: result.length,
      platforms: result,
      totalItems: totalItems,
      updatedAt: data.stats?.updatedAt || new Date().toISOString()
    });

  } catch (error) {
    console.error('获取直接API热榜失败:', error);
    return res.status(500).json({
      error: '获取直接API热榜失败',
      message: error.message
    });
  }
}
