// ingest/direct-crawlers.js - 直接爬取各平台热榜(不依赖 RSSHub)
import * as cheerio from 'cheerio';

/**
 * 知乎热榜 - 官方 API(无需登录)
 */
export async function fetchZhihuHot() {
  try {
    // 方法1: 尝试官方 API
    let res = await fetch('https://www.zhihu.com/api/v3/feed/topstory/hot-lists/total?limit=50', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.zhihu.com/hot'
      }
    });

    // 如果失败,尝试备用 API
    if (!res.ok) {
      res = await fetch('https://api.vvhan.com/api/hotlist/zhihuHot', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      if (!data.success || !data.data) throw new Error('数据格式错误');

      return data.data.slice(0, 50).map((item, index) => ({
        id: String(item.index),
        title: item.title,
        url: item.url,
        hotIndex: index + 1,
        description: item.desc || '',
        pubDate: new Date().toISOString(),
        source: '知乎热榜',
        platform: 'zhihu',
        category: 'social'
      }));
    }

    const data = await res.json();
    return data.data.map((item, index) => ({
      id: String(item.target.id),
      title: item.target.title,
      url: `https://www.zhihu.com/question/${item.target.id}`,
      hotIndex: index + 1,
      description: item.target.excerpt || '',
      pubDate: new Date(item.target.created * 1000).toISOString(),
      source: '知乎热榜',
      platform: 'zhihu',
      category: 'social'
    }));
  } catch (error) {
    console.error('知乎热榜抓取失败:', error.message);
    return [];
  }
}

/**
 * 微博热搜 - 官方 API(无需登录)
 */
export async function fetchWeiboHot() {
  try {
    const res = await fetch('https://weibo.com/ajax/side/hotSearch', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://weibo.com'
      }
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();

    if (!data.data?.realtime) {
      throw new Error('数据格式错误');
    }

    return data.data.realtime.slice(0, 50).map((item, index) => ({
      id: item.word,
      title: item.word,
      url: `https://s.weibo.com/weibo?q=${encodeURIComponent(item.word)}`,
      hotIndex: index + 1,
      description: item.note || '',
      pubDate: new Date().toISOString(),
      source: '微博热搜',
      platform: 'weibo',
      category: 'social'
    }));
  } catch (error) {
    console.error('微博热搜抓取失败:', error.message);
    return [];
  }
}

/**
 * 百度热搜 - 官方 API(无需登录)
 */
export async function fetchBaiduHot() {
  try {
    const res = await fetch('https://top.baidu.com/api/board?platform=wise&tab=realtime', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();

    if (!data.data?.cards?.[0]?.content) {
      throw new Error('数据格式错误');
    }

    return data.data.cards[0].content.slice(0, 50).map((item, index) => ({
      id: item.query,
      title: item.query,
      url: item.url || `https://www.baidu.com/s?wd=${encodeURIComponent(item.query)}`,
      hotIndex: index + 1,
      description: item.desc || '',
      pubDate: new Date().toISOString(),
      source: '百度热搜',
      platform: 'baidu',
      category: 'search'
    }));
  } catch (error) {
    console.error('百度热搜抓取失败:', error.message);
    return [];
  }
}

/**
 * 抖音热榜 - 网页抓取
 */
export async function fetchDouyinHot() {
  try {
    const res = await fetch('https://www.iesdouyin.com/web/api/v2/hotsearch/billboard/word/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.douyin.com/'
      }
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();

    if (!data.word_list) {
      throw new Error('数据格式错误');
    }

    return data.word_list.slice(0, 50).map((item, index) => ({
      id: item.word,
      title: item.word,
      url: `https://www.douyin.com/search/${encodeURIComponent(item.word)}`,
      hotIndex: index + 1,
      description: '',
      pubDate: new Date().toISOString(),
      source: '抖音热榜',
      platform: 'douyin',
      category: 'video'
    }));
  } catch (error) {
    console.error('抖音热榜抓取失败:', error.message);
    return [];
  }
}

/**
 * B站热门 - 官方 API(无需登录)
 */
export async function fetchBilibiliHot() {
  try {
    const res = await fetch('https://api.bilibili.com/x/web-interface/popular?ps=50&pn=1', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.bilibili.com'
      }
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();

    if (data.code !== 0 || !data.data?.list) {
      throw new Error('数据格式错误');
    }

    return data.data.list.map((item, index) => ({
      id: String(item.aid),
      title: item.title,
      url: `https://www.bilibili.com/video/${item.bvid}`,
      hotIndex: index + 1,
      description: item.desc || '',
      pubDate: new Date(item.pubdate * 1000).toISOString(),
      source: 'B站热门',
      platform: 'bilibili',
      category: 'video'
    }));
  } catch (error) {
    console.error('B站热门抓取失败:', error.message);
    return [];
  }
}

/**
 * GitHub Trending - 使用第三方聚合 API
 */
export async function fetchGithubTrending() {
  try {
    // 方法1: 使用 GitHub API (无需 token)
    const res = await fetch('https://api.github.com/search/repositories?q=created:>2024-01-01&sort=stars&order=desc&per_page=25', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();

    if (!data.items) throw new Error('数据格式错误');

    return data.items.map((item, index) => ({
      id: item.html_url,
      title: `${item.full_name}`,
      url: item.html_url,
      hotIndex: index + 1,
      description: item.description || '',
      pubDate: new Date().toISOString(),
      source: 'GitHub Trending',
      platform: 'github',
      category: 'tech'
    }));
  } catch (error) {
    console.error('GitHub Trending 抓取失败:', error.message);
    return [];
  }
}

/**
 * 今日头条热榜 - 网页抓取
 */
export async function fetchToutiaoHot() {
  try {
    const res = await fetch('https://www.toutiao.com/hot-event/hot-board/?origin=toutiao_pc', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();

    if (!data.data) {
      throw new Error('数据格式错误');
    }

    return data.data.slice(0, 50).map((item, index) => ({
      id: item.ClusterId,
      title: item.Title,
      url: item.Url || `https://www.toutiao.com/search/?keyword=${encodeURIComponent(item.Title)}`,
      hotIndex: index + 1,
      description: item.Abstract || '',
      pubDate: new Date().toISOString(),
      source: '今日头条',
      platform: 'toutiao',
      category: 'news'
    }));
  } catch (error) {
    console.error('今日头条抓取失败:', error.message);
    return [];
  }
}

/**
 * 36氪热榜 - 使用官方 API
 */
export async function fetch36krHot() {
  try {
    const res = await fetch('https://36kr.com/api/search-column/mainsite/hot-list', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://36kr.com/'
      }
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();

    if (!data.data || !data.data.hotListData) {
      throw new Error('数据格式错误');
    }

    return data.data.hotListData.slice(0, 30).map((item, index) => ({
      id: String(item.itemId),
      title: item.templateMaterial.widgetTitle,
      url: `https://36kr.com/p/${item.itemId}`,
      hotIndex: index + 1,
      description: item.templateMaterial.widgetSummary || '',
      pubDate: new Date().toISOString(),
      source: '36氪热榜',
      platform: '36kr',
      category: 'tech'
    }));
  } catch (error) {
    console.error('36氪热榜抓取失败:', error.message);
    return [];
  }
}

// 导出所有爬虫
export const directCrawlers = {
  zhihu: fetchZhihuHot,
  weibo: fetchWeiboHot,
  baidu: fetchBaiduHot,
  douyin: fetchDouyinHot,
  bilibili: fetchBilibiliHot,
  github: fetchGithubTrending,
  toutiao: fetchToutiaoHot,
  '36kr': fetch36krHot
};
