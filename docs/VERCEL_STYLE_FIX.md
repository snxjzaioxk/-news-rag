# Vercel 部署样式丢失问题修复指南

## 问题症状
- ✅ 本地开发 (`npm run dev`) 样式正常
- ✅ 本地构建 (`npm run build`) 样式正常
- ❌ Vercel 部署后样式丢失

## 原因分析

本地构建时 CSS 文件正常生成:
```
css/8ab38a8432b66c32.css  4.54 kB
```

这说明 Tailwind CSS 配置完全正确,问题出在 Vercel 的项目设置上。

## 解决方案

### 方法 1: 修改 Vercel 项目设置 (推荐)

1. **登录 Vercel Dashboard**
   访问: https://vercel.com/dashboard

2. **进入项目设置**
   - 选择你的项目
   - 点击 `Settings` 标签

3. **修改 Root Directory**
   - 找到 `Root Directory` 设置
   - 确保设置为: `web`
   - **不要**留空或设置为 `.`

4. **检查构建设置**
   Build Command 应该是:
   ```
   npm run build
   ```

   Output Directory 应该是:
   ```
   .next
   ```

   Install Command 应该是:
   ```
   npm install
   ```

5. **重新部署**
   - 点击 `Deployments` 标签
   - 点击最新部署右侧的 `...` 菜单
   - 选择 `Redeploy`

### 方法 2: 使用 vercel.json 配置

如果方法 1 不生效,在 **根目录** (不是 web 目录) 创建 `vercel.json`:

```json
{
  "buildCommand": "cd web && npm install && npm run build",
  "outputDirectory": "web/.next",
  "installCommand": "cd web && npm install",
  "framework": "nextjs"
}
```

### 方法 3: 检查环境变量

确保 Vercel 项目中设置了所有必需的环境变量:

**必需变量:**
- `NODE_ENV` = `production`
- `SILICONFLOW_API_KEY` = `sk-你的密钥`

**可选变量:**
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

### 方法 4: 检查 .vercelignore

确保 `web/.vercelignore` 文件存在且正确:

```
node_modules
.next
.env*.local
*.log
.DS_Store
```

## 验证步骤

### 1. 检查构建日志

在 Vercel Dashboard 的 Deployments 页面:
- 点击最新部署
- 查看 Build Logs
- 确认看到类似输出:

```
✓ Generating static pages (6/6)
✓ Collecting build traces
✓ Finalizing page optimization

Route (pages)                              Size     First Load JS
...
+ First Load JS shared by all              82.4 kB
  ...
  └ css/8ab38a8432b66c32.css               4.54 kB  ← 确认 CSS 生成
```

### 2. 检查浏览器开发者工具

部署后访问网站:
1. 按 F12 打开开发者工具
2. 切换到 Network 标签
3. 刷新页面
4. 查找 CSS 文件请求:
   - 应该看到 `/_next/static/css/xxx.css`
   - 状态应该是 `200 OK`
   - 如果是 `404 Not Found`,说明路径问题

### 3. 检查 HTML 源代码

在浏览器中右键 → 查看网页源代码:
- 应该能看到类似这样的 link 标签:
  ```html
  <link rel="stylesheet" href="/_next/static/css/8ab38a8432b66c32.css">
  ```

## 常见错误排查

### 错误 1: Root Directory 设置错误

**症状:** CSS 文件 404
**原因:** Vercel 从错误的目录开始构建
**解决:** 确保 Root Directory = `web`

### 错误 2: package.json 不在根目录

**症状:** 构建失败,找不到 package.json
**原因:** Vercel 在根目录找不到 package.json
**解决:** Root Directory 必须设置为 `web`

### 错误 3: 依赖安装失败

**症状:** 构建时提示缺少 tailwindcss
**原因:** devDependencies 未安装
**解决:** 检查 web/package.json 包含:
```json
{
  "devDependencies": {
    "autoprefixer": "^10",
    "postcss": "^8",
    "tailwindcss": "^3"
  }
}
```

### 错误 4: CSS 文件被 CDN 缓存

**症状:** 修复后样式仍然不显示
**原因:** Vercel CDN 缓存了旧文件
**解决:**
1. 强制刷新浏览器 (Ctrl + F5)
2. 或清除浏览器缓存

## 项目结构确认

确保你的项目结构是这样的:

```
.
├── web/                    ← Vercel Root Directory 指向这里
│   ├── pages/
│   │   ├── _app.js        ← 导入 globals.css
│   │   ├── _document.js   ← HTML 结构
│   │   └── index.js
│   ├── styles/
│   │   └── globals.css    ← Tailwind 指令
│   ├── package.json       ← 包含 next, tailwindcss
│   ├── next.config.js
│   ├── tailwind.config.js ← content 配置
│   ├── postcss.config.js  ← tailwindcss 插件
│   └── .vercelignore
├── api/                    (本地开发用)
├── config/
├── docs/
└── package.json            (monorepo 根)
```

## 快速诊断命令

在本地运行这些命令确认一切正常:

```bash
# 清理构建缓存
cd web
rm -rf .next node_modules

# 重新安装依赖
npm install

# 生产构建
npm run build

# 检查 CSS 文件
ls -lh .next/static/css/

# 应该看到类似:
# -rw-r--r-- 1 user group 4.5K xxx.css
```

## 最终检查清单

部署前确认:
- [ ] `web/package.json` 包含 tailwindcss 在 devDependencies
- [ ] `web/tailwind.config.js` content 配置正确
- [ ] `web/postcss.config.js` 包含 tailwindcss 插件
- [ ] `web/styles/globals.css` 包含 @tailwind 指令
- [ ] `web/pages/_app.js` 导入了 globals.css
- [ ] 本地 `npm run build` 成功且生成 CSS
- [ ] Vercel Root Directory = `web`
- [ ] Vercel Build Command = `npm run build`
- [ ] Vercel Output Directory = `.next`

## 如果仍然不行

1. **删除 Vercel 项目重新创建**
   - 在 Vercel Dashboard 删除项目
   - 重新导入 GitHub 仓库
   - 设置 Root Directory = `web`
   - 重新部署

2. **查看详细构建日志**
   - Vercel Dashboard → Deployments → 最新部署
   - 展开所有日志输出
   - 查找任何关于 CSS 或 Tailwind 的错误

3. **联系 Vercel 支持**
   - 如果以上方法都不行
   - 访问 https://vercel.com/support
   - 提供构建日志截图

## 本地测试生产构建

在推送到 Vercel 前,先本地测试:

```bash
cd web

# 生产构建
npm run build

# 启动生产服务器
npm start

# 访问 http://localhost:3000
# 检查样式是否正常
```

如果本地生产构建样式正常,那么问题100%是 Vercel 配置问题。

## 推荐操作顺序

1. ✅ 确认本地构建正常
2. ✅ 推送代码到 GitHub
3. ✅ 在 Vercel 设置 Root Directory = `web`
4. ✅ 触发重新部署
5. ✅ 检查构建日志中的 CSS 文件
6. ✅ 访问网站并检查 Network 标签
7. ✅ 强制刷新浏览器

## 总结

样式丢失的根本原因几乎总是 **Vercel Root Directory 设置错误**。

本项目的正确配置:
- Root Directory: `web`
- Framework Preset: Next.js (自动检测)
- Build Command: `npm run build`
- Output Directory: `.next`
- Install Command: `npm install`

设置正确后,Vercel 会:
1. 进入 `web/` 目录
2. 运行 `npm install` (会安装 tailwindcss)
3. 运行 `npm run build` (会生成 CSS)
4. 部署 `.next` 目录

一切就会正常工作! 🎉
