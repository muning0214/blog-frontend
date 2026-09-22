<script setup>
import { RouterLink } from 'vue-router'
import CoverImage from './CoverImage.vue'
import { formatCount, relativeTime } from '@/utils/format'

/** 工作台里的一行文章：缩略图 + 标题与状态 + 操作按钮（由调用方给） */
defineProps({
  article: { type: Object, required: true },
})
</script>

<template>
  <div class="row-item">
    <div class="row-item__thumb">
      <CoverImage :path="article.cover_path" :seed="article.slug" :alt="article.title" />
    </div>
    <div class="row-item__main">
      <div class="row-item__top">
        <RouterLink
          class="row-item__title"
          :to="{ name: 'ArticleDetail', params: { slug: article.slug } }"
        >
          {{ article.title }}
        </RouterLink>
        <span class="badge" :class="article.status === 'published' ? 'badge--ok' : 'badge--draft'">
          {{ article.status === 'published' ? '已发布' : '草稿' }}
        </span>
        <span v-if="article.featured" class="badge badge--star">精选</span>
      </div>
      <div class="row-item__meta">
        <span>{{ relativeTime(article.updated_at) }} 更新</span>
        <span>·</span>
        <span>{{ formatCount(article.views) }} 阅读</span>
        <span>·</span>
        <span>{{ (article.tags || []).join(' / ') || '无标签' }}</span>
      </div>
    </div>
    <div class="row-item__actions">
      <slot name="actions" />
    </div>
  </div>
</template>
