import { Redis } from '@upstash/redis';
const redis = Redis.fromEnv();

export default async function handler(req, res) {
  try {
    await redis.set('ping', 'pong', { ex: 60 }); // 写入并设置过期
    const v = await redis.get('ping');           // 读取
    res.status(200).json({ ok: true, value: v });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
}