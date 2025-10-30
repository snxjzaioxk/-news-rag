// ingest/crawlers/utils/retry.js

/**
 * 重试工具
 * 提供带指数退避的重试机制
 */
export class RetryHelper {
  constructor(options = {}) {
    this.maxAttempts = options.maxAttempts || 3;
    this.initialDelay = options.initialDelay || 1000;
    this.maxDelay = options.maxDelay || 10000;
    this.backoffFactor = options.backoffFactor || 2;
  }

  /**
   * 执行带重试的函数
   * @param {Function} fn - 要执行的异步函数
   * @param {Object} options - 选项
   * @returns {Promise} 执行结果
   */
  async execute(fn, options = {}) {
    const maxAttempts = options.maxAttempts || this.maxAttempts;
    const onRetry = options.onRetry || (() => {});

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (attempt === maxAttempts) {
          throw error;
        }

        const delay = this.calculateDelay(attempt);
        onRetry(attempt, maxAttempts, delay, error);

        await this.sleep(delay);
      }
    }
  }

  /**
   * 计算延迟时间 (指数退避)
   */
  calculateDelay(attempt) {
    const delay = this.initialDelay * Math.pow(this.backoffFactor, attempt - 1);
    return Math.min(delay, this.maxDelay);
  }

  /**
   * 休眠
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 导出默认实例
export const retryHelper = new RetryHelper();
