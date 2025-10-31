/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // 确保在生产环境中正确处理 CSS
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  webpack: (config, { isServer }) => {
    // 确保 CSS 正确处理
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      }
    }

    // 确保 PostCSS 插件正确加载
    config.module.rules.forEach((rule) => {
      if (rule.test && rule.test.test && rule.test.test('.css')) {
        rule.use = rule.use || []
        rule.use.forEach((use) => {
          if (use.loader && use.loader.includes('postcss-loader')) {
            use.options = use.options || {}
            use.options.postcssOptions = use.options.postcssOptions || {}
            use.options.postcssOptions.plugins = [
              'tailwindcss',
              'autoprefixer',
            ]
          }
        })
      }
    })

    return config
  },
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || '',
  },
  // 确保 CSS 文件正确处理
  experimental: {
    esmExternals: false,
  },
}

module.exports = nextConfig
