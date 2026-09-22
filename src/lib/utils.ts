export function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(' ')
}

/**
 * 由标题推导 URL slug。
 * 中文标题无法转成有意义的 ASCII slug，此时回退成 `post-xxxxxx`，
 * 但编辑器里永远允许手工改写，所以这只是个初始值。
 */
export function slugify(input: string) {
  const ascii = input
    .trim()
    .toLowerCase()
    .replace(/['"`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (ascii.replace(/-/g, '').length >= 2) return ascii.slice(0, 64).replace(/-+$/, '')
  return `post-${Math.random().toString(36).slice(2, 8)}`
}

/** 标签 slug：中文标签保留原文（用作数组元素与查询条件，不做 URL 路径） */
export function tagSlug(input: string) {
  const s = input.trim().replace(/\s+/g, '-').toLowerCase()
  return s.replace(/[#?&/=+%]/g, '') || 'tag'
}

export function formatDate(value?: string | null) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`
}

export function formatDateShort(value?: string | null) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function relativeTime(value?: string | null) {
  if (!value) return ''
  const t = new Date(value).getTime()
  if (Number.isNaN(t)) return ''
  const diff = Date.now() - t
  const min = 60_000
  const hour = 60 * min
  const day = 24 * hour
  if (diff < min) return '刚刚'
  if (diff < hour) return `${Math.floor(diff / min)} 分钟前`
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`
  if (diff < 30 * day) return `${Math.floor(diff / day)} 天前`
  return formatDateShort(value)
}

export function formatBytes(bytes?: number | null) {
  if (!bytes || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let n = bytes
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024
    i++
  }
  return `${n >= 10 || i === 0 ? Math.round(n) : n.toFixed(1)} ${units[i]}`
}

export function formatCount(n?: number | null) {
  const v = n ?? 0
  if (v < 1000) return String(v)
  if (v < 10_000) return `${(v / 1000).toFixed(1)}k`
  return `${(v / 10_000).toFixed(1)}w`
}

/** 中英混排的阅读时长估算：中文 350 字/分钟，英文 200 词/分钟 */
export function estimateReadingMinutes(markdown: string) {
  const cjk = (markdown.match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) ?? []).length
  const words = (markdown.match(/[A-Za-z0-9_'’-]+/g) ?? []).length
  const minutes = cjk / 350 + words / 200
  return Math.max(1, Math.round(minutes))
}

export function extOf(name: string) {
  const m = /\.([a-z0-9]{1,8})$/i.exec(name.trim())
  return m ? `.${m[1].toLowerCase()}` : ''
}

/** 封面兜底：由 slug 生成一组稳定的渐变色 */
export function coverGradient(seed: string) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360
  const a = h
  const b = (h + 48) % 360
  return `linear-gradient(135deg, hsl(${a} 72% 62%), hsl(${b} 68% 48%))`
}

export function hashId(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(36)
}

export function safeDecode(s: string) {
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}
