/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  // 确保静态资源正确处理
  assetPrefix: process.env.NODE_ENV === 'production' ? undefined : '',
  // 优化生产构建
  productionBrowserSourceMaps: false,
  // 环境变量
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || '',
  },
  // 确保正确处理 CSS
  experimental: {
    optimizeCss: false, // 禁用 CSS 优化以避免潜在问题
  },
}

module.exports = nextConfig
