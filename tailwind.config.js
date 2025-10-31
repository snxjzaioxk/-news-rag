/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './styles/**/*.{css,scss}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  safelist: [
    // 确保所有动态生成的样式类被包含
    // 背景颜色 - 所有级别
    {
      pattern: /bg-(blue|green|red|yellow|purple|pink|gray|orange|cyan|indigo)-(50|100|200|300|400|500|600|700|800|900)/,
      variants: ['hover', 'focus', 'active'],
    },
    // 文字颜色 - 所有级别
    {
      pattern: /text-(blue|green|red|yellow|purple|pink|gray|orange|cyan|indigo|white)-(50|100|200|300|400|500|600|700|800|900)/,
      variants: ['hover', 'focus', 'active'],
    },
    // 边框颜色 - 所有级别
    {
      pattern: /border-(blue|green|red|yellow|purple|pink|gray|orange|indigo|transparent)-(50|100|200|300|400|500|600|700|800|900)/,
      variants: ['hover', 'focus'],
    },
    // 常用工具类
    'min-h-screen',
    'backdrop-blur-md',
    'backdrop-blur-sm',
    'card-hover',
    'gradient-text',
    'nav-link',
    'line-clamp-1',
    'line-clamp-2',
    'animate-spin',
    'shadow-md',
    'shadow-lg',
    'shadow-xl',
    'rounded-full',
    'rounded-lg',
    'rounded-xl',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}

