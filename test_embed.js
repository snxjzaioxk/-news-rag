// test_embed.js - 测试小批量向量化
import dotenv from 'dotenv';
import fs from 'fs/promises';
import { embedAndUpsert } from './ingest/embed_upsert.js';

dotenv.config();

async function main() {
  console.log('开始测试向量化...\n');

  // 读取切片数据
  const data = await fs.readFile('data/chunks.json', 'utf-8');
  const allChunks = JSON.parse(data);

  // 只处理前15个 (5批次,每批3个)
  const testChunks = allChunks.slice(0, 15);

  console.log(`测试数据: ${testChunks.length} 个文本块`);
  console.log(`来源: ${testChunks.map(c => c.metadata.source).filter((v, i, a) => a.indexOf(v) === i).join(', ')}\n`);

  // 开始向量化
  const result = await embedAndUpsert(testChunks, 3);

  console.log(`\n完成! 成功处理: ${result} 个`);

  // 检查向量文件
  try {
    const vectorData = await fs.readFile('data/vectors.jsonl', 'utf-8');
    const lines = vectorData.trim().split('\n');
    console.log(`向量文件包含: ${lines.length} 条记录`);

    // 解析第一条看看
    const first = JSON.parse(lines[0]);
    console.log(`向量维度: ${first.values.length}`);
    console.log(`示例metadata:`, {
      title: first.metadata.title,
      source: first.metadata.source,
      category: first.metadata.category
    });
  } catch (e) {
    console.log('无法读取向量文件');
  }
}

main().catch(console.error);
