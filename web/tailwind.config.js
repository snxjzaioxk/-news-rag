/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  safelist: [
    // 确保动态生成的样式类被包含
    {
      pattern: /bg-(blue|green|red|yellow|purple|pink|gray|orange|cyan|indigo)-(50|100|500|600|700|800)/,
      variants: ['hover'],
    },
    {
      pattern: /text-(blue|green|red|yellow|purple|pink|gray|orange|cyan|indigo)-(50|100|500|600|700|800)/,
      variants: ['hover'],
    },
    {
      pattern: /border-(blue|green|red|yellow|purple|pink|gray|orange|indigo|transparent)-(100|200|300|500)/,
      variants: ['hover'],
    },
    // 常用工具类
    'min-h-screen',
    'backdrop-blur-md',
    'backdrop-blur-sm',
    'card-hover',
    'gradient-text',
    'nav-link',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}

