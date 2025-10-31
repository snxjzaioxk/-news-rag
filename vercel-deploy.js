// Vercel 部署前验证脚本
const fs = require('fs');
const path = require('path');

console.log('🚀 开始 Vercel 部署前验证...');

// 1. 检查必要文件
const requiredFiles = [
  'package.json',
  'next.config.js',
  'tailwind.config.js',
  'postcss.config.js',
  'styles/globals.css',
  'pages/_app.js',
  'pages/_document.js'
];

for (const file of requiredFiles) {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ 缺少必要文件: ${file}`);
    process.exit(1);
  }
  console.log(`✅ ${file} 存在`);
}

// 2. 检查 CSS 文件
const cssPath = path.join(__dirname, 'styles', 'globals.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');
if (!cssContent.includes('@tailwind')) {
  console.error('❌ globals.css 缺少 Tailwind CSS 指令');
  process.exit(1);
}
console.log('✅ globals.css 包含 Tailwind CSS 指令');

// 3. 检查依赖
const packageJsonPath = path.join(__dirname, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const requiredDeps = ['tailwindcss', 'autoprefixer', 'postcss'];

for (const dep of requiredDeps) {
  if (!packageJson.dependencies[dep] && !packageJson.devDependencies[dep]) {
    console.error(`❌ 缺少依赖: ${dep}`);
    process.exit(1);
  }
  console.log(`✅ ${dep} 已安装`);
}

console.log('✅ 所有检查通过！可以开始部署。');