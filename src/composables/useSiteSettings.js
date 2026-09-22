import { computed, ref } from 'vue'
import { fetchSettings } from '@/api/settings'

/** 数据库还没有配置行时用它渲染首屏 */
export const DEFAULT_SITE = {
  site_name: 'DevLog',
  tagline: '写代码，也写下为什么这样写',
  author_name: '站长',
  author_bio: '一名在业务系统里折腾架构与体验的工程师。',
  email: '',
  github: '',
  avatar_path: null,
}

export const DEFAULT_ABOUT = `## 关于这个博客

前端 Vue、后端 Spring Boot、数据库 MySQL，三块各自独立。

文章的正文是 Markdown 原文，渲染交给浏览器；图片和附件存在后端的磁盘目录里，
通过静态资源映射直接对外，匿名访客也能正常看到。

### 内容怎么来的

文章由登录后的作者在工作台里写作发布。访客可以直接浏览已发布的文章、按标签筛选、
搜索关键词，不需要登录。

> 站点信息与这段关于页的正文，都可以在「工作台 → 站点设置」里用 Markdown 改写。
`

const raw = ref(null)
const loading = ref(true)
let inflight = null

function resolve(settings) {
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

async function load(force = false) {
  if (inflight && !force) return inflight
  loading.value = true
  inflight = (async () => {
    try {
      raw.value = await fetchSettings()
    } catch {
      // 后端没启动时不要让它把整页拖挂：退回内置默认值
      raw.value = null
    } finally {
      loading.value = false
    }
  })()
  return inflight
}

/** 由 App.vue 在挂载时调一次 */
export function ensureSiteSettingsLoaded() {
  return load()
}

/**
 * 站点配置在页头、页脚、关于页、工作台都会用到，
 * 用模块级状态缓存一次，避免首屏重复请求。
 */
export function useSiteSettings() {
  return {
    site: computed(() => resolve(raw.value)),
    loading: computed(() => loading.value),
    reload: () => load(true),
  }
}
