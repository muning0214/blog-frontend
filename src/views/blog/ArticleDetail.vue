<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { fetchArticleBySlug, fetchNeighbours, fetchRelated } from '@/api/article'
import { useUserStore } from '@/store/user'
import { useSiteSettings } from '@/composables/useSiteSettings'
import { assetUrl } from '@/api/request'
import { formatDate, formatCount } from '@/utils/format'
import MarkdownView from '@/components/MarkdownView.vue'
import PageState from '@/components/PageState.vue'
import TagPill from '@/components/TagPill.vue'

const route = useRoute()
const { state } = useUserStore()
const { site } = useSiteSettings()

const loading = ref(true)
const error = ref('')
const notFound = ref(false)
const article = ref(null)
const neighbours = ref({ prev: null, next: null })
const related = ref([])
const toc = ref([])
const activeToc = ref('')

const slug = computed(() => String(route.params.slug || ''))
const isAuthor = computed(() => !!state.user && !!article.value && article.value.user_id === state.user.id)
const coverUrl = computed(() => assetUrl(article.value?.cover_path))
const attachments = computed(() => article.value?.attachments || [])

const load = async () => {
  loading.value = true
  error.value = ''
  notFound.value = false
  article.value = null
  try {
    const data = await fetchArticleBySlug(slug.value)
    if (!data) {
      notFound.value = true
      return
    }
    article.value = data
    // 相关内容与正文互不阻塞：正文先上，侧栏慢慢补
    fetchNeighbours(slug.value).then((n) => (neighbours.value = n || { prev: null, next: null }))
    fetchRelated(slug.value, 4).then((r) => (related.value = r || []))
  } catch (e) {
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(slug, load)

/** 点目录滚动到对应标题；用 scrollIntoView 而不是改 hash，避免触发路由跳转 */
const scrollTo = (id) => {
  const el = document.getElementById(id)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  activeToc.value = id
}
</script>

<template>
  <div>
    <PageState :loading="loading" :error="error" loading-label="正在加载文章…">
      <template #action>
        <RouterLink class="btn btn--primary" :to="{ name: 'ArticleList' }">返回文章列表</RouterLink>
      </template>

      <div v-if="notFound" class="container">
        <div class="state-block state-block--empty">
          <a-result status="404" title="找不到这篇文章" sub-title="它可能还没发布，或者链接已经变了。" />
          <div class="state-block__action-row">
            <RouterLink class="btn btn--primary" :to="{ name: 'ArticleList' }">去文章列表看看</RouterLink>
          </div>
        </div>
      </div>

      <div v-else-if="article" class="container section article-page">
        <div class="article-layout">
          <article class="article">
            <nav class="breadcrumb" aria-label="面包屑">
              <RouterLink :to="{ name: 'Home' }">首页</RouterLink>
              <span>/</span>
              <RouterLink :to="{ name: 'ArticleList' }">文章</RouterLink>
              <span>/</span>
              <span>{{ article.title }}</span>
            </nav>

            <p v-if="article.status === 'draft' && isAuthor" class="notice notice--info">
              这是一篇<strong>草稿</strong>，只有你自己能看到。
              <RouterLink class="link-inline" :to="{ name: 'ArticleEdit', params: { id: article.id } }">
                继续编辑
              </RouterLink>
            </p>

            <header class="article__head">
              <div v-if="article.tags?.length" class="article__tags">
                <TagPill v-for="tag in article.tags" :key="tag" :slug="tag" size="sm" />
              </div>
              <h1 class="article__title">{{ article.title }}</h1>
              <p v-if="article.summary" class="article__summary">{{ article.summary }}</p>
              <div class="article__meta">
                <span class="article__meta-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
                    <circle cx="12" cy="8" r="3.6" />
                    <path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" />
                  </svg>
                  {{ article.author_name || site.author_name }}
                </span>
                <span class="article__meta-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
                    <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
                    <path d="M8 3v4M16 3v4M3.5 10h17" />
                  </svg>
                  {{ formatDate(article.published_at || article.created_at) }}
                </span>
                <span class="article__meta-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="8.5" />
                    <path d="M12 8v4.4l3 1.8" />
                  </svg>
                  {{ article.reading_minutes || 1 }} 分钟
                </span>
                <span class="article__meta-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M2.5 12s3.6-6.5 9.5-6.5S21.5 12 21.5 12s-3.6 6.5-9.5 6.5S2.5 12 2.5 12z" />
                    <circle cx="12" cy="12" r="2.6" />
                  </svg>
                  {{ formatCount(article.views) }} 阅读
                </span>
                <RouterLink
                  v-if="isAuthor"
                  class="article__edit"
                  :to="{ name: 'ArticleEdit', params: { id: article.id } }"
                >
                  编辑
                </RouterLink>
              </div>
            </header>

            <figure v-if="coverUrl" class="article__cover">
              <img :src="coverUrl" :alt="article.title" />
            </figure>

            <MarkdownView :markdown="article.content || ''" @toc="toc = $event" />

            <section v-if="attachments.length" class="attachments">
              <h2 class="attachments__title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M21 12.5l-8.5 8.5a5.5 5.5 0 0 1-7.8-7.8L13 4.9a3.7 3.7 0 0 1 5.2 5.2L10 18.3a1.9 1.9 0 0 1-2.7-2.7l7.8-7.8" />
                </svg>
                附件（{{ attachments.length }}）
              </h2>
              <ul class="attachments__list">
                <li v-for="a in attachments" :key="a.path" class="attachments__item">
                  <span class="attachments__icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
                      <path d="M14 3v5h5" />
                      <path d="M19 8.5V20a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 20V4.5A1.5 1.5 0 0 1 6.5 3H14z" />
                    </svg>
                  </span>
                  <span class="attachments__info">
                    <span class="attachments__name">{{ a.name }}</span>
                    <span class="attachments__meta">{{ a.mime || '文件' }}</span>
                  </span>
                  <a class="btn btn--sm btn--ghost" :href="assetUrl(a.path)" target="_blank" rel="noopener">
                    下载
                  </a>
                </li>
              </ul>
            </section>

            <div class="article__author">
              <div class="article__author-avatar">{{ (site.author_name || '作').slice(0, 1) }}</div>
              <div>
                <div class="article__author-name">{{ article.author_name || site.author_name }}</div>
                <div class="article__author-bio">{{ site.author_bio }}</div>
              </div>
              <RouterLink class="btn btn--sm btn--ghost" :to="{ name: 'About' }">关于作者</RouterLink>
            </div>

            <nav class="article-nav" aria-label="上一篇下一篇">
              <RouterLink
                v-if="neighbours.prev"
                class="article-nav__item"
                :to="{ name: 'ArticleDetail', params: { slug: neighbours.prev.slug } }"
              >
                <span class="article-nav__label">← 上一篇</span>
                <span class="article-nav__title">{{ neighbours.prev.title }}</span>
              </RouterLink>
              <span v-else class="article-nav__item article-nav__item--empty">已经是最早一篇</span>

              <RouterLink
                v-if="neighbours.next"
                class="article-nav__item article-nav__item--next"
                :to="{ name: 'ArticleDetail', params: { slug: neighbours.next.slug } }"
              >
                <span class="article-nav__label">下一篇 →</span>
                <span class="article-nav__title">{{ neighbours.next.title }}</span>
              </RouterLink>
              <span v-else class="article-nav__item article-nav__item--empty">已经是最新一篇</span>
            </nav>
          </article>

          <aside class="article-side">
            <nav v-if="toc.length" class="toc" aria-label="文章目录">
              <h3 class="toc__title">目录</h3>
              <ul class="toc__list">
                <li
                  v-for="item in toc"
                  :key="item.id"
                  class="toc__item"
                  :class="`toc__item--h${item.level}`"
                >
                  <a :class="{ 'is-active': activeToc === item.id }" :href="`#${item.id}`" @click.prevent="scrollTo(item.id)">
                    {{ item.text }}
                  </a>
                </li>
              </ul>
            </nav>

            <div v-if="article.tags?.length" class="side-card">
              <h3 class="side-card__title">本文标签</h3>
              <div class="side-card__tags">
                <TagPill v-for="tag in article.tags" :key="tag" :slug="tag" size="sm" />
              </div>
            </div>

            <div v-if="related.length" class="side-card">
              <h3 class="side-card__title">相关文章</h3>
              <ul class="side-card__list">
                <li v-for="r in related" :key="r.id">
                  <RouterLink :to="{ name: 'ArticleDetail', params: { slug: r.slug } }">
                    {{ r.title }}
                  </RouterLink>
                  <span>{{ formatDate(r.published_at || r.created_at) }}</span>
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </PageState>
  </div>
</template>
