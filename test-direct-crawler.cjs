const DirectAPICrawler = require('./ingest/direct-crawler.js').default;

async function testDirectCrawler() {
    const crawler = new DirectAPICrawler();
    try {
        await crawler.crawlAll();
        const resultFile = crawler.saveResults();
        console.log(`✅ 直接API爬取完成！结果保存到: ${resultFile}`);
    } catch (error) {
        console.error('❌ 爬取失败:', error);
    }
}

testDirectCrawler();