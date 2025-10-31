# Vercel 部署指南 - 新闻热榜 RAG

## 🚨 重要：Root Directory 配置

你的 Next.js 项目位于 `web/` 子目录中，需要在 Vercel 中正确配置。

### 方法 1：自动配置（推荐）
已配置 `vercel.json` 文件，Vercel 会自动读取：
```json
{
  "framework": "nextjs",
  "rootDirectory": "web",
  "buildCommand": "cd web && npm run build:vercel",
  "outputDirectory": "web/.next",
  "installCommand": "cd web && npm install"
}
```

### 方法 2：手动配置（如果自动配置不工作）
1. 进入 Vercel 项目设置
2. 找到 "General" → "Root Directory"
3. 设置为：`web`
4. 保存设置

## 📋 部署前检查清单

- [x] CSS 文件大小正常（1.4MB+）
- [x] Tailwind CSS 正确编译
- [x] 所有页面构建成功
- [x] 环境变量已配置

## 🌐 环境变量配置

在 Vercel 项目设置中添加：
- `NEXT_PUBLIC_API_BASE_URL` (可选)
- `SILICONFLOW_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

## 🔄 重新部署步骤

1. 提交代码：
   ```bash
   git add .
   git commit -m "fix: 修复 Vercel Root Directory 配置，确保正确部署 web 目录"
   git push origin main
   ```

2. Vercel 会自动重新部署

3. 部署完成后检查：
   - CSS 样式是否正常显示
   - 页面是否能正常加载
   - API 是否能正常工作

## 🐛 故障排除

如果样式仍然丢失：

1. 检查 Vercel Function Logs 查看构建日志
2. 确认 Root Directory 设置为 `web`
3. 检查环境变量是否正确
4. 手动触发重新部署

## 📊 预期结果

部署成功后应该看到：
- ✅ 渐变背景 (灰色→蓝色→紫色)
- ✅ 半透明导航栏
- ✅ 卡片阴影和悬停效果
- ✅ 响应式布局
- ✅ 动画效果