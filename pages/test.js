import Head from 'next/head'

export default function TestPage() {
  return (
    <>
      <Head>
        <title>样式测试页面</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 p-8">
        {/* 导航栏 */}
        <nav className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50 mb-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              <h1 className="text-2xl font-bold gradient-text">新闻热榜 RAG - 测试</h1>
            </div>
          </div>
        </nav>

        {/* 测试内容 */}
        <main className="max-w-4xl mx-auto">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-6 card-hover mb-6">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">🎨 样式测试成功！</h2>
            <p className="text-lg text-gray-600 mb-6">
              如果你看到这个页面有漂亮的样式，说明 Vercel 部署问题已经解决！
            </p>

            {/* 按钮测试 */}
            <div className="flex flex-wrap gap-4 mb-6">
              <button className="btn-primary">主要按钮</button>
              <button className="nav-link bg-blue-50">导航链接</button>
              <button className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors">
                绿色按钮
              </button>
            </div>

            {/* 颜色卡片测试 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-100 text-blue-800 p-4 rounded-lg text-center font-semibold">
                蓝色卡片
              </div>
              <div className="bg-green-100 text-green-800 p-4 rounded-lg text-center font-semibold">
                绿色卡片
              </div>
              <div className="bg-red-100 text-red-800 p-4 rounded-lg text-center font-semibold">
                红色卡片
              </div>
              <div className="bg-purple-100 text-purple-800 p-4 rounded-lg text-center font-semibold">
                紫色卡片
              </div>
            </div>
          </div>

          {/* 渐变卡片测试 */}
          <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-purple-600 rounded-xl shadow-2xl p-8 text-white card-hover">
            <h2 className="text-3xl font-bold mb-4">✨ 渐变背景测试</h2>
            <p className="text-lg mb-6">
              这个卡片应该有美丽的蓝紫渐变背景和白色文字
            </p>
            <div className="flex items-center gap-4">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              <span>旋转动画测试</span>
            </div>
          </div>
        </main>
      </div>
    </>
  )
}