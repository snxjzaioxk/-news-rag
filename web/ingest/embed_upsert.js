// ingest/embed_upsert.js
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ========== 向量存储适配器 ==========

/**
 * R2存储适配器(零成本方案)
 */
class R2VectorStore {
  constructor() {
    this.localPath = path.join(__dirname, '../data/vectors.jsonl');
  }

  async init() {
    // 确保目录存在
    await fs.mkdir(path.dirname(this.localPath), { recursive: true });
  }

  async upsert(vectors) {
    // 追加到JSONL文件
    const lines = vectors.map(v => JSON.stringify(v)).join('\n') + '\n';
    await fs.appendFile(this.localPath, lines);
  }

  async query(vector, topK = 5) {
    // 加载所有向量并计算相似度
    try {
      const content = await fs.readFile(this.localPath, 'utf-8');
      const lines = content.trim().split('\n').filter(l => l.trim());
      const allVectors = lines.map(l => JSON.parse(l));

      // 计算余弦相似度
      const scored = allVectors.map(v => ({
        ...v,
        score: this.cosineSimilarity(vector, v.values)
      }));

      // 排序并返回topK
      scored.sort((a, b) => b.score - a.score);
      return scored.slice(0, topK);
    } catch (error) {
      console.error('查询向量失败:', error);
      return [];
    }
  }

  cosineSimilarity(a, b) {
    const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dot / (normA * normB);
  }
}

/**
 * Pinecone适配器
 */
class PineconeVectorStore {
  constructor(apiKey, environment, indexName) {
    this.apiKey = apiKey;
    this.environment = environment;
    this.indexName = indexName;
    this.baseUrl = `https://${indexName}-${environment}.svc.pinecone.io`;
  }

  async init() {
    // Pinecone初始化(如需要)
  }

  async upsert(vectors) {
    const response = await fetch(`${this.baseUrl}/vectors/upsert`, {
      method: 'POST',
      headers: {
        'Api-Key': this.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ vectors })
    });

    if (!response.ok) {
      throw new Error(`Pinecone upsert failed: ${response.statusText}`);
    }

    return await response.json();
  }

  async query(vector, topK = 5) {
    const response = await fetch(`${this.baseUrl}/query`, {
      method: 'POST',
      headers: {
        'Api-Key': this.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        vector,
        topK,
        includeMetadata: true
      })
    });

    if (!response.ok) {
      throw new Error(`Pinecone query failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result.matches || [];
  }
}

// ========== Embedding API适配器 ==========

/**
 * 智谱AI (GLM) Embedding
 */
async function embedWithGLM(texts) {
  const apiKey = process.env.GLM_API_KEY;
  const url = process.env.GLM_EMBED_URL || 'https://open.bigmodel.cn/api/paas/v4/embeddings';

  if (!apiKey) {
    throw new Error('GLM_API_KEY not configured');
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'embedding-2',
      input: texts
    })
  });

  if (!response.ok) {
    throw new Error(`GLM embedding failed: ${response.statusText}`);
  }

  const result = await response.json();
  return result.data.map(item => item.embedding);
}

/**
 * 硅基流动 Embedding
 */
async function embedWithSiliconFlow(texts) {
  const apiKey = process.env.SILICONFLOW_API_KEY;
  const url = process.env.SILICONFLOW_EMBED_URL || 'https://api.siliconflow.cn/v1/embeddings';

  if (!apiKey) {
    throw new Error('SILICONFLOW_API_KEY not configured');
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'BAAI/bge-large-zh-v1.5',
      input: texts,
      encoding_format: 'float'
    })
  });

  if (!response.ok) {
    throw new Error(`SiliconFlow embedding failed: ${response.statusText}`);
  }

  const result = await response.json();
  return result.data.map(item => item.embedding);
}

/**
 * OpenAI Embedding (备用)
 */
async function embedWithOpenAI(texts) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_EMBED_MODEL || 'text-embedding-3-small';

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      input: texts
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI embedding failed: ${response.statusText}`);
  }

  const result = await response.json();
  return result.data.map(item => item.embedding);
}

/**
 * 自动选择可用的embedding服务
 */
async function embedTexts(texts) {
  // 尝试顺序: SiliconFlow -> GLM -> OpenAI (硅基流动测试稳定,放第一位)
  const strategies = [
    { name: 'SiliconFlow', fn: embedWithSiliconFlow, check: () => !!process.env.SILICONFLOW_API_KEY },
    { name: 'GLM', fn: embedWithGLM, check: () => !!process.env.GLM_API_KEY },
    { name: 'OpenAI', fn: embedWithOpenAI, check: () => !!process.env.OPENAI_API_KEY }
  ];

  for (const strategy of strategies) {
    if (strategy.check()) {
      try {
        console.log(`使用 ${strategy.name} 生成embedding...`);
        return await strategy.fn(texts);
      } catch (error) {
        console.warn(`${strategy.name} 失败:`, error.message);
      }
    }
  }

  throw new Error('没有可用的embedding服务,请配置至少一个API Key');
}

// ========== 主要功能 ==========

/**
 * 初始化向量存储
 */
export async function initVectorStore() {
  // 优先使用Pinecone,否则使用R2本地存储
  if (process.env.PINECONE_API_KEY) {
    console.log('使用 Pinecone 向量存储');
    return new PineconeVectorStore(
      process.env.PINECONE_API_KEY,
      process.env.PINECONE_ENVIRONMENT,
      process.env.PINECONE_INDEX
    );
  }

  console.log('使用 R2 本地向量存储(零成本方案)');
  return new R2VectorStore();
}

/**
 * 生成向量ID
 */
function generateId(text) {
  return crypto.createHash('sha256').update(text).digest('hex').slice(0, 32);
}

/**
 * 批量处理并上传向量
 */
export async function embedAndUpsert(chunks, batchSize = 5) {
  console.log(`开始生成 ${chunks.length} 个文本块的向量...`);

  const store = await initVectorStore();
  await store.init();

  let processed = 0;
  let failed = 0;

  // 智能分批:按字符数限制而非固定条数
  // 硅基流动单次请求限制约4000-6000字符(实测)
  const MAX_BATCH_CHARS = 2000; // 保守估计,单条处理长文本

  let i = 0;
  let batchNum = 1;

  while (i < chunks.length) {
    // 动态决定本批次包含多少条
    const batch = [];
    let batchChars = 0;

    while (i < chunks.length && batch.length < batchSize) {
      const chunk = chunks[i];
      const textLen = chunk.text.length;

      // 如果加上这条会超限,且batch已有数据,则跳出
      if (batchChars + textLen > MAX_BATCH_CHARS && batch.length > 0) {
        break;
      }

      batch.push(chunk);
      batchChars += textLen;
      i++;

      // 单条就超限时,强制单独处理
      if (textLen > MAX_BATCH_CHARS) {
        break;
      }
    }

    if (batch.length === 0) break;

    const texts = batch.map(c => {
      // 如果单条文本超过MAX_BATCH_CHARS,截断它
      if (c.text.length > MAX_BATCH_CHARS) {
        console.log(`    ⚠️  文本过长(${c.text.length}字符),截断至${MAX_BATCH_CHARS}字符`);
        return c.text.slice(0, MAX_BATCH_CHARS);
      }
      return c.text;
    });

    try {
      // 生成embeddings
      const embeddings = await embedTexts(texts);

      // 构造向量对象
      const vectors = batch.map((chunk, idx) => ({
        id: generateId(chunk.id + chunk.text),
        values: embeddings[idx],
        metadata: {
          ...chunk.metadata,
          chunkIndex: chunk.chunkIndex,
          text: chunk.text.slice(0, 500) // 只保留前500字符
        }
      }));

      // 上传到向量存储
      await store.upsert(vectors);

      processed += batch.length;
      console.log(`  ✓ 批次 ${batchNum}: ${processed}/${chunks.length} (${Math.round(processed / chunks.length * 100)}%) - ${batch.length}条/${batchChars}字符`);

      // 优化延迟:硅基流动支持20并发,降低延迟到1秒
      if (i < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      batchNum++;
    } catch (error) {
      failed += batch.length;
      console.error(`  ✗ 批次 ${batchNum} 失败:`, error.message);
      // 失败后等待3秒再继续
      await new Promise(resolve => setTimeout(resolve, 3000));
      batchNum++;
    }
  }

  console.log('\n向量生成和上传完成!');
  console.log(`成功: ${processed}, 失败: ${failed}`);
  return processed;
}

/**
 * 单个查询的embedding
 */
export async function embedQuery(query) {
  const embeddings = await embedTexts([query]);
  return embeddings[0];
}

/**
 * 查询相似文本
 */
export async function querySimilar(query, topK = 5) {
  const store = await initVectorStore();
  await store.init();

  const queryVector = await embedQuery(query);
  return await store.query(queryVector, topK);
}
