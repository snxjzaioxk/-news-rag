// api/query.js - RAG查询处理
import { querySimilar } from '../ingest/embed_upsert.js';
import { generateText } from './llm.js';

/**
 * 构建RAG提示词
 */
function buildRAGPrompt(query, contexts) {
  const contextText = contexts
    .map((ctx, i) => `[${i + 1}] 来源: ${ctx.metadata.title}\n内容: ${ctx.metadata.text}`)
    .join('\n\n');

  return `你是一个专业的新闻助手。请基于以下新闻内容回答用户的问题。

【新闻资料】
${contextText}

【用户问题】
${query}

【回答要求】
1. 只基于提供的新闻资料回答,不要编造信息
2. 如果资料中没有相关信息,请明确说明
3. 回答要准确、简洁、有条理
4. 如果涉及多条新闻,请分别说明来源
5. 用中文回答

请开始回答:`;
}

/**
 * 处理RAG查询
 */
export async function handleRAGQuery(query, options = {}) {
  const { topK = 5, includeContext = false } = options;

  try {
    // 1. 查询相似文本
    console.log(`查询: ${query}`);
    const similarChunks = await querySimilar(query, topK);

    if (similarChunks.length === 0) {
      return {
        answer: '抱歉,没有找到相关的新闻内容。',
        sources: [],
        contexts: []
      };
    }

    console.log(`找到 ${similarChunks.length} 个相关片段`);

    // 2. 构建提示词
    const prompt = buildRAGPrompt(query, similarChunks);

    // 3. 调用LLM生成回答
    const answer = await generateText(prompt);

    // 4. 整理来源信息
    const sources = Array.from(
      new Map(
        similarChunks.map(chunk => [
          chunk.metadata.url,
          {
            title: chunk.metadata.title,
            url: chunk.metadata.url,
            source: chunk.metadata.source,
            category: chunk.metadata.category,
            pubDate: chunk.metadata.pubDate
          }
        ])
      ).values()
    );

    const result = {
      answer,
      sources,
      query,
      timestamp: new Date().toISOString()
    };

    // 可选:返回上下文(用于调试)
    if (includeContext) {
      result.contexts = similarChunks.map(c => ({
        text: c.metadata.text,
        score: c.score,
        ...c.metadata
      }));
    }

    return result;
  } catch (error) {
    console.error('RAG查询失败:', error);
    throw error;
  }
}

/**
 * 生成热榜摘要
 */
export async function generateHotlistSummary(articles, topN = 10) {
  const topArticles = articles.slice(0, topN);

  const prompt = `请为以下${topN}条热门新闻生成一份简短的摘要报告:

${topArticles.map((a, i) => `${i + 1}. ${a.title} (${a.source})`).join('\n')}

要求:
1. 总结主要新闻趋势和热点话题
2. 按类别归纳
3. 简洁明了,不超过300字

请生成摘要:`;

  try {
    const summary = await generateText(prompt, { maxTokens: 500 });
    return {
      summary,
      articles: topArticles.map(a => ({
        title: a.title,
        source: a.source,
        category: a.category,
        url: a.url
      })),
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('生成摘要失败:', error);
    throw error;
  }
}
