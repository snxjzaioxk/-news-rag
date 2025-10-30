export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    platform: 'vercel',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: '1.0.0'
  });
}