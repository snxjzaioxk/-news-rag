export default function StyleTest() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 gradient-text">
          样式测试页面
        </h1>

        {/* 基础颜色测试 */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">基础颜色测试</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-100 text-blue-800 p-4 rounded-lg text-center font-semibold">
              Blue 100
            </div>
            <div className="bg-green-100 text-green-800 p-4 rounded-lg text-center font-semibold">
              Green 100
            </div>
            <div className="bg-red-100 text-red-800 p-4 rounded-lg text-center font-semibold">
              Red 100
            </div>
            <div className="bg-purple-100 text-purple-800 p-4 rounded-lg text-center font-semibold">
              Purple 100
            </div>
          </div>
        </div>

        {/* 渐变测试 */}
        <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-purple-600 rounded-xl p-8 text-white mb-6">
          <h2 className="text-3xl font-bold mb-2">渐变背景测试</h2>
          <p className="text-lg">如果你看到蓝色到紫色的渐变,说明样式正常加载</p>
        </div>

        {/* 交互测试 */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">交互效果测试</h2>
          <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-all duration-300 shadow-md hover:shadow-xl">
            悬停查看效果
          </button>
        </div>

        {/* 自定义类测试 */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 card-hover">
          <h2 className="text-2xl font-bold mb-4">自定义类测试 (card-hover)</h2>
          <p className="text-gray-600">悬停此卡片查看 card-hover 效果</p>
        </div>

        {/* 半透明测试 */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">半透明 + 背景模糊测试</h2>
          <p className="text-gray-600">背景应该是半透明的白色并带有模糊效果</p>
        </div>

        {/* 诊断信息 */}
        <div className="bg-gray-100 rounded-xl p-6">
          <h2 className="text-2xl font-bold mb-4">诊断信息</h2>
          <div className="space-y-2 text-sm font-mono">
            <p>✅ 如果看到各种颜色和效果,样式加载正常</p>
            <p>❌ 如果只看到黑白文字,样式加载失败</p>
            <p className="mt-4 text-gray-600">
              请在浏览器开发者工具 (F12) 的 Network 标签查找 CSS 文件
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
