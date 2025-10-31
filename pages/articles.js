import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'

export default function Articles() {
  const [articles, setArticles] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || (typeof window !== 'undefined' ? '' : 'http://localhost:3005')
  const LIMIT = 20

  useEffect(() => {
    fetchCategories()
  }, [])

  useEffect(() => {
    fetchArticles()
  }, [selectedCategory, page])

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/categories`)
      const data = await res.json()
      setCategories(data.categories || [])
    } catch (error) {
      console.error('获取分类失败:', error)
    }
  }

  const fetchArticles = async () => {
    try {
      setLoading(true)
      const offset = page * LIMIT
      const url = `${API_BASE}/api/articles?category=${selectedCategory}&limit=${LIMIT}&offset=${offset}`
      const res = await fetch(url)
      const data = await res.json()
      setArticles(data.articles || [])
      setTotal(data.total || 0)
    } catch (error) {
      console.error('获取文章失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <>
      <Head>
        <title>文章列表 - 新闻热榜 RAG</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* 导航栏 */}
        <nav className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              <div className="flex items-center">
                <Link href="/" className="text-2xl font-bold text-blue-600">
                  新闻热榜 RAG
                </Link>
              </div>
              <div className="flex space-x-4">
                <Link href="/" className="text-gray-700 hover:text-blue-600 px-3 py-2">
                  首页
                </Link>
                <Link href="/search" className="text-gray-700 hover:text-blue-600 px-3 py-2">
                  智能搜索
                </Link>
                <Link href="/articles" className="text-blue-600 px-3 py-2 font-semibold">
                  文章列表
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* 主内容 */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">文章列表</h1>

          {/* 分类筛选 */}
          <div className="mb-6 flex flex-wrap gap-2">
            <button
              onClick={() => { setSelectedCategory('all'); setPage(0); }}
              className={`px-4 py-2 rounded-lg ${
                selectedCategory === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:border-blue-500'
              }`}
            >
              全部
            </button>
            {categories.map(cat => (
              <button
                key={cat.name}
                onClick={() => { setSelectedCategory(cat.name); setPage(0); }}
                className={`px-4 py-2 rounded-lg ${
                  selectedCategory === cat.name
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:border-blue-500'
                }`}
              >
                {cat.name} ({cat.count})
              </button>
            ))}
          </div>

          {/* 文章列表 */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-lg shadow divide-y">
                {articles.map(article => (
                  <div key={article.id} className="p-6 hover:bg-gray-50">
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xl font-semibold text-gray-900 hover:text-blue-600"
                    >
                      {article.title}
                    </a>
                    <div className="mt-2 flex items-center space-x-3 text-sm text-gray-500">
                      <span>{article.source}</span>
                      <span>•</span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                        {article.category}
                      </span>
                      <span>•</span>
                      <span>{new Date(article.pubDate).toLocaleString('zh-CN')}</span>
                    </div>
                    {article.summary && (
                      <p className="mt-3 text-gray-600">{article.summary}</p>
                    )}
                    {article.keywords && article.keywords.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {article.keywords.map((kw, i) => (
                          <span key={i} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                            {kw}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* 分页 */}
              {totalPages > 1 && (
                <div className="mt-6 flex justify-center space-x-2">
                  <button
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg disabled:opacity-50"
                  >
                    上一页
                  </button>
                  <span className="px-4 py-2">
                    {page + 1} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg disabled:opacity-50"
                  >
                    下一页
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </>
  )
}
