// test_glm.js - 测试GLM API
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

async function testGLM() {
  const apiKey = process.env.GLM_API_KEY;
  const url = process.env.GLM_EMBED_URL;

  console.log('测试GLM Embedding API...');
  console.log('API Key:', apiKey ? apiKey.slice(0, 20) + '...' : '未配置');
  console.log('URL:', url);
  console.log('');

  const testTexts = ['这是一个测试文本', '这是第二个测试'];

  try {
    console.log('发送请求...');
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'embedding-2',
        input: testTexts
      })
    });

    console.log('响应状态:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('错误详情:', errorText);
      return;
    }

    const result = await response.json();
    console.log('✅ 成功!');
    console.log('返回向量数:', result.data?.length);
    console.log('向量维度:', result.data?.[0]?.embedding?.length);
    console.log('完整响应:', JSON.stringify(result, null, 2).slice(0, 500));

  } catch (error) {
    console.error('❌ 请求失败:', error.message);
  }
}

testGLM();
