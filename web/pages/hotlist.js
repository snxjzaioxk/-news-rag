import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'

export default function Hotlist() {
  const [platforms, setPlatforms] = useState([])
  const [selectedPlatform, setSelectedPlatform] = useState('all')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [hotlistData, setHotlistData] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'

  useEffect(() => {
    fetchPlatforms()
    fetchHotlist()
  }, [])

  useEffect(() => {
    fetchHotlist()
  }, [selectedPlatform, selectedCategory])

  const fetchPlatforms = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/hotlist/platforms`)
      const data = await res.json()
      setPlatforms(data.platforms || [])
    } catch (error) {
      console.error('获取平台列表失败:', error)
    }
  }

  const fetchHotlist = async () => {
    try {
      setLoading(true)
      let url = `${API_BASE}/api/hotlist?limit=20`
      if (selectedPlatform !== 'all') {
        url += `&platform=${selectedPlatform}`
      }
      if (selectedCategory !== 'all') {
        url += `&category=${selectedCategory}`
      }

      const res = await fetch(url)
      const data = await res.json()
      setHotlistData(data.platforms || [])
    } catch (error) {
      console.error('获取热榜失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async (type = 'hotlist') => {
    try {
      setRefreshing(true)
      const res = await fetch(`${API_BASE}/api/trigger/${type}`, {
        method: 'POST'
      })
      const data = await res.json()
      alert(data.message || '刷新任务已启动,请稍后查看')

      // 10秒后重新获取数据
      setTimeout(() => {
        fetchHotlist()
      }, 10000)
    } catch (error) {
      alert('刷新失败: ' + error.message)
    } finally {
      setRefreshing(false)
    }
  }

  const categories = ['all', 'tech', 'social', 'video', 'news', 'finance', 'entertainment', 'search']
  const categoryNames = {
    all: '全部',
    tech: '科技',
    social: '社交',
    video: '视频',
    news: '新闻',
    finance: '财经',
    entertainment: '娱乐',
    search: '搜索'
  }

  return (
    <>
      <Head>
        <title>多平台热榜 - 新闻热榜 RAG</title>
        <meta name="description" content="聚合知乎、微博、B站等多平台热榜" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* 导航栏 */}
        <nav className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              <div className="flex items-center">
                <h1 className="text-2xl font-bold text-blue-600">新闻热榜 RAG</h1>
              </div>
              <div className="flex space-x-4">
                <Link href="/" className="text-gray-700 hover:text-blue-600 px-3 py-2">
                  首页
                </Link>
                <Link href="/hotlist" className="text-blue-600 font-semibold px-3 py-2">
                  热榜
                </Link>
                <Link href="/search" className="text-gray-700 hover:text-blue-600 px-3 py-2">
                  智能搜索
                </Link>
                <Link href="/articles" className="text-gray-700 hover:text-blue-600 px-3 py-2">
                  文章列表
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* 主内容 */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* 标题和操作栏 */}
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">多平台热榜</h2>
              <p className="mt-2 text-gray-600">聚合 {platforms.length} 个平台的实时热点</p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => handleRefresh('hotlist')}
                disabled={refreshing}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {refreshing ? '刷新中...' : '🔄 刷新热榜'}
              </button>
              <button
                onClick={() => handleRefresh('ingest')}
                disabled={refreshing}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                完整更新
              </button>
            </div>
          </div>

          {/* 分类过滤 */}
          <div className="mb-6 bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">分类筛选</h3>
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    selectedCategory === cat
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {categoryNames[cat]}
                </button>
              ))}
            </div>
          </div>

          {/* 平台选择 */}
          <div className="mb-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <button
              onClick={() => setSelectedPlatform('all')}
              className={`p-3 rounded-lg font-medium transition ${
                selectedPlatform === 'all'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-50 shadow'
              }`}
            >
              全部平台
            </button>
            {platforms.map(platform => (
              <button
                key={platform.platform}
                onClick={() => setSelectedPlatform(platform.platform)}
                className={`p-3 rounded-lg font-medium transition ${
                  selectedPlatform === platform.platform
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-gray-50 shadow'
                }`}
              >
                <div className="text-sm">{platform.name}</div>
                <div className="text-xs opacity-75">{platform.count} 条</div>
              </button>
            ))}
          </div>

          {/* 热榜内容 */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">加载中...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {hotlistData.map(platformData => (
                <PlatformHotlist key={platformData.platform} data={platformData} />
              ))}
            </div>
          )}
        </main>

        {/* 页脚 */}
        <footer className="bg-white border-t mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <p className="text-center text-gray-500 text-sm">
              新闻热榜 RAG - Powered by AI & RSSHub
            </p>
          </div>
        </footer>
      </div>
    </>
  )
}

function PlatformHotlist({ data }) {
  const categoryColors = {
    tech: 'border-blue-500',
    social: 'border-purple-500',
    video: 'border-red-500',
    news: 'border-gray-500',
    finance: 'border-green-500',
    entertainment: 'border-pink-500',
    search: 'border-yellow-500'
  }

  const categoryBg = {
    tech: 'bg-blue-50',
    social: 'bg-purple-50',
    video: 'bg-red-50',
    news: 'bg-gray-50',
    finance: 'bg-green-50',
    entertainment: 'bg-pink-50',
    search: 'bg-yellow-50'
  }

  return (
    <div className={`bg-white rounded-lg shadow-md overflow-hidden border-l-4 ${categoryColors[data.category] || 'border-gray-500'}`}>
      <div className={`px-6 py-4 ${categoryBg[data.category] || 'bg-gray-50'}`}>
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-gray-900">{data.name}</h3>
            <p className="text-sm text-gray-600 mt-1">
              {data.category} • {data.count} 条 • 更新于 {new Date(data.updatedAt).toLocaleString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      </div>
      <div className="divide-y divide-gray-100">
        {data.items.map((item, index) => (
          <HotlistItem key={item.id} item={item} index={index + 1} />
        ))}
      </div>
    </div>
  )
}

function HotlistItem({ item, index }) {
  const getIndexColor = (index) => {
    if (index <= 3) return 'bg-red-500 text-white'
    if (index <= 10) return 'bg-orange-500 text-white'
    return 'bg-gray-300 text-gray-700'
  }

  return (
    <div className="px-6 py-4 hover:bg-gray-50 transition">
      <div className="flex items-start space-x-4">
        <span className={`flex-shrink-0 inline-flex items-center justify-center w-8 h-8 rounded font-bold text-sm ${getIndexColor(index)}`}>
          {index}
        </span>
        <div className="flex-1 min-w-0">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-base font-medium text-gray-900 hover:text-blue-600 line-clamp-2"
          >
            {item.title}
          </a>
          {item.description && (
            <p className="mt-1 text-sm text-gray-500 line-clamp-1">{item.description}</p>
          )}
        </div>
      </div>
    </div>
  )
}
