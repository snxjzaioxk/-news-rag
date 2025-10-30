import { Redis } from '@upstash/redis';
import { crawlHotlistOnce } from '../ingest/hotlist-crawler.js';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  // 鉴权：验证来自 GitHub Actions 的请求
  const authHeader = req.headers['authorization'];
  const crawlToken = process.env.CRAWL_TOKEN;

  if (crawlToken && authHeader !== `Bearer ${crawlToken}`) {
    return res.status(401).json({
      ok: false,
      message: 'Unauthorized: Invalid token'
    });
  }

  // 分布式锁：避免并发执行 (120 秒)
  const locked = await redis.set('lock:crawl-hotlist', '1', { nx: true, ex: 120 });
  if (!locked) {
    return res.status(202).json({
      ok: false,
      message: 'Already running: Another crawl job is in progress'
    });
  }

  try {
    console.log('[Crawl] 开始执行热榜爬取...');
    const startTime = Date.now();

    // 执行爬取
    const result = await crawlHotlistOnce();

    // 缓存最新数据 (1 小时 TTL)
    await redis.set('hotlist:latest', result, { ex: 3600 });

    // 按日期归档 (永久保存)
    const day = new Date().toISOString().slice(0, 10);
    await redis.set(`hotlist:${day}`, result);

    const duration = Date.now() - startTime;
    const count = result?.hotlists?.length || 0;
    const totalItems = result?.stats?.totalItems || 0;

    console.log(`[Crawl] 完成! 耗时: ${duration}ms, 平台数: ${count}, 总条目: ${totalItems}`);

    return res.status(200).json({
      ok: true,
      platforms: count,
      totalItems: totalItems,
      duration: `${duration}ms`,
      updatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Crawl] 错误:', error);
    return res.status(500).json({
      ok: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });

  } finally {
    // 释放锁
    await redis.del('lock:crawl-hotlist');
  }
}