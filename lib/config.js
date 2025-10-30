// lib/config.js - 环境变量配置管理
export const config = {
  // AI模型配置
  ai: {
    // 智谱AI
    glm: {
      apiKey: process.env.GLM_API_KEY,
      embedUrl: process.env.GLM_EMBED_URL || 'https://open.bigmodel.cn/api/paas/v4/embeddings',
      chatUrl: process.env.GLM_CHAT_URL || 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    },
    // 硅基流动
    siliconflow: {
      apiKey: process.env.SILICONFLOW_API_KEY,
      embedUrl: process.env.SILICONFLOW_EMBED_URL || 'https://api.siliconflow.cn/v1/embeddings',
      chatUrl: process.env.SILICONFLOW_CHAT_URL || 'https://api.siliconflow.cn/v1/chat/completions',
    },
    // OpenAI
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      embedUrl: process.env.OPENAI_EMBED_URL || 'https://api.openai.com/v1/embeddings',
      chatUrl: process.env.OPENAI_CHAT_URL || 'https://api.openai.com/v1/chat/completions',
    }
  },

  // 数据库配置
  database: {
    upstash: {
      redisUrl: process.env.UPSTASH_REDIS_REST_URL,
      redisToken: process.env.UPSTASH_REDIS_REST_TOKEN,
    },
    // 备选：Supabase
    supabase: {
      url: process.env.SUPABASE_URL,
      key: process.env.SUPABASE_ANON_KEY,
    }
  },

  // 应用配置
  app: {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT) || 3001,
    apiUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001',
  },

  // 缓存配置
  cache: {
    defaultTtl: parseInt(process.env.CACHE_TTL) || 600, // 10分钟
    queryTtl: parseInt(process.env.QUERY_CACHE_TTL) || 1800, // 30分钟
  },

  // API限制
  limits: {
    maxQueryLength: parseInt(process.env.MAX_QUERY_LENGTH) || 500,
    maxTopK: parseInt(process.env.MAX_TOP_K) || 10,
    requestTimeout: parseInt(process.env.REQUEST_TIMEOUT) || 25000, // 25秒
  }
};

// 获取可用的AI模型
export function getAvailableAIModel() {
  if (config.ai.glm.apiKey) {
    return {
      provider: 'glm',
      ...config.ai.glm
    };
  }
  if (config.ai.siliconflow.apiKey) {
    return {
      provider: 'siliconflow',
      ...config.ai.siliconflow
    };
  }
  if (config.ai.openai.apiKey) {
    return {
      provider: 'openai',
      ...config.ai.openai
    };
  }
  return null;
}

// 检查必需的环境变量
export function checkRequiredEnv() {
  const missing = [];

  // 检查AI模型
  const aiModel = getAvailableAIModel();
  if (!aiModel) {
    missing.push('至少需要一个AI模型API密钥 (GLM_API_KEY, SILICONFLOW_API_KEY, 或 OPENAI_API_KEY)');
  }

  // 检查数据库（生产环境）
  if (config.app.nodeEnv === 'production') {
    if (!config.database.upstash.redisUrl && !config.database.supabase.url) {
      missing.push('生产环境需要配置数据库 (UPSTASH_REDIS_* 或 SUPABASE_*)');
    }
  }

  return {
    ok: missing.length === 0,
    missing,
    config: {
      hasAI: !!getAvailableAIModel(),
      hasDatabase: !!(config.database.upstash.redisUrl || config.database.supabase.url),
      environment: config.app.nodeEnv,
    }
  };
}

// 默认导出配置
export default config;