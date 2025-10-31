// api/llm.js - LLM生成适配器

/**
 * 智谱AI (GLM) 生成
 */
async function generateWithGLM(prompt, options = {}) {
  const apiKey = process.env.GLM_API_KEY;
  const url = process.env.GLM_CHAT_URL || 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: options.model || 'glm-4',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 2000
    })
  });

  if (!response.ok) {
    throw new Error(`GLM generation failed: ${response.statusText}`);
  }

  const result = await response.json();
  return result.choices[0].message.content;
}

/**
 * 硅基流动生成
 */
async function generateWithSiliconFlow(prompt, options = {}) {
  const apiKey = process.env.SILICONFLOW_API_KEY;
  const url = process.env.SILICONFLOW_CHAT_URL || 'https://api.siliconflow.cn/v1/chat/completions';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: options.model || 'Qwen/Qwen2.5-14B-Instruct',  // 千问2.5 14B - 最佳平衡
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 2000
    })
  });

  if (!response.ok) {
    throw new Error(`SiliconFlow generation failed: ${response.statusText}`);
  }

  const result = await response.json();
  return result.choices[0].message.content;
}

/**
 * OpenAI生成
 */
async function generateWithOpenAI(prompt, options = {}) {
  const apiKey = process.env.OPENAI_API_KEY;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: options.model || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 2000
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI generation failed: ${response.statusText}`);
  }

  const result = await response.json();
  return result.choices[0].message.content;
}

/**
 * 自动选择可用的LLM服务
 */
export async function generateText(prompt, options = {}) {
  // 优先级: 硅基流动 > GLM > OpenAI (硅基流动稳定性更好,无并发限制)
  const strategies = [
    { name: 'SiliconFlow', fn: generateWithSiliconFlow, check: () => !!process.env.SILICONFLOW_API_KEY },
    { name: 'GLM', fn: generateWithGLM, check: () => !!process.env.GLM_API_KEY },
    { name: 'OpenAI', fn: generateWithOpenAI, check: () => !!process.env.OPENAI_API_KEY }
  ];

  for (const strategy of strategies) {
    if (strategy.check()) {
      try {
        console.log(`使用 ${strategy.name} 生成回答...`);
        return await strategy.fn(prompt, options);
      } catch (error) {
        console.warn(`${strategy.name} 失败:`, error.message);
      }
    }
  }

  throw new Error('没有可用的LLM服务');
}
