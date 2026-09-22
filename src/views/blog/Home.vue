<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { fetchPublishedArticles } from '@/api/article'
import { fetchTagCounts } from '@/api/tag'
import { useSiteSettings } from '@/composables/useSiteSettings'
import { formatDateShort, formatCount } from '@/utils/format'
import ArticleCard from '@/components/ArticleCard.vue'
import CoverImage from '@/components/CoverImage.vue'
import PageState from '@/components/PageState.vue'
import TagPill from '@/components/TagPill.vue'

const { site } = useSiteSettings()

const loading = ref(true)
const error = ref('')
const paged = ref({ rows: [], total: 0 })
const tags = ref([])

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const [page, counts] = await Promise.all([
      fetchPublishedArticles({ pageSize: 7 }),
      fetchTagCounts().catch(() => []),
    ])
    paged.value = page
    tags.value = counts
  } catch (e) {
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(load)

const rows = computed(() => paged.value.rows)
/** 优先取标记了精选的；一篇都没有时取最新一篇 */
const featured = computed(() => rows.value.find((a) => a.featured) || rows.value[0] || null)
const latest = computed(() => rows.value.filter((a) => a !== featured.value))
const totalViews = computed(() => rows.value.reduce((sum, a) => sum + (a.views || 0), 0))
</script>

<template>
  <div>
    <PageState :loading="loading" :error="error" loading-label="正在加载首页…">
      <template #action>
        <button class="btn btn--primary" type="button" @click="load">重新加载</button>
      </template>

      <section class="hero">
        <div class="container hero__inner">
          <div class="hero__left">
            <span class="hero__eyebrow">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M12 3l2.2 5.4L20 10l-5.8 1.6L12 17l-2.2-5.4L4 10l5.8-1.6z" />
              </svg>
              个人技术博客
            </span>
            <h1 class="hero__title">{{ site.site_name }}</h1>
            <p class="hero__tagline">{{ site.tagline }}</p>
            <p class="hero__desc">{{ site.author_bio }}</p>
            <div class="hero__actions">
              <RouterLink class="btn btn--primary" :to="{ name: 'ArticleList' }">浏览全部文章</RouterLink>
              <RouterLink class="btn btn--ghost" :to="{ name: 'Tags' }">按标签浏览</RouterLink>
            </div>
            <dl class="hero__stats">
              <div>
                <dt>已发布</dt>
                <dd>{{ paged.total }}</dd>
              </div>
              <div>
                <dt>标签</dt>
                <dd>{{ tags.length }}</dd>
              </div>
              <div>
                <dt>近期阅读</dt>
                <dd>{{ formatCount(totalViews) }}</dd>
              </div>
            </dl>
          </div>

          <RouterLink
            v-if="featured"
            class="hero__feature"
            :to="{ name: 'ArticleDetail', params: { slug: featured.slug } }"
          >
            <div class="hero__feature-cover">
              <CoverImage :path="featured.cover_path" :seed="featured.slug" :alt="featured.title" />
            </div>
            <div class="hero__feature-body">
              <span class="hero__feature-badge">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M12 3l2.2 5.4L20 10l-5.8 1.6L12 17l-2.2-5.4L4 10l5.8-1.6z" />
                </svg>
                精选
              </span>
              <h2>{{ featured.title }}</h2>
              <p v-if="featured.summary">{{ featured.summary }}</p>
              <div class="hero__feature-meta">
                <span>{{ formatDateShort(featured.published_at || featured.created_at) }}</span>
                <span>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="8.5" />
                    <path d="M12 8v4.4l3 1.8" />
                  </svg>
                  {{ featured.reading_minutes || 1 }} 分钟
                </span>
                <span>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M2.5 12s3.6-6.5 9.5-6.5S21.5 12 21.5 12s-3.6 6.5-9.5 6.5S2.5 12 2.5 12z" />
                    <circle cx="12" cy="12" r="2.6" />
                  </svg>
                  {{ formatCount(featured.views) }}
                </span>
              </div>
            </div>
          </RouterLink>
        </div>
      </section>

      <section class="container section">
        <header class="section__head">
          <div>
            <h2 class="section__title">最新文章</h2>
            <p class="section__sub">按发布时间倒序，精选优先</p>
          </div>
          <RouterLink class="link-more" :to="{ name: 'ArticleList' }">
            查看全部
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </RouterLink>
        </header>

        <div v-if="latest.length" class="card-grid">
          <ArticleCard v-for="article in latest" :key="article.id" :article="article" />
        </div>

        <div v-else-if="!loading && paged.total === 0" class="state-block state-block--empty">
          <a-empty description="还没有已发布的文章" />
          <div class="state-block__action-row">
            <RouterLink class="btn btn--primary" :to="{ name: 'Login' }">登录后写第一篇</RouterLink>
          </div>
        </div>
      </section>

      <section v-if="tags.length" class="container section">
        <header class="section__head">
          <div>
            <h2 class="section__title">按标签浏览</h2>
            <p class="section__sub">标签由作者在写作时指定</p>
          </div>
          <RouterLink class="link-more" :to="{ name: 'Tags' }">
            全部标签
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </RouterLink>
        </header>
        <div class="tag-cloud">
          <TagPill
            v-for="tag in tags.slice(0, 12)"
            :key="tag.tag"
            :slug="tag.tag"
            :count="tag.article_count"
          />
        </div>
      </section>
    </PageState>
  </div>
</template>
