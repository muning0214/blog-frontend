import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchTags, fetchTagCounts } from '../lib/api'
import { useDocumentTitle, useSiteSettings } from '../lib/hooks'
import type { Tag, TagCount } from '../lib/types'
import { formatDateShort } from '../lib/utils'
import { EmptyState, ErrorState, PageLoading } from '../components/ui'
import { IconArrowRight, IconTag } from '../components/icons'

type Merged = {
  slug: string
  name: string
  description: string | null
  color: string
  count: number
  latest: string | null
}

export function TagsPage() {
  const { site } = useSiteSettings()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tags, setTags] = useState<Tag[]>([])
  const [counts, setCounts] = useState<TagCount[]>([])

  useDocumentTitle(`标签 · ${site.site_name}`)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [t, c] = await Promise.all([fetchTags(), fetchTagCounts()])
      setTags(t)
      setCounts(c)
    } catch (e: any) {
      setError(e?.message ?? '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** 只展示真正有已发布文章的标签；元数据表里可能有作者建了但还没用的 */
  const merged = useMemo<Merged[]>(() => {
    const meta = new Map(tags.map((t) => [t.slug, t]))
    const out: Merged[] = []
    for (const c of counts) {
      const m = meta.get(c.tag)
      out.push({
        slug: c.tag,
        name: m?.name ?? c.tag,
        description: m?.description ?? null,
        color: m?.color ?? '#6366f1',
        count: c.article_count,
        latest: c.latest_at,
      })
    }
    return out.sort((a, b) => b.count - a.count || a.slug.localeCompare(b.slug))
  }, [tags, counts])

  const totalArticles = merged.reduce((s, t) => s + t.count, 0)
  const max = merged[0]?.count ?? 1

  if (loading) return <PageLoading />

  if (error) {
    return (
      <div className="container">
        <ErrorState message={error} onRetry={() => void load()} />
      </div>
    )
  }

  return (
    <div className="container section">
      <header className="page-head">
        <h1 className="page-head__title">
          <IconTag width={20} height={20} />
          标签分类
        </h1>
        <p className="page-head__sub">
          {merged.length} 个标签，覆盖 {totalArticles} 个标签引用。字号与底色深浅表示文章数量的多少。
        </p>
      </header>

      {merged.length ? (
        <>
          <div className="tag-cloud tag-cloud--big">
            {merged.map((t) => {
              const ratio = t.count / max
              const size = 0.92 + ratio * 0.62
              return (
                <Link
                  key={t.slug}
                  className="tag-bubble"
                  to={`/articles?tag=${encodeURIComponent(t.slug)}`}
                  style={
                    {
                      '--bubble-color': t.color,
                      '--bubble-scale': String(size),
                      '--bubble-alpha': String(0.1 + ratio * 0.22),
                    } as React.CSSProperties
                  }
                >
                  <span className="tag-bubble__dot" />
                  <span className="tag-bubble__name">{t.name}</span>
                  <span className="tag-bubble__count">{t.count}</span>
                </Link>
              )
            })}
          </div>

          <div className="tag-table">
            <div className="tag-table__head">
              <span>标签</span>
              <span>文章数</span>
              <span>最近更新</span>
              <span />
            </div>
            {merged.map((t) => (
              <div key={t.slug} className="tag-table__row">
                <span className="tag-table__name">
                  <span className="tag-pill__dot" style={{ background: t.color }} />
                  <span>
                    <strong>{t.name}</strong>
                    {t.description ? <em>{t.description}</em> : null}
                  </span>
                </span>
                <span className="tag-table__count">{t.count}</span>
                <span className="tag-table__date">{formatDateShort(t.latest) || '—'}</span>
                <Link className="btn btn--sm btn--ghost" to={`/articles?tag=${encodeURIComponent(t.slug)}`}>
                  查看
                  <IconArrowRight width={13} height={13} />
                </Link>
              </div>
            ))}
          </div>
        </>
      ) : (
        <EmptyState
          title="还没有任何标签"
          description="标签来自已发布文章。作者在写作时填写的标签会自动出现在这里。"
          action={
            <Link className="btn btn--primary" to="/articles">
              去文章列表
            </Link>
          }
        />
      )}
    </div>
  )
}
