import { useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'

export default function Search() {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'

  const handleSearch = async (e) => {
    e.preventDefault()

    if (!query.trim()) return

    setLoading(true)
    try {
      const response = await fetch(`${API_BASE}/api/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ q: query })
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error('搜索失败:', error)
      setResult({ error: '搜索失败,请稍后重试' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Head>
        <title>智能搜索 - 新闻热榜 RAG</title>
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
                <Link href="/search" className="text-blue-600 px-3 py-2 font-semibold">
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
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">AI智能问答</h1>
            <p className="text-lg text-gray-600">
              基于最新新闻内容,智能回答您的问题
            </p>
          </div>

          {/* 搜索框 */}
          <form onSubmit={handleSearch} className="mb-8">
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="输入您的问题,例如: 最近科技领域有什么重要新闻?"
                className="w-full px-6 py-4 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="absolute right-2 top-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {loading ? '搜索中...' : '搜索'}
              </button>
            </div>
          </form>

          {/* 示例问题 */}
          {!result && (
            <div className="mb-8">
              <h3 className="text-sm font-medium text-gray-700 mb-3">试试这些问题:</h3>
              <div className="flex flex-wrap gap-2">
                {[
                  '最近有哪些AI领域的突破?',
                  '今天的财经新闻有什么?',
                  '体育赛事的最新消息',
                  '科技公司的最新动态'
                ].map((example, i) => (
                  <button
                    key={i}
                    onClick={() => setQuery(example)}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 hover:border-blue-500 hover:text-blue-600"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 加载状态 */}
          {loading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">AI正在思考中...</p>
            </div>
          )}

          {/* 搜索结果 */}
          {result && !loading && (
            <div className="space-y-6">
              {/* 回答 */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">回答</h2>
                {result.error ? (
                  <p className="text-red-600">{result.error}</p>
                ) : (
                  <div className="prose max-w-none">
                    <p className="text-gray-800 whitespace-pre-line">{result.answer}</p>
                  </div>
                )}
              </div>

              {/* 来源 */}
              {result.sources && result.sources.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">信息来源</h2>
                  <div className="space-y-3">
                    {result.sources.map((source, index) => (
                      <div key={index} className="border-l-4 border-blue-500 pl-4">
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {source.title}
                        </a>
                        <div className="mt-1 text-sm text-gray-500">
                          {source.source} • {source.category} • {new Date(source.pubDate).toLocaleDateString('zh-CN')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </>
  )
}
