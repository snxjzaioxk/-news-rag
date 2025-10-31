#!/bin/bash

echo "================================"
echo "🔍 Vercel 样式问题完整诊断脚本"
echo "================================"
echo ""

# 1. 检查项目结构
echo "📁 1. 检查项目结构..."
echo "---"
if [ -f "web/package.json" ]; then
  echo "✅ web/package.json 存在"
else
  echo "❌ web/package.json 不存在"
fi

if [ -f "web/tailwind.config.js" ]; then
  echo "✅ web/tailwind.config.js 存在"
else
  echo "❌ web/tailwind.config.js 不存在"
fi

if [ -f "web/postcss.config.js" ]; then
  echo "✅ web/postcss.config.js 存在"
else
  echo "❌ web/postcss.config.js 不存在"
fi

if [ -f "web/styles/globals.css" ]; then
  echo "✅ web/styles/globals.css 存在"
else
  echo "❌ web/styles/globals.css 不存在"
fi

if [ -f "web/pages/_app.js" ]; then
  echo "✅ web/pages/_app.js 存在"
else
  echo "❌ web/pages/_app.js 不存在"
fi

echo ""

# 2. 检查依赖
echo "📦 2. 检查 Tailwind CSS 依赖..."
echo "---"
cd web
if grep -q "tailwindcss" package.json; then
  echo "✅ tailwindcss 已安装"
  grep "tailwindcss" package.json | head -1
else
  echo "❌ tailwindcss 未安装"
fi

if grep -q "postcss" package.json; then
  echo "✅ postcss 已安装"
  grep "postcss" package.json | head -1
else
  echo "❌ postcss 未安装"
fi

if grep -q "autoprefixer" package.json; then
  echo "✅ autoprefixer 已安装"
  grep "autoprefixer" package.json | head -1
else
  echo "❌ autoprefixer 未安装"
fi

echo ""

# 3. 检查 _app.js 导入
echo "📝 3. 检查 _app.js 样式导入..."
echo "---"
if grep -q "import.*globals.css" pages/_app.js; then
  echo "✅ _app.js 导入了 globals.css"
  grep "import.*globals.css" pages/_app.js
else
  echo "❌ _app.js 没有导入 globals.css"
fi

echo ""

# 4. 检查 tailwind.config.js
echo "⚙️  4. 检查 tailwind.config.js 配置..."
echo "---"
if grep -q "content:" tailwind.config.js; then
  echo "✅ content 配置存在"
  grep -A 3 "content:" tailwind.config.js
else
  echo "❌ content 配置缺失"
fi

if grep -q "safelist:" tailwind.config.js; then
  echo "✅ safelist 配置存在 (保护动态类名)"
else
  echo "⚠️  safelist 配置缺失 (可能导致动态类名丢失)"
fi

echo ""

# 5. 清理并重新构建
echo "🔨 5. 清理并重新构建..."
echo "---"
echo "清理 .next 目录..."
rm -rf .next

echo "开始构建..."
npm run build 2>&1 | grep -E "(css/|Compiled|error|warning)" | tail -20

echo ""

# 6. 检查生成的 CSS
echo "📄 6. 检查生成的 CSS 文件..."
echo "---"
if [ -d ".next/static/css" ]; then
  echo "CSS 文件列表:"
  ls -lh .next/static/css/
  echo ""
  echo "CSS 文件大小:"
  du -h .next/static/css/*.css

  echo ""
  echo "检查 CSS 内容 (前 500 字符):"
  head -c 500 .next/static/css/*.css
  echo ""
  echo "..."

  # 检查是否包含关键的 Tailwind 类
  if grep -q "bg-blue-100" .next/static/css/*.css; then
    echo "✅ CSS 包含 bg-blue-100"
  else
    echo "❌ CSS 不包含 bg-blue-100 (动态类可能被删除)"
  fi

  if grep -q "text-red-800" .next/static/css/*.css; then
    echo "✅ CSS 包含 text-red-800"
  else
    echo "❌ CSS 不包含 text-red-800"
  fi

  if grep -q "gradient-text" .next/static/css/*.css; then
    echo "✅ CSS 包含自定义类 gradient-text"
  else
    echo "❌ CSS 不包含自定义类 gradient-text"
  fi

else
  echo "❌ .next/static/css 目录不存在"
fi

echo ""

# 7. 提供 Vercel 配置建议
echo "☁️  7. Vercel 配置检查清单"
echo "---"
echo "请在 Vercel Dashboard 确认以下设置:"
echo ""
echo "  项目设置 (Settings):"
echo "  ├─ Root Directory: web"
echo "  ├─ Framework Preset: Next.js"
echo "  ├─ Build Command: npm run build"
echo "  ├─ Output Directory: .next"
echo "  └─ Install Command: npm install"
echo ""
echo "  环境变量 (Environment Variables):"
echo "  ├─ NODE_ENV = production"
echo "  └─ (其他自定义变量)"
echo ""

# 8. 测试链接
echo "🌐 8. 本地测试"
echo "---"
echo "启动本地生产服务器: npm start"
echo "访问测试页面: http://localhost:3000/style-test"
echo ""

# 9. 总结
echo "================================"
echo "✅ 诊断完成"
echo "================================"
echo ""
echo "如果本地构建正常但 Vercel 样式丢失:"
echo "1. 检查 Vercel Root Directory 是否设置为 'web'"
echo "2. 重新部署项目"
echo "3. 清除浏览器缓存 (Ctrl + Shift + R)"
echo "4. 检查 Vercel 构建日志中的 CSS 文件大小"
echo ""
echo "预期 CSS 文件大小: 40-50 KB"
echo "如果只有 4-5 KB, 说明动态类名被删除了"
echo ""

cd ..
