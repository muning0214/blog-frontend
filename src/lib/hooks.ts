import { useCallback, useEffect, useState } from 'react'
import { assetUrl, fetchSettings } from './api'
import type { SiteSettings } from './types'

/** 站点配置的兜底默认值：数据库还没有配置行时用它渲染首屏 */
export const DEFAULT_SITE = {
  site_name: 'DevLog',
  tagline: '写代码，也写下为什么这样写',
  author_name: '站长',
  author_bio: '一名在业务系统里折腾架构与体验的工程师。',
  email: '',
  github: '',
  avatar_path: null as string | null,
}

export const DEFAULT_ABOUT = `## 关于这个博客

前端 React、后端 Spring Boot、数据库 MySQL，三块各自独立。

文章的正文是 Markdown 原文，渲染交给浏览器；图片和附件存在后端的磁盘目录里，
通过静态资源映射直接对外，匿名访客也能正常看到。

### 内容怎么来的

文章由登录后的作者在工作台里写作发布。访客可以直接浏览已发布的文章、按标签筛选、
搜索关键词，不需要登录。

> 站点信息与这段关于页的正文，都可以在「工作台 → 站点设置」里用 Markdown 改写。
`

export type ResolvedSite = typeof DEFAULT_SITE & { about_md: string; raw: SiteSettings | null }

function resolve(settings: SiteSettings | null): ResolvedSite {
  return {
    site_name: settings?.site_name?.trim() || DEFAULT_SITE.site_name,
    tagline: settings?.tagline?.trim() || DEFAULT_SITE.tagline,
    author_name: settings?.author_name?.trim() || DEFAULT_SITE.author_name,
    author_bio: settings?.author_bio?.trim() || DEFAULT_SITE.author_bio,
    email: settings?.email?.trim() || DEFAULT_SITE.email,
    github: settings?.github?.trim() || DEFAULT_SITE.github,
    avatar_path: settings?.avatar_path ?? null,
    about_md: settings?.about_md?.trim() || DEFAULT_ABOUT,
    raw: settings,
  }
}

/**
 * 站点配置在页头、页脚、关于页、工作台都会用到，
 * 用模块级的 promise 缓存避免首屏重复拉取。
 */
let inflight: Promise<SiteSettings | null> | null = null

function load(force = false) {
  if (force || !inflight) {
    // 后端没启动时不要让它把整页拖挂：失败就退回内置默认值
    inflight = fetchSettings().catch(() => null)
  }
  return inflight
}

export function useSiteSettings() {
  const [site, setSite] = useState<ResolvedSite>(() => resolve(null))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    void load().then((s) => {
      if (!alive) return
      setSite(resolve(s))
      setLoading(false)
    })
    return () => {
      alive = false
    }
  }, [])

  const reload = useCallback(async () => {
    setLoading(true)
    inflight = null
    const s = await load(true)
    setSite(resolve(s))
    setLoading(false)
    return s
  }, [])

  return { site, loading, reload }
}

/** 更新 <title> */
export function useDocumentTitle(title?: string) {
  useEffect(() => {
    if (!title) return
    document.title = title
  }, [title])
}

export type Theme = 'light' | 'dark'

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    const attr = document.documentElement.getAttribute('data-theme')
    return attr === 'dark' ? 'dark' : 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try {
      localStorage.setItem('devlog-theme', theme)
    } catch {
      /* 隐私模式下 localStorage 可能不可写，忽略 */
    }
  }, [theme])

  const toggle = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), [])
  return { theme, toggle }
}

/**
 * 把对象键（如 covers/ab12.png）解析成可访问的地址。
 *
 * 云端版本里这是个异步 hook，因为要向后端换取短时签名 URL。
 * 现在文件是后端的静态资源，解析只是字符串拼接，所以它变成了同步函数 ——
 * 保留 hook 的名字与签名，是为了让调用点一处都不用改。
 */
export function useObjectUrl(path?: string | null): string | null {
  return assetUrl(path)
}
