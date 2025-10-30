// embed_remaining.js - 生成剩余向量
import dotenv from 'dotenv';
import fs from 'fs/promises';
import { embedAndUpsert } from './ingest/embed_upsert.js';

dotenv.config();

async function main() {
  console.log('🚀 开始生成剩余向量...\n');

  // 读取切片数据
  const data = await fs.readFile('data/chunks.json', 'utf-8');
  const allChunks = JSON.parse(data);

  // 检查已有向量
  let processedCount = 0;
  try {
    const vectorData = await fs.readFile('data/vectors.jsonl', 'utf-8');
    processedCount = vectorData.trim().split('\n').length;
    console.log(`✓ 已有 ${processedCount} 个向量`);
  } catch (e) {
    console.log('✓ 向量文件为空,从头开始');
  }

  // 处理剩余的
  const remainingChunks = allChunks.slice(processedCount);
  console.log(`📊 总计: ${allChunks.length} 个`);
  console.log(`⏳ 待处理: ${remainingChunks.length} 个\n`);

  if (remainingChunks.length === 0) {
    console.log('✅ 所有向量已生成完毕!');
    return;
  }

  const startTime = Date.now();

  // 每批3个,间隔3秒
  const result = await embedAndUpsert(remainingChunks, 3);

  const duration = Math.round((Date.now() - startTime) / 1000);

  console.log(`\n${'='.repeat(50)}`);
  console.log(`✅ 完成!`);
  console.log(`   新增向量: ${result} 个`);
  console.log(`   总向量数: ${processedCount + result} 个`);
  console.log(`   耗时: ${duration} 秒`);
  console.log(`${'='.repeat(50)}`);
}

main().catch(console.error);
