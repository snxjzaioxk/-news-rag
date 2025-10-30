import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'

export default function Home() {
  const [hotlist, setHotlist] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || (typeof window !== 'undefined' ? '' : 'http://localhost:3005')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      // 同时获取传统热榜和直接API热榜
      const [hotlistRes, directRes] = await Promise.allSettled([
        fetch(`${API_BASE}/api/hotlist?limit=10`),
        fetch(`${API_BASE}/api/direct-hotlist?limit=10`)
      ])

      let allHotlistItems = []

      // 处理传统热榜数据
      if (hotlistRes.status === 'fulfilled') {
        const hotlistData = await hotlistRes.value.json()
        if (hotlistData.platforms && hotlistData.platforms.length > 0) {
          hotlistData.platforms.forEach(platform => {
            if (platform.items && platform.items.length > 0) {
              allHotlistItems = allHotlistItems.concat(
                platform.items.slice(0, 3).map(item => ({
                  ...item,
                  source: platform.name,
                  category: platform.category,
                  platform: platform.platform,
                  sourceType: 'rsshub'
                }))
              )
            }
          })
        }
      } else {
        console.warn('获取传统热榜失败:', hotlistRes.reason)
      }

      // 处理直接API热榜数据
      if (directRes.status === 'fulfilled') {
        const directData = await directRes.value.json()
        if (directData.platforms && directData.platforms.length > 0) {
          directData.platforms.forEach(platform => {
            if (platform.items && platform.items.length > 0) {
              allHotlistItems = allHotlistItems.concat(
                platform.items.slice(0, 3).map(item => ({
                  ...item,
                  source: platform.name,
                  category: platform.category,
                  platform: platform.platform,
                  sourceType: 'direct'
                }))
              )
            }
          })
        }
      } else {
        console.warn('获取直接API热榜失败:', directRes.reason)
      }

      // 按热度排序并取前20条
      allHotlistItems.sort((a, b) => (b.hotIndex || 0) - (a.hotIndex || 0))
      setHotlist(allHotlistItems.slice(0, 20))

      // 获取统计
      try {
        const statsRes = await fetch(`${API_BASE}/api/stats`)
        if (statsRes.ok) {
          const statsData = await statsRes.json()
          setStats(statsData)
        } else {
          console.warn('统计信息获取失败，但不影响主要功能')
        }
      } catch (statsError) {
        console.warn('统计信息获取失败:', statsError)
      }
    } catch (error) {
      console.error('获取数据失败:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Head>
        <title>新闻热榜 RAG - 首页</title>
        <meta name="description" content="AI驱动的新闻热榜与智能问答" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen">
        {/* 导航栏 */}
        <nav className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              <div className="flex items-center">
                <h1 className="text-2xl font-bold gradient-text">新闻热榜 RAG</h1>
              </div>
              <div className="flex space-x-2">
                <Link href="/" className="nav-link bg-blue-50">
                  首页
                </Link>
                <Link href="/hotlist" className="nav-link">
                  热榜
                </Link>
                <Link href="/search" className="nav-link">
                  智能搜索
                </Link>
                <Link href="/articles" className="nav-link">
                  文章列表
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* 主内容 */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* 统计信息 */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <StatCard title="总文章数" value={stats.stats?.articles || 0} icon="📄" />
              <StatCard title="文本片段" value={stats.stats?.chunks || 0} icon="📝" />
              <StatCard title="向量数量" value={stats.stats?.vectors || 0} icon="🔢" />
              <StatCard title="数据源" value={Object.keys(stats.sources || {}).length} icon="🌐" />
            </div>
          )}

          {/* 热榜 */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-6 card-hover">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">今日热榜 🔥</h2>
              <span className="text-sm text-gray-500 bg-green-100 px-3 py-1 rounded-full">实时更新</span>
            </div>

            {error ? (
              <div className="text-center py-12">
                <div className="text-red-500 mb-4">
                  <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <p className="text-lg font-semibold">加载失败</p>
                  <p className="text-sm mt-2">{error}</p>
                </div>
                <button
                  onClick={fetchData}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                >
                  重试
                </button>
              </div>
            ) : loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-gray-600">加载中...</p>
              </div>
            ) : hotlist.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                  </svg>
                  <p className="text-lg font-semibold">暂无数据</p>
                  <p className="text-sm mt-2">当前没有热榜数据</p>
                </div>
                <button
                  onClick={fetchData}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                >
                  刷新
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {hotlist.map((article, index) => (
                  <ArticleCard key={article.id} article={article} index={index + 1} />
                ))}
                <div className="text-center pt-4">
                  <Link
                    href="/hotlist"
                    className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
                  >
                    查看更多热榜 →
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* 智能搜索入口 */}
          <div className="mt-8 bg-gradient-to-r from-blue-600 via-blue-500 to-purple-600 rounded-xl shadow-2xl p-8 text-white card-hover">
            <h2 className="text-3xl font-bold mb-4">AI智能问答 ✨</h2>
            <p className="text-lg mb-6 text-blue-50">基于RAG技术,智能检索新闻内容并生成准确回答</p>
            <Link
              href="/search"
              className="inline-block bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
            >
              立即体验 →
            </Link>
          </div>
        </main>

        {/* 页脚 */}
        <footer className="bg-white/50 backdrop-blur-sm border-t mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <p className="text-center text-gray-600 text-sm">
              新闻热榜 RAG - Powered by AI ⚡ | 数据更新时间: {stats?.timestamp ? new Date(stats.timestamp).toLocaleString('zh-CN') : '未知'}
            </p>
          </div>
        </footer>
      </div>
    </>
  )
}

function StatCard({ title, value, icon }) {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md p-6 card-hover border border-blue-100">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-2">{title}</h3>
          <p className="text-3xl font-bold text-gray-900">{value.toLocaleString()}</p>
        </div>
        <div className="text-4xl">{icon}</div>
      </div>
    </div>
  )
}

function ArticleCard({ article, index }) {
  const categoryColors = {
    tech: 'bg-blue-100 text-blue-800',
    finance: 'bg-green-100 text-green-800',
    sports: 'bg-red-100 text-red-800',
    entertainment: 'bg-purple-100 text-purple-800',
    politics: 'bg-gray-100 text-gray-800',
    health: 'bg-pink-100 text-pink-800',
    general: 'bg-yellow-100 text-yellow-800',
    social: 'bg-orange-100 text-orange-800',
    video: 'bg-red-100 text-red-800',
    news: 'bg-indigo-100 text-indigo-800',
    international: 'bg-cyan-100 text-cyan-800',
    search: 'bg-purple-100 text-purple-800',
  }

  const getSourceTypeBadge = (sourceType) => {
    if (sourceType === 'direct') {
      return <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-semibold">API</span>
    } else {
      return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-semibold">RSS</span>
    }
  }

  return (
    <div className="flex items-start space-x-4 p-4 hover:bg-blue-50/50 rounded-xl transition-all duration-200 border border-transparent hover:border-blue-200">
      <div className="flex-shrink-0">
        <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 text-white font-bold shadow-md">
          {index}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-lg font-semibold text-gray-900 hover:text-blue-600 line-clamp-2 transition-colors"
        >
          {article.title}
        </a>
        <div className="mt-2 flex items-center flex-wrap gap-2 text-sm text-gray-500">
          <span className="font-medium">{article.source}</span>
          <span>•</span>
          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${categoryColors[article.category] || categoryColors.general}`}>
            {article.category}
          </span>
          {getSourceTypeBadge(article.sourceType)}
          {article.hotIndex && (
            <>
              <span>•</span>
              <span className="text-orange-600 font-semibold">🔥 {article.hotIndex}</span>
            </>
          )}
          <span>•</span>
          <span>{new Date(article.pubDate).toLocaleString('zh-CN')}</span>
        </div>
        {article.summary && (
          <p className="mt-2 text-sm text-gray-600 line-clamp-2">{article.summary}</p>
        )}
        {article.extra && article.extra.thumbnail && (
          <div className="mt-2">
            <img
              src={article.extra.thumbnail}
              alt="缩略图"
              className="w-24 h-16 object-cover rounded-lg shadow-sm"
              onError={(e) => e.target.style.display = 'none'}
            />
          </div>
        )}
      </div>
    </div>
  )
}
