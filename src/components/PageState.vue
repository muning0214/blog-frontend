<script setup>
/**
 * 统一的加载 / 出错 / 空态。
 * 骨架用自己的 state-block 样式，图标件用 antd 的 Spin 与 Empty ——
 * 两者拼起来比自己写转圈动画省事，观感也统一。
 */
defineProps({
  loading: { type: Boolean, default: false },
  loadingLabel: { type: String, default: '正在加载…' },
  error: { type: String, default: '' },
  errorTitle: { type: String, default: '加载失败' },
  empty: { type: Boolean, default: false },
  emptyText: { type: String, default: '暂无内容' },
})
</script>

<template>
  <div v-if="loading" class="state-block">
    <a-spin size="large" />
    <p class="state-block__desc">{{ loadingLabel }}</p>
  </div>

  <div v-else-if="error" class="state-block state-block--error">
    <div class="state-block__icon state-block__icon--warn">!</div>
    <h3 class="state-block__title">{{ errorTitle }}</h3>
    <p class="state-block__desc">{{ error }}</p>
    <div v-if="$slots.action" class="state-block__action-row">
      <slot name="action" />
    </div>
  </div>

  <div v-else-if="empty" class="state-block state-block--empty">
    <a-empty :description="emptyText" />
    <div v-if="$slots.action" class="state-block__action-row">
      <slot name="action" />
    </div>
  </div>

  <slot v-else />
</template>
