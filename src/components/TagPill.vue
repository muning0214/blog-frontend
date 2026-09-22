<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

/**
 * 标签胶囊。颜色优先取标签表里配的，取不到就交给 CSS 变量兜底。
 * size='sm' 用在文章卡片与详情页头部，默认尺寸用在标签云。
 */
const props = defineProps({
  slug: { type: String, required: true },
  name: { type: String, default: '' },
  color: { type: String, default: '' },
  count: { type: [Number, String], default: null },
  size: { type: String, default: 'md' },
})

const style = computed(() => (props.color ? { '--tag-color': props.color } : {}))
const label = computed(() => props.name || props.slug)
</script>

<template>
  <RouterLink
    class="tag-pill"
    :class="{ 'tag-pill--sm': size === 'sm' }"
    :style="style"
    :to="{ name: 'ArticleList', query: { tag: slug } }"
  >
    <span class="tag-pill__dot" />
    <span>{{ label }}</span>
    <span v-if="count !== null && count !== ''" class="tag-pill__count">{{ count }}</span>
  </RouterLink>
</template>
