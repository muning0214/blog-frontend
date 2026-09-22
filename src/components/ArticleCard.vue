<script setup>
import { RouterLink } from 'vue-router'
import CoverImage from './CoverImage.vue'
import TagPill from './TagPill.vue'
import { formatCount, relativeTime } from '@/utils/format'

/**
 * 文章卡片。
 * props 传整个文章对象而不是拆成零散字段：列表页和首页共用这一个组件，
 * 拆散了以后每加一个展示字段就要同时改两处调用方。
 */
const props = defineProps({
  article: { type: Object, required: true },
  /** wide 用在首页精选位 */
  variant: { type: String, default: 'default' },
})

const detailRoute = computed(() => ({
  name: 'ArticleDetail',
  params: { slug: props.article.slug },
}))
import { computed } from 'vue'
</script>

<template>
  <article class="card" :class="{ 'card--wide': variant === 'wide' }">
    <RouterLink class="card__cover" :to="detailRoute" tabindex="-1">
      <CoverImage :path="article.cover_path" :seed="article.slug" :alt="article.title" />
    </RouterLink>
    <div class="card__body">
      <div class="card__tags">
        <TagPill v-for="tag in article.tags || []" :key="tag" :slug="tag" size="sm" />
      </div>
      <h3 class="card__title">
        <RouterLink :to="detailRoute">{{ article.title }}</RouterLink>
      </h3>
      <p v-if="article.summary" class="card__summary">{{ article.summary }}</p>
      <div class="card__meta">
        <span class="card__meta-item" :title="article.published_at || article.created_at">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
            <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
            <path d="M8 3v4M16 3v4M3.5 10h17" />
          </svg>
          {{ relativeTime(article.published_at || article.created_at) }}
        </span>
        <span class="card__meta-item">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="8.5" />
            <path d="M12 8v4.4l3 1.8" />
          </svg>
          {{ article.reading_minutes || 1 }} 分钟
        </span>
        <span class="card__meta-item">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M2.5 12s3.6-6.5 9.5-6.5S21.5 12 21.5 12s-3.6 6.5-9.5 6.5S2.5 12 2.5 12z" />
            <circle cx="12" cy="12" r="2.6" />
          </svg>
          {{ formatCount(article.views) }}
        </span>
      </div>
    </div>
  </article>
</template>
