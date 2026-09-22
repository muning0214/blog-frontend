import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { fetchPublishedArticles, fetchTags } from '../lib/api'
import { useDocumentTitle, useSiteSettings } from '../lib/hooks'
import type { Article, Tag } from '../lib/types'
import { ArticleCard } from '../components/ArticleCard'
import { EmptyState, ErrorState, PageLoading, Pagination } from '../components/ui'
import { IconClose, IconSearch, IconTag } from '../components/icons'

export function ArticleListPage() {
  const { site } = useSiteSettings()
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const tag = params.get('tag') ?? ''
  const page = Math.max(1, Number(params.get('page') ?? '1') || 1)

  const [input, setInput] = useState(q)
  const [articles, setArticles] = useState<Article[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useDocumentTitle(
    tag ? `标签：${tag} · ${site.site_name}` : q ? `搜索：${q} · ${site.site_name}` : `文章 · ${site.site_name}`,
  )

  useEffect(() => {
    setInput(q)
  }, [q])

  useEffect(() => {
    fetchTags()
      .then(setTags)
      .catch(() => setTags([]))
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchPublishedArticles({ tag: tag || null, keyword: q || null, page, pageSize: 6 })
      setArticles(res.rows)
      setTotal(res.total)
      setTotalPages(res.totalPages)
    } catch (e: any) {
      setError(e?.message ?? '加载失败')
    } finally {
      setLoading(false)
    }
  }, [tag, q, page])

  useEffect(() => {
    void load()
  }, [load])

  /** 改条件时重置页码，避免停留在不存在的页上 */
  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params)
    Object.entries(patch).forEach(([k, v]) => {
      if (v === null || v === '') next.delete(k)
      else next.set(k, v)
    })
    if (!('page' in patch)) next.delete('page')
    setParams(next, { replace: false })
  }

  const tagMap = new Map(tags.map((t) => [t.slug, t]))

  return (
    <div className="container section">
      <header className="page-head">
        <h1 className="page-head__title">
          {tag ? (
            <>
              <IconTag width={20} height={20} />
              {tagMap.get(tag)?.name ?? tag}
            </>
          ) : q ? (
            <>
              <IconSearch width={20} height={20} />
              “{q}”
            </>
          ) : (
            '全部文章'
          )}
        </h1>
        <p className="page-head__sub">
          {tagMap.get(tag)?.description || (tag || q ? `共 ${total} 篇匹配的文章` : `共 ${total} 篇已发布文章`)}
        </p>
      </header>

      <div className="toolbar">
        <form
          className="toolbar__search"
          onSubmit={(e) => {
            e.preventDefault()
            update({ q: input.trim() || null })
          }}
          role="search"
        >
          <IconSearch width={16} height={16} />
          <input
            type="search"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="搜索标题、摘要或正文…"
            aria-label="搜索文章"
          />
          <button type="submit" className="btn btn--sm btn--primary">
            搜索
          </button>
        </form>

        {(q || tag) ? (
          <div className="toolbar__filters">
            {tag ? (
              <button type="button" className="filter-chip" onClick={() => update({ tag: null })}>
                <IconTag width={13} height={13} />
                标签：{tagMap.get(tag)?.name ?? tag}
                <IconClose width={12} height={12} />
              </button>
            ) : null}
            {q ? (
              <button type="button" className="filter-chip" onClick={() => update({ q: null })}>
                <IconSearch width={13} height={13} />
                关键词：{q}
                <IconClose width={12} height={12} />
              </button>
            ) : null}
            <button
              type="button"
              className="link-more"
              onClick={() => update({ q: null, tag: null })}
            >
              清空条件
            </button>
          </div>
        ) : tags.length ? (
          <div className="toolbar__filters toolbar__filters--scroll">
            {tags.slice(0, 10).map((t) => (
              <button
                key={t.slug}
                type="button"
                className="filter-chip filter-chip--ghost"
                onClick={() => update({ tag: t.slug })}
              >
                <span className="tag-pill__dot" style={{ background: t.color }} />
                {t.name}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {loading ? (
        <PageLoading />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : articles.length ? (
        <>
          <div className="card-grid card-grid--list">
            {articles.map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onChange={(p) => update({ page: String(p) })} />
        </>
      ) : (
        <EmptyState
          title="没有找到匹配的文章"
          description={q || tag ? '换个关键词或清空筛选条件再试试。' : '作者还没有发布文章。'}
          action={
            q || tag ? (
              <button type="button" className="btn btn--ghost" onClick={() => update({ q: null, tag: null })}>
                清空筛选
              </button>
            ) : (
              <Link className="btn btn--primary" to="/login">
                作者登录
              </Link>
            )
          }
        />
      )}
    </div>
  )
}
