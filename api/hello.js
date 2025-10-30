// 简单的测试端点
export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    message: 'Vercel runtime 配置正常',
    timestamp: new Date().toISOString()
  });
}
