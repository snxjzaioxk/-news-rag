// check-quota.js - 检查硅基流动API额度使用情况
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const API_KEY = process.env.SILICONFLOW_API_KEY;

async function checkQuota() {
  console.log('========================================');
  console.log('硅基流动 API 额度检查');
  console.log('========================================\n');

  if (!API_KEY) {
    console.error('❌ 未找到 SILICONFLOW_API_KEY');
    return;
  }

  console.log(`API Key: ${API_KEY.substring(0, 20)}...`);

  try {
    // 尝试调用一次简单的API来检查状态
    const response = await fetch('https://api.siliconflow.cn/v1/models', {
      headers: {
        'Authorization': `Bearer ${API_KEY}`
      }
    });

    if (response.ok) {
      console.log('✅ API Key 有效且可用\n');

      // 检查响应头中的额度信息(如果有)
      const headers = response.headers;
      console.log('响应头信息:');

      // 常见的额度相关header
      const quotaHeaders = [
        'x-ratelimit-limit',
        'x-ratelimit-remaining',
        'x-ratelimit-reset',
        'x-quota-remaining',
        'x-quota-limit'
      ];

      let foundQuotaInfo = false;
      quotaHeaders.forEach(header => {
        const value = headers.get(header);
        if (value) {
          console.log(`  ${header}: ${value}`);
          foundQuotaInfo = true;
        }
      });

      if (!foundQuotaInfo) {
        console.log('  (未在响应头中找到额度信息)');
      }

      console.log('\n💡 提示:');
      console.log('1. 完整的额度信息请访问: https://siliconflow.cn/dashboard');
      console.log('2. 当前使用: Qwen2.5-14B-Instruct (付费模型)');
      console.log('3. 注册赠送: 2000万 Tokens (约10万次查询)');
      console.log('4. 免费备选: Qwen2.5-7B-Instruct (完全免费)');

      console.log('\n📊 当前项目使用情况:');
      console.log('- Embedding: BAAI/bge-large-zh-v1.5 (免费)');
      console.log('- LLM生成: Qwen2.5-14B-Instruct (消耗额度)');
      console.log('- 已生成向量: 54个 (免费)');
      console.log('- AI查询次数: 以实际使用为准');

    } else {
      console.error(`❌ API 响应异常: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error(`错误详情: ${errorText}`);
    }

  } catch (error) {
    console.error('❌ 检查失败:', error.message);
  }

  console.log('\n========================================');
  console.log('切换到免费模型的方法:');
  console.log('========================================');
  console.log('编辑文件: api/llm.js');
  console.log('找到第52行,修改为:');
  console.log("  model: 'Qwen/Qwen2.5-7B-Instruct'  // 免费模型");
  console.log('\n然后重启API服务即可!');
  console.log('========================================\n');
}

checkQuota();
