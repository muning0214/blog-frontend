import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchPublishedArticles, fetchTagCounts } from '../lib/api'
import { useDocumentTitle, useSiteSettings } from '../lib/hooks'
import type { Article, TagCount } from '../lib/types'
import { formatCount, formatDateShort } from '../lib/utils'
import { ArticleCard, CoverImage } from '../components/ArticleCard'
import { EmptyState, ErrorState, PageLoading, TagPill } from '../components/ui'
import { IconArrowRight, IconClock, IconEye, IconSparkle, IconTag } from '../components/icons'

export function HomePage() {
  const { site } = useSiteSettings()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [featured, setFeatured] = useState<Article | null>(null)
  const [articles, setArticles] = useState<Article[]>([])
  const [total, setTotal] = useState(0)
  const [tags, setTags] = useState<TagCount[]>([])

  useDocumentTitle(`${site.site_name} · ${site.tagline}`)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [featuredRes, latestRes, tagRes] = await Promise.all([
        fetchPublishedArticles({ featuredOnly: true, pageSize: 1 }),
        fetchPublishedArticles({ pageSize: 7 }),
        fetchTagCounts(),
      ])
      const hero = featuredRes.rows[0] ?? latestRes.rows[0] ?? null
      setFeatured(hero)
      setArticles(hero ? latestRes.rows.filter((a) => a.id !== hero.id) : latestRes.rows)
      setTotal(latestRes.total)
      setTags(tagRes)
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

  const totalViews = useMemo(
    () => articles.reduce((sum, a) => sum + (a.views ?? 0), 0) + (featured?.views ?? 0),
    [articles, featured],
  )

  if (loading) return <PageLoading />

  if (error) {
    return (
      <div className="container">
        <ErrorState message={error} onRetry={() => void load()} />
      </div>
    )
  }

  return (
    <>
      <section className="hero">
        <div className="container hero__inner">
          <div className="hero__left">
            <span className="hero__eyebrow">
              <IconSparkle width={14} height={14} />
              技术博客 · 云端驱动
            </span>
            <h1 className="hero__title">{site.site_name}</h1>
            <p className="hero__tagline">{site.tagline}</p>
            <p className="hero__desc">{site.author_bio}</p>

            <div className="hero__actions">
              <Link className="btn btn--primary" to="/articles">
                浏览全部文章
                <IconArrowRight width={15} height={15} />
              </Link>
              <Link className="btn btn--ghost" to="/tags">
                <IconTag width={15} height={15} />
                按标签找
              </Link>
            </div>

            <dl className="hero__stats">
              <div>
                <dt>已发布</dt>
                <dd>{total}</dd>
              </div>
              <div>
                <dt>标签</dt>
                <dd>{tags.length}</dd>
              </div>
              <div>
                <dt>近期阅读</dt>
                <dd>{formatCount(totalViews)}</dd>
              </div>
            </dl>
          </div>

          {featured ? (
            <Link className="hero__feature" to={`/article/${encodeURIComponent(featured.slug)}`}>
              <div className="hero__feature-cover">
                <CoverImage path={featured.cover_path} seed={featured.slug} alt={featured.title} />
              </div>
              <div className="hero__feature-body">
                <span className="hero__feature-badge">
                  <IconSparkle width={13} height={13} />
                  精选
                </span>
                <h2>{featured.title}</h2>
                {featured.summary ? <p>{featured.summary}</p> : null}
                <div className="hero__feature-meta">
                  <span>{formatDateShort(featured.published_at ?? featured.created_at)}</span>
                  <span>
                    <IconClock width={13} height={13} />
                    {featured.reading_minutes} 分钟
                  </span>
                  <span>
                    <IconEye width={13} height={13} />
                    {formatCount(featured.views)}
                  </span>
                </div>
              </div>
            </Link>
          ) : null}
        </div>
      </section>

      <section className="container section">
        <header className="section__head">
          <div>
            <h2 className="section__title">最新文章</h2>
            <p className="section__sub">按发布时间倒序，精选优先</p>
          </div>
          <Link className="link-more" to="/articles">
            全部 {total} 篇
            <IconArrowRight width={14} height={14} />
          </Link>
        </header>

        {articles.length ? (
          <div className="card-grid">
            {articles.map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="还没有已发布的文章"
            description="作者登录后进入工作台即可开始写作。"
            action={
              <Link className="btn btn--primary" to="/login">
                作者登录
              </Link>
            }
          />
        )}
      </section>

      {tags.length ? (
        <section className="container section">
          <header className="section__head">
            <div>
              <h2 className="section__title">按标签浏览</h2>
              <p className="section__sub">标签由作者在写作时指定</p>
            </div>
            <Link className="link-more" to="/tags">
              标签云
              <IconArrowRight width={14} height={14} />
            </Link>
          </header>
          <div className="tag-cloud">
            {tags.slice(0, 12).map((t) => (
              <TagPill key={t.tag} slug={t.tag} count={t.article_count} />
            ))}
          </div>
        </section>
      ) : null}
    </>
  )
}
