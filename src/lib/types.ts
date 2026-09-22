export type ArticleStatus = 'draft' | 'published'

/** 文章附件（对象键指向云存储，不存签名 URL） */
export type Attachment = {
  name: string
  path: string
  size: number
  mime: string
}

export type Article = {
  id: number
  user_id: number
  author_name: string | null
  title: string
  slug: string
  summary: string | null
  content: string
  cover_path: string | null
  tags: string[]
  attachments: Attachment[]
  status: ArticleStatus
  featured: boolean
  views: number
  reading_minutes: number
  published_at: string | null
  created_at: string
  updated_at: string
}

/** 列表页只需要部分字段，但为了简单统一用完整行类型 */
export type ArticleInput = {
  title: string
  slug: string
  summary: string | null
  content: string
  cover_path: string | null
  tags: string[]
  attachments: Attachment[]
  status: ArticleStatus
  featured: boolean
  reading_minutes: number
  published_at: string | null
  author_name: string | null
}

export type Tag = {
  id: number
  user_id: number
  name: string
  slug: string
  description: string | null
  color: string
  created_at: string
}

export type TagCount = {
  tag: string
  article_count: number
  latest_at: string | null
}

export type SiteSettings = {
  id: number
  user_id: number
  site_name: string
  tagline: string
  author_name: string
  author_bio: string
  about_md: string
  avatar_path: string | null
  email: string
  github: string
  updated_at: string
}

export type Paged<T> = {
  rows: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
