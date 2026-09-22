<script setup>
import { computed } from 'vue'
import { assetUrl } from '@/api/request'
import { coverGradient } from '@/utils/format'

/**
 * 封面图。
 * 数据库存的是对象键（covers/xxx.png），这里解析成可访问地址；
 * 没有封面时用标题首字 + 由 slug 生成的稳定渐变兜底，
 * 保证列表里不会出现破图或大片空白。
 */
const props = defineProps({
  path: { type: String, default: null },
  seed: { type: String, default: '' },
  title: { type: String, default: '' },
  alt: { type: String, default: '' },
})

const url = computed(() => assetUrl(props.path))
const gradient = computed(() => coverGradient(props.seed || props.title || 'post'))
const glyph = computed(() => (props.title || '文').trim().slice(0, 1))
</script>

<template>
  <img v-if="url" class="cover-img" :src="url" :alt="alt || title" loading="lazy" decoding="async" />
  <div v-else class="cover-fallback" :style="{ background: gradient }">
    <span class="cover-fallback__grid" />
    <span class="cover-fallback__glyph">{{ glyph }}</span>
  </div>
</template>
