import { Redis } from '@upstash/redis';
import { crawlHotlistOnce } from '../ingest/hotlist-crawler.js';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  // 只允许 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, message: 'Method not allowed' });
  }

  // 简单的 API key 验证（可选）
  const apiKey = req.headers['x-api-key'];
  if (apiKey && apiKey !== process.env.CRAWL_API_KEY) {
    return res.status(401).json({ ok: false, message: 'Invalid API key' });
  }

  // 防并发：120 秒简单锁
  const locked = await redis.set('lock:crawl-hotlist', '1', { nx: true, ex: 120 });
  if (!locked) {
    return res.status(202).json({
      ok: false,
      message: 'already running'
    });
  }

  try {
    console.log('开始手动爬取热榜...');
    const result = await crawlHotlistOnce();

    // 缓存结果
    await redis.set('hotlist:latest', result, { ex: 3600 }); // 1小时
    const day = new Date().toISOString().slice(0, 10);
    await redis.set(`hotlist:${day}`, result);

    res.status(200).json({
      ok: true,
      message: 'crawl completed',
      platforms: result?.hotlists?.length || 0,
      totalItems: result?.hotlists?.reduce((sum, h) => sum + h.items.length, 0) || 0
    });
  } catch (e) {
    console.error('爬取失败:', e);
    res.status(500).json({
      ok: false,
      error: e.message
    });
  } finally {
    await redis.del('lock:crawl-hotlist');
  }
}