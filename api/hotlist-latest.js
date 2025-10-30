import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

/**
 * 获取最新热榜数据
 * GET /api/hotlist-latest
 *
 * 可选查询参数:
 * - date: YYYY-MM-DD 格式，获取指定日期的热榜
 * - platform: 过滤特定平台 (如 zhihu, weibo, baidu)
 */
export default async function handler(req, res) {
  try {
    const { date, platform } = req.query;

    // 根据查询参数决定读取哪个 key
    const redisKey = date ? `hotlist:${date}` : 'hotlist:latest';

    console.log(`[Read] 读取热榜数据: ${redisKey}`);

    // 从 Redis 读取数据
    const data = await redis.get(redisKey);

    if (!data) {
      return res.status(404).json({
        ok: false,
        message: date
          ? `No hotlist data found for date: ${date}`
          : 'No hotlist data available. Please wait for the next crawl.'
      });
    }

    // 如果指定了平台过滤
    let hotlists = data.hotlists || [];
    if (platform) {
      hotlists = hotlists.filter(h => h.platform === platform);
    }

    // 返回数据
    return res.status(200).json({
      ok: true,
      hotlists: hotlists,
      stats: data.stats,
      filters: {
        date: date || 'latest',
        platform: platform || 'all'
      },
      cacheInfo: {
        key: redisKey,
        updatedAt: data.stats?.updatedAt || new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[Read] 错误:', error);
    return res.status(500).json({
      ok: false,
      error: error.message
    });
  }
}