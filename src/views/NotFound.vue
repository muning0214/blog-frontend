<script setup>
import { RouterLink } from 'vue-router'
</script>

<template>
  <div class="container section">
    <div class="state-block state-block--empty">
      <a-result status="404" title="404" sub-title="这个页面不存在，或者链接已经变了。" />
      <div class="state-block__action-row">
        <RouterLink class="btn btn--primary" :to="{ name: 'Home' }">回首页</RouterLink>
        <RouterLink class="btn btn--ghost" :to="{ name: 'ArticleList' }">看文章</RouterLink>
      </div>
    </div>
  </div>
</template>
