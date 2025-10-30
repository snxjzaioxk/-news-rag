import { Redis } from '@upstash/redis';
const redis = Redis.fromEnv();

export default async function handler(req, res) {
  const data = await redis.get('hotlist:latest');
  if (!data) return res.status(404).json({ ok: false, message: 'no cache' });
  res.status(200).json(data);
}