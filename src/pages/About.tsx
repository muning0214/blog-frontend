import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchPublishedArticles, fetchTagCounts } from '../lib/api'
import { useDocumentTitle, useSiteSettings } from '../lib/hooks'
import { MarkdownView } from '../components/MarkdownView'
import { formatCount } from '../lib/utils'
import { PageLoading, TagPill } from '../components/ui'
import { IconClock, IconEye, IconGithub, IconMail, IconSparkle } from '../components/icons'
import type { Article, TagCount } from '../lib/types'

export function AboutPage() {
  const { site, loading } = useSiteSettings()
  const [latest, setLatest] = useState<Article[]>([])
  const [tags, setTags] = useState<TagCount[]>([])
  const [ready, setReady] = useState(false)

  useDocumentTitle(`关于 · ${site.site_name}`)

  useEffect(() => {
    let alive = true
    Promise.all([
      fetchPublishedArticles({ pageSize: 3 }).catch(() => null),
      fetchTagCounts().catch(() => []),
    ]).then(([res, t]) => {
      if (!alive) return
      setLatest(res?.rows ?? [])
      setTags(t)
      setReady(true)
    })
    return () => {
      alive = false
    }
  }, [])

  if (loading && !ready) return <PageLoading />

  const totalArticles = latest.length ? undefined : undefined

  return (
    <div className="container section about-page">
      <header className="about-hero">
        <div className="about-hero__avatar">{site.author_name.slice(0, 1)}</div>
        <div className="about-hero__main">
          <h1>{site.author_name}</h1>
          <p className="about-hero__tagline">{site.tagline}</p>
          <p className="about-hero__bio">{site.author_bio}</p>
          <div className="about-hero__links">
            {site.email ? (
              <a className="btn btn--sm btn--ghost" href={`mailto:${site.email}`}>
                <IconMail width={14} height={14} />
                {site.email}
              </a>
            ) : null}
            {site.github ? (
              <a className="btn btn--sm btn--ghost" href={site.github} target="_blank" rel="noopener noreferrer">
                <IconGithub width={14} height={14} />
                GitHub
              </a>
            ) : null}
            {!site.email && !site.github ? (
              <span className="field__hint">站长还没有填写联系方式，可在工作台 → 站点设置里补充。</span>
            ) : null}
          </div>
        </div>
      </header>

      <div className="about-layout">
        <div className="about-main">
          <MarkdownView markdown={site.about_md} />
        </div>

        <aside className="about-side">
          <div className="side-card">
            <h3 className="side-card__title">
              <IconSparkle width={15} height={15} />
              这个站怎么搭的
            </h3>
            <ul className="side-card__facts">
              <li>
                <strong>文章</strong>
                <span>存于云端 PostgreSQL，通过 PostgREST 接口读写</span>
              </li>
              <li>
                <strong>权限</strong>
                <span>行级安全策略：公开只读已发布，写操作限本人</span>
              </li>
              <li>
                <strong>文件</strong>
                <span>封面 / 插图 / 附件存对象存储，展示时换短时签名地址</span>
              </li>
              <li>
                <strong>登录</strong>
                <span>邮箱验证码与邮箱密码两套入口，会话自动续期</span>
              </li>
            </ul>
          </div>

          {latest.length ? (
            <div className="side-card">
              <h3 className="side-card__title">最近发布</h3>
              <ul className="side-card__list">
                {latest.map((a) => (
                  <li key={a.id}>
                    <Link to={`/article/${encodeURIComponent(a.slug)}`}>{a.title}</Link>
                    <span>
                      <IconClock width={12} height={12} />
                      {a.reading_minutes} 分钟
                      <IconEye width={12} height={12} />
                      {formatCount(a.views)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {tags.length ? (
            <div className="side-card">
              <h3 className="side-card__title">写过的方向</h3>
              <div className="side-card__tags">
                {tags.slice(0, 10).map((t) => (
                  <TagPill key={t.tag} slug={t.tag} count={t.article_count} size="sm" />
                ))}
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  )
}
