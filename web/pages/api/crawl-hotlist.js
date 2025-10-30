import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  return res.status(503).json({
    ok: false,
    message: 'This API endpoint is deprecated. Please use /api/hotlist instead.'
  });
}
