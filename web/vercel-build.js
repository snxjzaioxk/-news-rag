#!/usr/bin/env node

// Vercel 构建脚本
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 开始 Vercel 构建...');

try {
  // 1. 清理之前的构建
  console.log('📦 清理之前的构建...');
  if (fs.existsSync('.next')) {
    fs.rmSync('.next', { recursive: true, force: true });
  }

  // 2. 检查依赖
  console.log('📋 检查 Tailwind CSS 依赖...');
  try {
    require('tailwindcss');
    console.log('✅ Tailwind CSS 已安装');
  } catch (e) {
    console.error('❌ Tailwind CSS 未安装');
    process.exit(1);
  }

  // 3. 运行构建
  console.log('🔨 构建 Next.js 应用...');
  execSync('npx next build', { stdio: 'inherit' });

  // 4. 验证 CSS 文件
  console.log('✅ 验证 CSS 文件...');
  const cssDir = path.join('.next', 'static', 'css');
  if (fs.existsSync(cssDir)) {
    const cssFiles = fs.readdirSync(cssDir).filter(f => f.endsWith('.css'));
    if (cssFiles.length > 0) {
      const cssFile = path.join(cssDir, cssFiles[0]);
      const stats = fs.statSync(cssFile);
      console.log(`✅ CSS 文件生成成功: ${cssFiles[0]} (${(stats.size / 1024).toFixed(1)} KB)`);

      if (stats.size < 1000) {
        console.warn('⚠️  CSS 文件过小，可能 Tailwind 未正确编译');
      }
    } else {
      console.error('❌ 未找到 CSS 文件');
      process.exit(1);
    }
  } else {
    console.error('❌ CSS 目录不存在');
    process.exit(1);
  }

  console.log('✅ Vercel 构建完成！');
} catch (error) {
  console.error('❌ 构建失败:', error.message);
  process.exit(1);
}