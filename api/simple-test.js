export default async function handler(req, res) {
  // 设置CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  res.status(200).json({
    message: '✅ API测试成功！',
    timestamp: new Date().toISOString(),
    method: req.method,
    query: req.query,
    headers: {
      host: req.headers.host,
      'user-agent': req.headers['user-agent']
    },
    environment: {
      node_env: process.env.NODE_ENV,
      platform: 'vercel'
    }
  });
}