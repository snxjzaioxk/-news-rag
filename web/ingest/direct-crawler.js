import fetch from 'node-fetch';
import { XMLParser } from 'fast-xml-parser';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';
import crypto from 'crypto';

const config = JSON.parse(readFileSync('./config/sources.json', 'utf8'));

class DirectAPICrawler {
    constructor() {
        this.results = [];
        this.cacheDir = path.join('./data', 'cache');
        this.ensureCacheDir();
    }

    ensureCacheDir() {
        if (!existsSync(this.cacheDir)) {
            mkdirSync(this.cacheDir, { recursive: true });
        }
    }

    getCacheKey(url) {
        return crypto.createHash('md5').update(url).digest('hex');
    }

    getCachedData(cacheKey, ttl = 5 * 60 * 1000) { // 5分钟缓存
        const cacheFile = path.join(this.cacheDir, `${cacheKey}.json`);
        try {
            if (existsSync(cacheFile)) {
                const data = JSON.parse(readFileSync(cacheFile, 'utf8'));
                if (Date.now() - data.timestamp < ttl) {
                    return data.content;
                }
            }
        } catch (error) {
            console.warn(`读取缓存失败 ${cacheKey}:`, error.message);
        }
        return null;
    }

    setCachedData(cacheKey, content) {
        const cacheFile = path.join(this.cacheDir, `${cacheKey}.json`);
        try {
            writeFileSync(cacheFile, JSON.stringify({
                timestamp: Date.now(),
                content
            }));
        } catch (error) {
            console.warn(`写入缓存失败 ${cacheKey}:`, error.message);
        }
    }

    async fetchDirectAPI(source) {
        const cacheKey = this.getCacheKey(source.url);
        const cached = this.getCachedData(cacheKey);
        if (cached) {
            console.log(`  ✓ ${source.name} (缓存)`);
            return cached;
        }

        try {
            const options = {
                method: source.method || 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'application/json, application/rss+xml, application/xml, text/xml',
                    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1',
                    ...source.headers
                },
                timeout: 30000
            };

            const response = await fetch(source.url, options);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            let data;
            const contentType = response.headers.get('content-type');

            if (contentType && contentType.includes('xml')) {
                // 处理RSS/XML响应
                const text = await response.text();
                const parser = new XMLParser();
                data = parser.parse(text);
            } else {
                // 处理JSON响应
                data = await response.json();
            }

            // 根据data_path提取具体数据
            let extractedData = data;
            if (source.data_path) {
                extractedData = this.extractDataByPath(data, source.data_path);
            }

            const processedData = this.processDirectData(extractedData, source);
            this.setCachedData(cacheKey, processedData);

            console.log(`  ✓ ${source.name} - 获取 ${processedData.length || '多'} 条数据`);
            return processedData;

        } catch (error) {
            console.error(`  ✗ ${source.name} 失败:`, error.message);
            return [];
        }
    }

    extractDataByPath(data, path) {
        return path.split('.').reduce((obj, key) => obj && obj[key], data);
    }

    processDirectData(data, source) {
        if (!data) return [];

        // 根据不同的数据源类型处理数据
        switch (source.platform) {
            case 'zhihu':
                return this.processZhihuData(data);
            case 'bilibili':
                return this.processBilibiliData(data, source.name);
            case 'bilibili_search':
                return this.processBilibiliSearchData(data);
            case 'ithome_direct':
            case 'sspai_direct':
            case '36kr_direct':
            case 'huxiu_direct':
            case 'v2ex_direct':
                return this.processRSSData(data, source);
            default:
                return this.processGenericData(data, source);
        }
    }

    processZhihuData(data) {
        if (!Array.isArray(data)) return [];

        return data.map(item => ({
            id: item.id || this.generateId(),
            title: item.target?.title_area?.text || item.title,
            url: item.target?.link?.url || item.url,
            source: '知乎热榜',
            category: 'social',
            pubDate: new Date().toISOString(),
            summary: item.target?.excerpt_area?.text || '',
            hotIndex: item.hot_value || 0,
            extra: {
                icon: item.card_label?.night_icon,
                cardLabel: item.card_label?.text
            }
        }));
    }

    processBilibiliData(data, name) {
        if (!data || !Array.isArray(data)) return [];

        return data.map(item => ({
            id: item.bvid || this.generateId(),
            title: item.title,
            url: `https://www.bilibili.com/video/${item.bvid}`,
            source: name,
            category: 'video',
            pubDate: new Date(item.pubdate * 1000).toISOString(),
            summary: item.desc || '',
            hotIndex: item.stat?.view || 0,
            extra: {
                thumbnail: item.pic,
                duration: item.duration,
                owner: item.owner?.name,
                stats: {
                    view: item.stat?.view,
                    like: item.stat?.like,
                    danmaku: item.stat?.danmaku
                }
            }
        }));
    }

    processBilibiliSearchData(data) {
        if (!data || !Array.isArray(data)) return [];

        return data.map(item => ({
            id: item.keyword || this.generateId(),
            title: item.show_name,
            url: `https://search.bilibili.com/all?keyword=${encodeURIComponent(item.keyword)}`,
            source: 'B站热搜',
            category: 'video',
            pubDate: new Date().toISOString(),
            summary: '',
            hotIndex: item.hot || 0,
            extra: {
                icon: item.icon,
                keyword: item.keyword
            }
        }));
    }

    processRSSData(data, source) {
        if (!data.rss || !data.rss.channel || !data.rss.channel.item) return [];

        const items = Array.isArray(data.rss.channel.item) ? data.rss.channel.item : [data.rss.channel.item];

        return items.map(item => ({
            id: this.generateId(),
            title: item.title,
            url: item.link,
            source: source.name,
            category: source.category,
            pubDate: item.pubDate || new Date().toISOString(),
            summary: item.description || '',
            author: item['dc:creator'] || item.author,
            extra: {
                guid: item.guid,
                categories: item.category
            }
        }));
    }

    processGenericData(data, source) {
        if (Array.isArray(data)) {
            return data.map(item => ({
                id: item.id || this.generateId(),
                title: item.title || item.name,
                url: item.url || item.link,
                source: source.name,
                category: source.category,
                pubDate: item.pubDate || item.date || new Date().toISOString(),
                summary: item.description || item.summary || '',
                hotIndex: item.hot || item.rank || 0,
                extra: item
            }));
        } else if (data.items || data.articles || data.list) {
            const items = data.items || data.articles || data.list;
            return this.processGenericData(items, source);
        } else {
            // 单个数据项
            return [this.processGenericData([data], source)[0]];
        }
    }

    generateId() {
        return crypto.randomBytes(16).toString('hex');
    }

    async crawlAll() {
        console.log('========== 开始直接API爬取 ==========');
        console.log(`时间: ${new Date().toISOString()}`);
        console.log(`已加载 ${config.direct_apis?.length || 0} 个直接API源`);

        const enabledSources = config.direct_apis?.filter(source => source.enabled) || [];

        for (const source of enabledSources) {
            console.log(`正在抓取 ${source.name}...`);
            const results = await this.fetchDirectAPI(source);
            if (results && results.length > 0) {
                this.results.push({
                    platform: source.platform,
                    name: source.name,
                    category: source.category,
                    items: results,
                    count: results.length,
                    updatedAt: new Date().toISOString()
                });
            }
        }

        console.log(`\n直接API爬取完成，共处理 ${this.results.length} 个平台`);
        return this.results;
    }

    saveResults() {
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `direct-hotlist-${timestamp}.json`;
        const filepath = path.join('./data', filename);

        writeFileSync(filepath, JSON.stringify({
            timestamp: new Date().toISOString(),
            total: this.results.length,
            platforms: this.results,
            summary: {
                totalItems: this.results.reduce((sum, p) => sum + p.count, 0),
                categories: [...new Set(this.results.map(p => p.category))]
            }
        }, null, 2));

        // 更新最新文件
        const latestPath = path.join('./data', 'direct-hotlist-latest.json');
        writeFileSync(latestPath, JSON.stringify({
            timestamp: new Date().toISOString(),
            total: this.results.length,
            platforms: this.results
        }, null, 2));

        console.log(`结果已保存到: ${filename}`);
        return filepath;
    }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
    const crawler = new DirectAPICrawler();
    crawler.crawlAll()
        .then(() => {
            crawler.saveResults();
            console.log('✅ 直接API爬取完成');
        })
        .catch(error => {
            console.error('❌ 爬取失败:', error);
            process.exit(1);
        });
}

export default DirectAPICrawler;