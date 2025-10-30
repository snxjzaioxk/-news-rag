// ingest/main.js - 主入口脚本
import dotenv from 'dotenv';
import { crawlOnce } from './crawler.js';
import { crawlHotlistOnce, mergeHotlistToArticles } from './hotlist-crawler.js';
import { processArticles } from './cleaner.js';
import { chunkArticles } from './chunker.js';
import { embedAndUpsert } from './embed_upsert.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载环境变量
dotenv.config();

/**
 * 完整的入库流程
 */
async function main() {
  console.log('========================================');
  console.log('    新闻RAG系统 - 数据入库流程');
  console.log('========================================');
  console.log(`开始时间: ${new Date().toISOString()}\n`);

  try {
    // 步骤1a: 爬取普通新闻
    console.log('[1a/5] 爬取普通新闻...');
    const articles = await crawlOnce();
    console.log(`✓ 获取 ${articles.length} 篇文章`);

    // 步骤1b: 爬取热榜
    console.log('\n[1b/5] 爬取热榜...');
    const { hotlists, stats } = await crawlHotlistOnce();
    console.log(`✓ 获取 ${stats.totalPlatforms} 个平台, ${stats.totalItems} 条热榜`);

    // 步骤1c: 合并数据
    console.log('\n[1c/5] 合并热榜与文章...');
    const mergedArticles = await mergeHotlistToArticles();
    const finalArticles = mergedArticles || articles;
    console.log(`✓ 合并后共 ${finalArticles.length} 条`);

    if (finalArticles.length === 0) {
      console.log('没有抓取到任何数据,退出');
      return;
    }

    // 步骤2: 清洗和分类
    console.log('\n[2/5] 清洗和分类...');
    const processedArticles = processArticles(finalArticles);

    // 保存处理后的文章
    const processedPath = path.join(__dirname, '../data/processed-articles.json');
    await fs.writeFile(processedPath, JSON.stringify(processedArticles, null, 2));
    console.log(`已保存处理后的文章到: ${processedPath}`);

    // 步骤3: 切片
    console.log('\n[3/5] 文本切片...');
    const chunks = chunkArticles(processedArticles, {
      strategy: 'sentence',
      maxChars: 1000,
      minChars: 200
    });

    // 保存切片
    const chunksPath = path.join(__dirname, '../data/chunks.json');
    await fs.writeFile(chunksPath, JSON.stringify(chunks, null, 2));
    console.log(`已保存切片到: ${chunksPath}`);

    // 步骤4: 生成向量并上传
    console.log('\n[4/5] 生成向量并上传...');
    const uploaded = await embedAndUpsert(chunks, 10);

    console.log('\n[5/5] 生成统计报告...');

    // 生成摘要报告
    const report = {
      timestamp: new Date().toISOString(),
      stats: {
        articles: articles.length,
        hotlists: stats?.totalItems || 0,
        total: finalArticles.length,
        processed: processedArticles.length,
        chunks: chunks.length,
        vectors: uploaded
      },
      hotlistPlatforms: stats?.platforms || [],
      categories: {},
      sources: {}
    };

    // 统计分类
    processedArticles.forEach(a => {
      report.categories[a.category] = (report.categories[a.category] || 0) + 1;
      report.sources[a.source] = (report.sources[a.source] || 0) + 1;
    });

    const reportPath = path.join(__dirname, '../data/report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    console.log('\n========================================');
    console.log('            入库完成统计');
    console.log('========================================');
    console.log(`普通文章: ${articles.length}`);
    console.log(`热榜条目: ${stats?.totalItems || 0}`);
    console.log(`合并总数: ${finalArticles.length}`);
    console.log(`处理后: ${processedArticles.length}`);
    console.log(`切片数: ${chunks.length}`);
    console.log(`上传向量: ${uploaded}`);
    console.log(`完成时间: ${new Date().toISOString()}`);
    console.log('========================================');
    console.log(`\n✓ 报告已保存到: ${reportPath}`);

  } catch (error) {
    console.error('\n❌ 入库失败:', error);
    throw error;
  }
}

// 运行
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main()
    .then(() => {
      console.log('\n✓ 所有任务完成');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n✗ 发生错误:', error);
      process.exit(1);
    });
}

export { main };
