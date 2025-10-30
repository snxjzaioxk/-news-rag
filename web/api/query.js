import { handleRAGQuery } from '../api/query.js';

export default async function handler(req, res) {
  // 设置CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { q, query, topK = 5 } = req.body;
    const question = q || query;

    if (!question) {
      return res.status(400).json({ error: '缺少查询参数 q 或 query' });
    }

    const result = await handleRAGQuery(question, { topK });
    res.status(200).json(result);
  } catch (error) {
    console.error('查询失败:', error);
    res.status(500).json({ error: '查询失败', message: error.message });
  }
}