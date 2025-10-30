import { Redis } from '@upstash/redis';
import { crawlHotlistOnce } from '../ingest/hotlist-crawler.js'; // 你的抓取主函数，返回 { hotlists: [...] }

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  // 防并发：120 秒简单锁
  const locked = await redis.set('lock:crawl-hotlist', '1', { nx: true, ex: 120 });
  if (!locked) return res.status(202).json({ ok: false, message: 'already running' });

  try {
    const result = await crawlHotlistOnce(); // 你的抓取逻辑
    await redis.set('hotlist:latest', result, { ex: 3600 }); // 缓存 1 小时
    const day = new Date().toISOString().slice(0, 10);
    await redis.set(`hotlist:${day}`, result);
    res.status(200).json({ ok: true, count: result?.hotlists?.length || 0 });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  } finally {
    await redis.del('lock:crawl-hotlist');
  }
}