/**
 * 调试端点 - 验证环境变量是否正确配置
 * 访问: /api/debug-env
 *
 * ⚠️ 注意: 上线前建议删除或添加鉴权
 */
export default function handler(req, res) {
  const config = {
    // 环境变量存在性检查（不泄露实际值）
    env: {
      CRAWL_TOKEN: !!process.env.CRAWL_TOKEN,
      UPSTASH_REDIS_REST_URL: !!process.env.UPSTASH_REDIS_REST_URL,
      UPSTASH_REDIS_REST_TOKEN: !!process.env.UPSTASH_REDIS_REST_TOKEN,
    },

    // 显示部分值（前6位）方便确认
    preview: {
      UPSTASH_URL: process.env.UPSTASH_REDIS_REST_URL?.slice(0, 30) + '...' || 'NOT_SET',
      CRAWL_TOKEN: process.env.CRAWL_TOKEN?.slice(0, 6) + '...' || 'NOT_SET',
    },

    // 配置状态
    status: {
      allConfigured: !!(
        process.env.CRAWL_TOKEN &&
        process.env.UPSTASH_REDIS_REST_URL &&
        process.env.UPSTASH_REDIS_REST_TOKEN
      ),
      ready: !!(
        process.env.CRAWL_TOKEN &&
        process.env.UPSTASH_REDIS_REST_URL &&
        process.env.UPSTASH_REDIS_REST_TOKEN
      ),
    },

    // 其他信息
    meta: {
      nodeVersion: process.version,
      platform: process.platform,
      vercelRegion: process.env.VERCEL_REGION || 'local',
      timestamp: new Date().toISOString(),
    }
  };

  return res.status(200).json(config);
}
