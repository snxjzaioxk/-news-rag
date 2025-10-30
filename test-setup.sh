#!/bin/bash
# 测试脚本 - 验证 Upstash Redis + GitHub Actions + Vercel 配置

echo "🧪 开始测试配置..."
echo ""

# 从用户获取必要信息
read -p "请输入 Vercel 项目 URL (例: https://your-app.vercel.app): " VERCEL_URL
read -sp "请输入 CRAWL_TOKEN: " CRAWL_TOKEN
echo ""
echo ""

# 1. 测试 API 健康检查
echo "1️⃣ 测试 Vercel API 健康检查..."
curl -fsS "$VERCEL_URL/api/hello" && echo "✅ API 可访问" || echo "❌ API 不可访问"
echo ""

# 2. 测试身份验证（应该失败）
echo "2️⃣ 测试身份验证 (无 token)..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$VERCEL_URL/api/crawl-hotlist")
if [ "$HTTP_CODE" = "401" ]; then
  echo "✅ 身份验证正常 (返回 401)"
else
  echo "⚠️  返回状态码: $HTTP_CODE"
fi
echo ""

# 3. 测试爬取端点（带 token）
echo "3️⃣ 触发热榜爬取..."
curl -X GET \
  -H "Authorization: Bearer $CRAWL_TOKEN" \
  -H "Content-Type: application/json" \
  "$VERCEL_URL/api/crawl-hotlist" \
  && echo "✅ 爬取触发成功" || echo "❌ 爬取触发失败"
echo ""
echo ""

# 4. 等待执行完成
echo "⏳ 等待 10 秒后检查结果..."
sleep 10

# 5. 测试读取端点
echo "4️⃣ 测试读取热榜数据..."
curl -fsS "$VERCEL_URL/api/hotlist-latest" | jq '.ok, .hotlists | length' \
  && echo "✅ 数据读取成功" || echo "⚠️  暂无数据或读取失败"
echo ""

echo ""
echo "🎉 测试完成！"
echo ""
echo "📝 下一步："
echo "1. 前往 GitHub Actions 手动触发 workflow"
echo "2. 查看 Vercel Functions 日志"
echo "3. 在 Upstash 控制台检查 Redis 数据"
