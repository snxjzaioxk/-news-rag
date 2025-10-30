// ingest/crawlers/utils/rate-limiter.js

/**
 * 请求限流器
 * 基于滑动窗口算法,控制API调用频率
 */
export class RateLimiter {
  constructor(options = {}) {
    this.requests = [];
    this.limit = options.limit || 60; // 每分钟60个请求
    this.window = options.window || 60000; // 1分钟窗口
  }

  /**
   * 检查是否可以发起请求
   */
  async acquire() {
    const now = Date.now();

    // 清理过期的请求记录
    this.requests = this.requests.filter(time => now - time < this.window);

    // 如果达到限制,等待
    if (this.requests.length >= this.limit) {
      const oldestRequest = this.requests[0];
      const waitTime = this.window - (now - oldestRequest);

      if (waitTime > 0) {
        console.log(`  [限流] 等待 ${(waitTime / 1000).toFixed(1)}秒...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    // 记录请求
    this.requests.push(Date.now());
  }

  /**
   * 获取状态
   */
  getStatus() {
    const now = Date.now();
    const recent = this.requests.filter(time => now - time < this.window);

    return {
      current: recent.length,
      limit: this.limit,
      available: Math.max(0, this.limit - recent.length)
    };
  }
}
