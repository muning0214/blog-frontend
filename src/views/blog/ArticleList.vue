<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fetchPublishedArticles } from '@/api/article'
import { fetchTagCounts } from '@/api/tag'
import ArticleCard from '@/components/ArticleCard.vue'
import PageState from '@/components/PageState.vue'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const error = ref('')
const paged = ref({ rows: [], total: 0, page: 1, totalPages: 1 })
const tags = ref([])

const keywordInput = ref(String(route.query.q || ''))

const query = computed(() => ({
  q: String(route.query.q || ''),
  tag: String(route.query.tag || ''),
  page: Math.max(1, Number(route.query.page) || 1),
}))

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const [page, counts] = await Promise.all([
      fetchPublishedArticles({
        keyword: query.value.q,
        tag: query.value.tag,
        page: query.value.page,
        pageSize: 9,
      }),
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
watch(query, load)

const applySearch = () => {
  router.push({
    name: 'ArticleList',
    query: { ...route.query, q: keywordInput.value.trim() || undefined, page: undefined },
  })
}

const goPage = (page) => {
  if (page < 1 || page > paged.value.totalPages || page === query.value.page) return
  router.push({ name: 'ArticleList', query: { ...route.query, page: page > 1 ? page : undefined } })
}

/** 页码条：当前页前后各 1 页，其余用省略号 */
const pages = computed(() => {
  const total = paged.value.totalPages
  const current = query.value.page
  const out = []
  for (let p = 1; p <= total; p++) {
    if (p === 1 || p === total || Math.abs(p - current) <= 1) {
      out.push(p)
    } else if (out[out.length - 1] !== '…') {
      out.push('…')
    }
  }
  return out
})

const clearFilters = () => router.push({ name: 'ArticleList' })
</script>

<template>
  <div class="container section">
    <header class="page-head">
      <h1 class="page-head__title">文章</h1>
      <p class="page-head__sub">
        共 {{ paged.total }} 篇<template v-if="query.tag"> · 标签「{{ query.tag }}」</template
        ><template v-if="query.q"> · 关键词「{{ query.q }}」</template>
      </p>
    </header>

    <div class="toolbar">
      <form class="toolbar__search" role="search" @submit.prevent="applySearch">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.6-3.6" />
        </svg>
        <input v-model="keywordInput" type="search" placeholder="搜索标题、摘要或正文…" aria-label="搜索文章" />
      </form>
      <div class="toolbar__filters toolbar__filters--scroll">
        <button
          class="filter-chip"
          :class="{ 'filter-chip--ghost': !query.tag }"
          type="button"
          @click="clearFilters"
        >
          全部
        </button>
        <button
          v-for="tag in tags"
          :key="tag.tag"
          class="filter-chip"
          :class="{ 'filter-chip--ghost': query.tag !== tag.tag }"
          type="button"
          @click="router.push({ name: 'ArticleList', query: { tag: tag.tag } })"
        >
          {{ tag.tag }}
          <span>{{ tag.article_count }}</span>
        </button>
      </div>
    </div>

    <PageState
      :loading="loading"
      :error="error"
      :empty="!paged.rows.length"
      empty-text="没有匹配的文章，换个关键词或标签试试"
    >
      <template #action>
        <button class="btn btn--primary" type="button" @click="clearFilters">清除筛选</button>
      </template>

      <div class="card-grid">
        <ArticleCard v-for="article in paged.rows" :key="article.id" :article="article" />
      </div>

      <nav v-if="paged.totalPages > 1" class="pagination" aria-label="分页">
        <button
          class="pagination__nav"
          type="button"
          :disabled="query.page <= 1"
          @click="goPage(query.page - 1)"
        >
          上一页
        </button>
        <template v-for="(p, i) in pages" :key="`${p}-${i}`">
          <span v-if="p === '…'" class="pagination__gap">…</span>
          <button
            v-else
            class="pagination__page"
            :class="{ 'is-on': p === query.page }"
            type="button"
            @click="goPage(p)"
          >
            {{ p }}
          </button>
        </template>
        <button
          class="pagination__nav"
          type="button"
          :disabled="query.page >= paged.totalPages"
          @click="goPage(query.page + 1)"
        >
          下一页
        </button>
      </nav>
    </PageState>
  </div>
</template>
