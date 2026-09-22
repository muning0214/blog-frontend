import dayjs from 'dayjs'

export function formatDate(value) {
  if (!value) return ''
  const d = dayjs(value)
  return d.isValid() ? d.format('YYYY 年 M 月 D 日') : ''
}

export function formatDateShort(value) {
  if (!value) return ''
  const d = dayjs(value)
  return d.isValid() ? d.format('YYYY-MM-DD') : ''
}

export function formatDateTime(value) {
  if (!value) return ''
  const d = dayjs(value)
  return d.isValid() ? d.format('YYYY-MM-DD HH:mm') : ''
}

/** 列表里用的相对时间，超过 30 天回退成具体日期 */
export function relativeTime(value) {
  if (!value) return ''
  const d = dayjs(value)
  if (!d.isValid()) return ''
  const minutes = dayjs().diff(d, 'minute')
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} 天前`
  return d.format('YYYY-MM-DD')
}

export function formatBytes(bytes) {
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

export function formatCount(n) {
  const v = n ?? 0
  if (v < 1000) return String(v)
  if (v < 10000) return `${(v / 1000).toFixed(1)}k`
  return `${(v / 10000).toFixed(1)}w`
}

/**
 * 中英混排的阅读时长估算：中文 350 字/分钟，英文 200 词/分钟。
 * 后端写入时会算好并存在 reading_minutes 列上，这个函数用于编辑器里的实时预估。
 */
export function estimateReadingMinutes(markdown) {
  const text = markdown || ''
  const cjk = (text.match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length
  const words = (text.match(/[A-Za-z0-9_'’-]+/g) || []).length
  return Math.max(1, Math.round(cjk / 350 + words / 200))
}

/** 封面兜底：由 slug 生成一组稳定的渐变色，保证同一篇文章每次颜色一致 */
export function coverGradient(seed) {
  let h = 0
  const s = seed || 'post'
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360
  return `linear-gradient(135deg, hsl(${h} 72% 62%), hsl(${(h + 48) % 360} 68% 48%))`
}

/** 由标题推导 URL slug 的初始值，与后端 TextUtils.slugify 保持一致的思路 */
export function slugify(input) {
  const ascii = (input || '')
    .trim()
    .toLowerCase()
    .replace(/['"`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (ascii.replace(/-/g, '').length >= 2) return ascii.slice(0, 64).replace(/-+$/, '')
  return `post-${Math.random().toString(36).slice(2, 8)}`
}

export function extOf(name) {
  const m = /\.([a-z0-9]{1,8})$/i.exec((name || '').trim())
  return m ? `.${m[1].toLowerCase()}` : ''
}
