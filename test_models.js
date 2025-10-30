// test_models.js
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

async function testModel(modelName) {
  const apiKey = process.env.GLM_API_KEY;
  const url = 'https://open.bigmodel.cn/api/paas/v4/embeddings';

  console.log(`\n测试模型: ${modelName}`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: modelName,
        input: '测试文本'
      })
    });

    console.log('状态:', response.status, response.statusText);
    const result = await response.text();

    if (response.ok) {
      console.log('✅ 成功!');
      const json = JSON.parse(result);
      console.log('向量维度:', json.data?.[0]?.embedding?.length);
    } else {
      console.log('❌ 失败:', result);
    }

  } catch (error) {
    console.log('❌ 错误:', error.message);
  }
}

async function main() {
  console.log('GLM Embedding 模型测试');
  console.log('='.repeat(50));

  // 测试不同的模型名称
  await testModel('embedding-2');
  await new Promise(r => setTimeout(r, 2000));

  await testModel('embedding-3');
  await new Promise(r => setTimeout(r, 2000));

  await testModel('text-embedding-2');
  await new Promise(r => setTimeout(r, 2000));

  // 测试查询账户信息的接口
  console.log('\n\n查询账户信息:');
  try {
    const apiKey = process.env.GLM_API_KEY;
    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/billing/subscription', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    console.log('账户接口状态:', response.status);
    const info = await response.text();
    console.log('账户信息:', info);
  } catch (e) {
    console.log('无法获取账户信息');
  }
}

main();
