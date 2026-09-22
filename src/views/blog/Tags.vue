<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { fetchTagCounts } from '@/api/tag'
import { fetchPublishedArticles } from '@/api/article'
import PageState from '@/components/PageState.vue'
import TagPill from '@/components/TagPill.vue'
import { formatDate } from '@/utils/format'

const loading = ref(true)
const error = ref('')
const counts = ref([])
const articles = ref([])

/** 标签名按文章数决定气泡大小，给标签云一点层次感 */
const bubbleSize = (count) => {
  if (count >= 5) return 'lg'
  if (count >= 2) return 'md'
  return 'sm'
}

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const [counts_, page] = await Promise.all([
      fetchTagCounts(),
      fetchPublishedArticles({ pageSize: 50 }).catch(() => ({ rows: [] })),
    ])
    counts.value = counts_
    articles.value = page.rows
  } catch (e) {
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(load)

const totalTagged = computed(() => counts.value.reduce((sum, t) => sum + t.article_count, 0))
</script>

<template>
  <div class="container section">
    <header class="page-head">
      <h1 class="page-head__title">标签</h1>
      <p class="page-head__sub">
        {{ counts.length }} 个标签 · 覆盖 {{ totalTagged }} 篇文章
      </p>
    </header>

    <PageState :loading="loading" :error="error" :empty="!counts.length" empty-text="还没有任何标签">
      <div class="tag-cloud tag-cloud--big">
        <RouterLink
          v-for="tag in counts"
          :key="tag.tag"
          class="tag-bubble"
          :to="{ name: 'ArticleList', query: { tag: tag.tag } }"
        >
          <span class="tag-bubble__dot" />
          {{ tag.tag }}
          <span class="tag-bubble__count">{{ tag.article_count }}</span>
        </RouterLink>
      </div>

      <table v-if="counts.length" class="tag-table">
        <thead>
          <tr class="tag-table__head">
            <th>标签</th>
            <th class="tag-table__count">文章数</th>
            <th class="tag-table__date">最近更新</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="tag in counts" :key="tag.tag" class="tag-table__row">
            <td>
              <TagPill :slug="tag.tag" />
            </td>
            <td class="tag-table__count">{{ tag.article_count }}</td>
            <td class="tag-table__date">
              {{ formatDate(tag.latest_at) || '—' }}
            </td>
          </tr>
        </tbody>
      </table>
    </PageState>
  </div>
</template>
