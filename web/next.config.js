/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || '',
  },
  // 简化配置，确保 Vercel 正确处理 CSS
  compiler: {
    removeConsole: false, // 保留控制台输出以便调试
  },
}

module.exports = nextConfig
