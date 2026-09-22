import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  fetchArticleBySlug,
  fetchNeighbours,
  fetchRelated,
  incrementViews,
  signOne,
} from '../lib/api'
import { useAuth } from '../lib/auth'
import { useDocumentTitle, useSiteSettings } from '../lib/hooks'
import { MarkdownView } from '../components/MarkdownView'
import type { TocItem } from '../lib/markdown'
import type { Article } from '../lib/types'
import { cn, formatBytes, formatCount, formatDate } from '../lib/utils'
import { CoverImage } from '../components/ArticleCard'
import { EmptyState, ErrorState, Notice, PageLoading, Spinner, TagPill } from '../components/ui'
import {
  IconArrowLeft,
  IconArrowRight,
  IconClock,
  IconDownload,
  IconEdit,
  IconEye,
  IconFile,
  IconPaperclip,
} from '../components/icons'

function AttachmentList({ article }: { article: Article }) {
  const { uid } = useAuth()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!article.attachments?.length) return null

  const download = async (path: string, name: string) => {
    if (!uid) {
      setError('附件存放在云端存储，登录后才能下载。')
      return
    }
    setBusy(path)
    setError(null)
    try {
      const url = await signOne(path)
      const a = document.createElement('a')
      a.href = url
      a.download = name
      a.rel = 'noopener'
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch (e: any) {
      setError(e?.message ?? '获取下载地址失败')
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="attachments">
      <h2 className="attachments__title">
        <IconPaperclip width={16} height={16} />
        附件（{article.attachments.length}）
      </h2>
      {error ? <Notice tone="error">{error}</Notice> : null}
      <ul className="attachments__list">
        {article.attachments.map((a) => (
          <li key={a.path} className="attachments__item">
            <span className="attachments__icon">
              <IconFile width={17} height={17} />
            </span>
            <span className="attachments__info">
              <span className="attachments__name">{a.name}</span>
              <span className="attachments__meta">
                {formatBytes(a.size)}
                {a.mime ? ` · ${a.mime}` : ''}
              </span>
            </span>
            <button
              type="button"
              className="btn btn--sm btn--ghost"
              onClick={() => void download(a.path, a.name)}
              disabled={busy === a.path}
            >
              {busy === a.path ? <Spinner /> : <IconDownload width={14} height={14} />}
              下载
            </button>
          </li>
        ))}
      </ul>
      {!uid ? <p className="field__hint">附件与图片位于云端对象存储，仅登录用户可读取。</p> : null}
    </section>
  )
}

function Toc({ items }: { items: TocItem[] }) {
  const [active, setActive] = useState<string>('')

  useEffect(() => {
    if (!items.length) return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (visible?.target.id) setActive(visible.target.id)
      },
      { rootMargin: '-88px 0px -70% 0px', threshold: [0, 1] },
    )
    items.forEach((i) => {
      const el = document.getElementById(i.id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [items])

  if (items.length < 2) return null

  return (
    <nav className="toc" aria-label="文章目录">
      <h3 className="toc__title">目录</h3>
      <ul className="toc__list">
        {items.map((i) => (
          <li key={i.id} className={cn('toc__item', `toc__item--h${i.level}`)}>
            <a
              href={`#${i.id}`}
              className={cn(active === i.id && 'is-active')}
              onClick={(e) => {
                e.preventDefault()
                const el = document.getElementById(i.id)
                if (!el) return
                window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' })
                setActive(i.id)
              }}
            >
              {i.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export function ArticleDetailPage() {
  const { slug = '' } = useParams()
  const navigate = useNavigate()
  const { site } = useSiteSettings()
  const { uid } = useAuth()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [article, setArticle] = useState<Article | null>(null)
  const [related, setRelated] = useState<Article[]>([])
  const [neighbours, setNeighbours] = useState<{ prev: any; next: any }>({ prev: null, next: null })
  const [toc, setToc] = useState<TocItem[]>([])
  const [views, setViews] = useState<number | null>(null)
  const countedRef = useRef<string>('')

  useDocumentTitle(article ? `${article.title} · ${site.site_name}` : site.site_name)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const row = await fetchArticleBySlug(decodeURIComponent(slug))
      setArticle(row)
      setViews(row?.views ?? null)
      if (row) {
        const [rel, nb] = await Promise.all([
          fetchRelated(row).catch(() => []),
          fetchNeighbours(row).catch(() => ({ prev: null, next: null })),
        ])
        setRelated(rel)
        setNeighbours(nb)
      }
    } catch (e: any) {
      setError(e?.message ?? '加载失败')
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => {
    void load()
  }, [load])

  // 阅读量：同一篇文章在一次会话里只计一次，失败也不打扰读者
  useEffect(() => {
    if (!article || article.status !== 'published') return
    if (countedRef.current === article.slug) return
    countedRef.current = article.slug
    void incrementViews(article.id).then((v) => {
      if (typeof v === 'number') setViews(v)
    })
  }, [article])

  const handleToc = useCallback((items: TocItem[]) => setToc(items), [])

  const isAuthor = Boolean(uid && article && article.user_id === uid)

  const meta = useMemo(() => {
    if (!article) return null
    return [
      { icon: null, text: formatDate(article.published_at ?? article.created_at) },
      { icon: <IconClock width={13} height={13} />, text: `${article.reading_minutes} 分钟阅读` },
      { icon: <IconEye width={13} height={13} />, text: `${formatCount(views ?? article.views)} 次阅读` },
    ]
  }, [article, views])

  if (loading) return <PageLoading />

  if (error) {
    return (
      <div className="container">
        <ErrorState message={error} onRetry={() => void load()} />
      </div>
    )
  }

  if (!article) {
    return (
      <div className="container">
        <EmptyState
          title="找不到这篇文章"
          description={
            <>
              它可能已经被删除，或者还是一篇未公开的草稿。
              {!uid ? '如果你确定它存在，请先登录再试。' : ''}
            </>
          }
          action={
            <Link className="btn btn--primary" to="/articles">
              返回文章列表
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="container section article-page">
      <div className="article-layout">
        <article className="article">
          <nav className="breadcrumb">
            <Link to="/articles">
              <IconArrowLeft width={14} height={14} />
              文章列表
            </Link>
            {article.tags?.[0] ? (
              <>
                <span>/</span>
                <Link to={`/articles?tag=${encodeURIComponent(article.tags[0])}`}>{article.tags[0]}</Link>
              </>
            ) : null}
          </nav>

          {article.status === 'draft' ? (
            <Notice tone="info">
              这是一篇<strong>草稿</strong>，只有你自己能看到。
              <button
                type="button"
                className="link-inline"
                onClick={() => navigate(`/write/${article.id}`)}
              >
                继续编辑
              </button>
            </Notice>
          ) : null}

          <header className="article__head">
            <div className="article__tags">
              {(article.tags ?? []).map((t) => (
                <TagPill key={t} slug={t} size="sm" />
              ))}
            </div>

            <h1 className="article__title">{article.title}</h1>

            {article.summary ? <p className="article__summary">{article.summary}</p> : null}

            <div className="article__meta">
              {meta?.map((m, i) => (
                <span key={i} className="article__meta-item">
                  {m.icon}
                  {m.text}
                </span>
              ))}
              {isAuthor ? (
                <Link className="article__edit" to={`/write/${article.id}`}>
                  <IconEdit width={14} height={14} />
                  编辑本文
                </Link>
              ) : null}
            </div>
          </header>

          {article.cover_path ? (
            <figure className="article__cover">
              <CoverImage path={article.cover_path} seed={article.slug} alt={article.title} />
            </figure>
          ) : null}

          <MarkdownView markdown={article.content} onToc={handleToc} />

          <AttachmentList article={article} />

          <div className="article__author">
            <div className="article__author-avatar">
              {(article.author_name || site.author_name || 'A').slice(0, 1)}
            </div>
            <div>
              <div className="article__author-name">{article.author_name || site.author_name}</div>
              <div className="article__author-bio">{site.author_bio}</div>
            </div>
            <Link className="btn btn--sm btn--ghost" to="/about">
              关于作者
            </Link>
          </div>

          <nav className="article-nav">
            {neighbours.prev ? (
              <Link className="article-nav__item" to={`/article/${encodeURIComponent(neighbours.prev.slug)}`}>
                <span className="article-nav__label">
                  <IconArrowLeft width={13} height={13} />
                  上一篇
                </span>
                <span className="article-nav__title">{neighbours.prev.title}</span>
              </Link>
            ) : (
              <span className="article-nav__item article-nav__item--empty">已经是最早一篇</span>
            )}
            {neighbours.next ? (
              <Link
                className="article-nav__item article-nav__item--next"
                to={`/article/${encodeURIComponent(neighbours.next.slug)}`}
              >
                <span className="article-nav__label">
                  下一篇
                  <IconArrowRight width={13} height={13} />
                </span>
                <span className="article-nav__title">{neighbours.next.title}</span>
              </Link>
            ) : (
              <span className="article-nav__item article-nav__item--empty">已经是最新一篇</span>
            )}
          </nav>
        </article>

        <aside className="article-side">
          <Toc items={toc} />

          {article.tags?.length ? (
            <div className="side-card">
              <h3 className="side-card__title">本文标签</h3>
              <div className="side-card__tags">
                {article.tags.map((t) => (
                  <TagPill key={t} slug={t} size="sm" />
                ))}
              </div>
            </div>
          ) : null}

          {related.length ? (
            <div className="side-card">
              <h3 className="side-card__title">相关文章</h3>
              <ul className="side-card__list">
                {related.map((r) => (
                  <li key={r.id}>
                    <Link to={`/article/${encodeURIComponent(r.slug)}`}>{r.title}</Link>
                    <span>{formatDate(r.published_at ?? r.created_at)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  )
}
