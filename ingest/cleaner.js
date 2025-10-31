// ingest/cleaner.js

// 文本清洗
export function cleanText(text) {
  if (!text) return '';

  return text
    .replace(/\s+/g, ' ')           // 多个空格合并
    .replace(/\n+/g, '\n')           // 多个换行合并
    .replace(/[^\S\n]+/g, ' ')       // 清理特殊空白字符
    .trim();
}

// 分类关键词库
const CATEGORY_KEYWORDS = {
  tech: {
    keywords: [
      'AI', '人工智能', '机器学习', '深度学习', '神经网络',
      '科技', '软件', '硬件', '芯片', '半导体', '互联网',
      '算法', '编程', '开发', '云计算', '大数据',
      'ChatGPT', 'OpenAI', '自动驾驶', '机器人',
      '5G', '6G', '物联网', 'IoT', '区块链', '加密货币',
      'iPhone', 'Android', '苹果', '华为', '小米',
      '字节跳动', '腾讯', '阿里巴巴', '百度', '美团'
    ],
    weight: 1
  },
  finance: {
    keywords: [
      '股票', '基金', '证券', '投资', '理财',
      '经济', '金融', '市场', '交易', '债券',
      '人民币', '美元', '汇率', '通货膨胀',
      '美联储', '央行', '利率', '货币政策',
      'GDP', '经济增长', '失业率', '消费',
      '房地产', '楼市', '房价', '地产',
      '创业', '融资', 'IPO', '上市'
    ],
    weight: 1
  },
  sports: {
    keywords: [
      '足球', '篮球', '体育', '运动', '比赛',
      '奥运', '世界杯', 'NBA', 'CBA',
      '网球', '羽毛球', '乒乓球', '游泳',
      '马拉松', '健身', '冠军', '金牌',
      '梅西', 'C罗', '詹姆斯', '姚明'
    ],
    weight: 1
  },
  entertainment: {
    keywords: [
      '娱乐', '电影', '电视剧', '综艺', '明星',
      '演员', '导演', '音乐', '歌手', '演唱会',
      '票房', '首映', '上映', '播出',
      '奥斯卡', '金像奖', '金鸡奖',
      '网红', '直播', '短视频', '抖音', 'B站'
    ],
    weight: 1
  },
  politics: {
    keywords: [
      '政治', '政府', '国家', '外交', '国际',
      '总统', '主席', '总理', '议会', '国会',
      '选举', '投票', '政策', '法律', '法规',
      '联合国', '中美', '中欧', '俄乌',
      '台湾', '香港', '新疆', '西藏'
    ],
    weight: 1
  },
  health: {
    keywords: [
      '健康', '医疗', '医院', '医生', '疾病',
      '药品', '疫苗', '病毒', '疫情', '新冠',
      '癌症', '心脏病', '糖尿病', '高血压',
      '中医', '西医', '保健', '养生',
      'WHO', '卫生', '食品安全'
    ],
    weight: 1
  },
  education: {
    keywords: [
      '教育', '学校', '大学', '高考', '考研',
      '学生', '老师', '教授', '学习', '培训',
      '课程', '专业', '招生', '毕业',
      '在线教育', '网课', '双减', '留学'
    ],
    weight: 1
  },
  science: {
    keywords: [
      '科学', '研究', '实验', '发现', '论文',
      '太空', '航天', '火箭', '卫星', '探测器',
      '物理', '化学', '生物', '天文', '地质',
      'NASA', '中科院', '诺贝尔', '量子',
      '基因', 'DNA', '进化', '气候', '环保'
    ],
    weight: 1
  },
  auto: {
    keywords: [
      '汽车', '新能源', '电动车', '特斯拉',
      '比亚迪', '蔚来', '小鹏', '理想',
      '自动驾驶', '智能驾驶', '车展',
      '燃油', '充电', '电池', '续航'
    ],
    weight: 1
  },
  general: {
    keywords: [],
    weight: 0.5
  }
};

// 简单的关键词分类器
export function classify(text, title = '') {
  if (!text && !title) return 'general';

  // 组合标题和正文的前2000字进行分类
  const content = ((title || '') + ' ' + (text || '')).slice(0, 2000).toLowerCase();

  const scores = {};

  // 计算每个分类的得分
  for (const [category, config] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;

    for (const keyword of config.keywords) {
      const lowerKeyword = keyword.toLowerCase();
      // 计算关键词出现次数
      const regex = new RegExp(lowerKeyword, 'gi');
      const matches = content.match(regex);
      if (matches) {
        score += matches.length * config.weight;
      }
    }

    scores[category] = score;
  }

  // 找到最高分的分类
  const sortedScores = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [bestCategory, bestScore] = sortedScores[0];

  // 如果最高分为0或过低,返回general
  return bestScore > 0 ? bestCategory : 'general';
}

// 提取关键词(简单实现)
export function extractKeywords(text, topN = 5) {
  if (!text) return [];

  // 简单的词频统计(这里可以用更复杂的TF-IDF)
  const words = text
    .toLowerCase()
    .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1);

  const freq = {};
  for (const word of words) {
    freq[word] = (freq[word] || 0) + 1;
  }

  // 排序并返回top N
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([word]) => word);
}

// 生成摘要(简单截取前N个句子)
export function generateSummary(text, maxSentences = 3) {
  if (!text) return '';

  // 简单按句号分割
  const sentences = text
    .split(/[。.!?!?]\s*/)
    .filter(s => s.trim().length > 10)
    .slice(0, maxSentences);

  return sentences.join('。') + '。';
}

// 处理单篇文章
export function processArticle(article) {
  return {
    ...article,
    text: cleanText(article.text),
    cleanTitle: cleanText(article.title),
    category: classify(article.text, article.title),
    keywords: extractKeywords(article.text),
    summary: generateSummary(article.text),
    processedAt: new Date().toISOString()
  };
}

// 批量处理文章
export function processArticles(articles) {
  console.log(`正在处理 ${articles.length} 篇文章...`);

  const processed = articles.map((article, index) => {
    if (index % 10 === 0) {
      console.log(`  进度: ${index}/${articles.length}`);
    }
    return processArticle(article);
  });

  console.log('文章处理完成');
  return processed;
}
