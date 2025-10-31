// ingest/chunker.js

/**
 * 按固定字数切分文本
 * @param {string} text - 要切分的文本
 * @param {number} maxWords - 每块最大字数
 * @param {number} overlap - 重叠字数
 * @returns {Array<string>} 文本块数组
 */
export function chunkByWords(text, maxWords = 300, overlap = 50) {
  if (!text) return [];

  // 按空格和标点分词
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const chunks = [];

  for (let i = 0; i < words.length; i += (maxWords - overlap)) {
    const chunk = words.slice(i, i + maxWords).join(' ');
    if (chunk.trim().length > 0) {
      chunks.push(chunk);
    }
  }

  return chunks;
}

/**
 * 按句子切分文本(更智能)
 * @param {string} text - 要切分的文本
 * @param {number} maxChars - 每块最大字符数
 * @param {number} minChars - 每块最小字符数
 * @returns {Array<string>} 文本块数组
 */
export function chunkBySentences(text, maxChars = 1000, minChars = 200) {
  if (!text) return [];

  // 按句子分割(支持中英文句号)
  const sentences = text
    .split(/([。.!?!?;;\n]+)/)
    .filter(s => s.trim().length > 0);

  const chunks = [];
  let currentChunk = '';

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];

    // 如果当前块加上新句子不超过最大长度
    if (currentChunk.length + sentence.length <= maxChars) {
      currentChunk += sentence;
    } else {
      // 保存当前块(如果达到最小长度)
      if (currentChunk.length >= minChars) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        // 否则继续累加
        currentChunk += sentence;
      }
    }
  }

  // 添加最后一块
  if (currentChunk.trim().length >= minChars) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * 按段落切分文本
 * @param {string} text - 要切分的文本
 * @param {number} maxChars - 每块最大字符数
 * @returns {Array<string>} 文本块数组
 */
export function chunkByParagraphs(text, maxChars = 1500) {
  if (!text) return [];

  const paragraphs = text
    .split(/\n\n+/)
    .filter(p => p.trim().length > 0);

  const chunks = [];
  let currentChunk = '';

  for (const para of paragraphs) {
    if (currentChunk.length + para.length <= maxChars) {
      currentChunk += para + '\n\n';
    } else {
      if (currentChunk.trim().length > 0) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = para + '\n\n';
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * 智能切分(综合策略)
 * @param {string} text - 要切分的文本
 * @param {object} options - 配置选项
 * @returns {Array<string>} 文本块数组
 */
export function chunkText(text, options = {}) {
  const {
    strategy = 'sentence',  // 'word' | 'sentence' | 'paragraph'
    maxChars = 1000,
    minChars = 200,
    maxWords = 300,
    overlap = 50
  } = options;

  if (!text) return [];

  switch (strategy) {
    case 'word':
      return chunkByWords(text, maxWords, overlap);
    case 'paragraph':
      return chunkByParagraphs(text, maxChars);
    case 'sentence':
    default:
      return chunkBySentences(text, maxChars, minChars);
  }
}

/**
 * 为文章生成带元数据的切片
 * @param {object} article - 文章对象
 * @param {object} options - 切片选项
 * @returns {Array<object>} 切片对象数组
 */
export function chunkArticle(article, options = {}) {
  const chunks = chunkText(article.text, options);

  return chunks.map((chunk, index) => ({
    id: `${article.id}-chunk-${index}`,
    articleId: article.id,
    chunkIndex: index,
    text: chunk,
    metadata: {
      source: article.source,
      category: article.category,
      title: article.title,
      url: article.url,
      pubDate: article.pubDate,
      keywords: article.keywords || [],
      totalChunks: chunks.length
    }
  }));
}

/**
 * 批量处理文章切片
 * @param {Array<object>} articles - 文章数组
 * @param {object} options - 切片选项
 * @returns {Array<object>} 所有切片对象数组
 */
export function chunkArticles(articles, options = {}) {
  console.log(`正在切片 ${articles.length} 篇文章...`);

  const allChunks = [];

  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];

    if (i % 10 === 0) {
      console.log(`  进度: ${i}/${articles.length}`);
    }

    const chunks = chunkArticle(article, options);
    allChunks.push(...chunks);
  }

  console.log(`切片完成,共 ${allChunks.length} 个文本块`);
  return allChunks;
}

/**
 * 计算文本统计信息
 * @param {string} text - 文本
 * @returns {object} 统计信息
 */
export function getTextStats(text) {
  return {
    chars: text.length,
    words: text.split(/\s+/).length,
    sentences: text.split(/[。.!?!?]/).length,
    paragraphs: text.split(/\n\n+/).length
  };
}
