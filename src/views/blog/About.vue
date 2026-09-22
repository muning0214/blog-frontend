<script setup>
import { computed, onMounted, ref } from 'vue'
import { fetchPublishedArticles } from '@/api/article'
import { fetchTagCounts } from '@/api/tag'
import { useSiteSettings } from '@/composables/useSiteSettings'
import { assetUrl } from '@/api/request'
import MarkdownView from '@/components/MarkdownView.vue'
import PageState from '@/components/PageState.vue'

const { site } = useSiteSettings()

const loading = ref(true)
const error = ref('')
const stats = ref({ articles: 0, tags: 0, views: 0 })

const load = async () => {
  loading.value = true
  try {
    const [page, counts] = await Promise.all([
      fetchPublishedArticles({ pageSize: 50 }).catch(() => ({ rows: [] })),
      fetchTagCounts().catch(() => []),
    ])
    stats.value = {
      articles: page.total,
      tags: counts.length,
      views: page.rows.reduce((sum, a) => sum + (a.views || 0), 0),
    }
  } catch (e) {
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(load)

const avatarUrl = computed(() => assetUrl(site.value.avatar_path))
const initial = computed(() => (site.value.author_name || '作').slice(0, 1))
</script>

<template>
  <div class="container section">
    <div class="about-layout">
      <div class="about-side">
        <div class="side-card">
          <div class="about-hero__avatar">{{ initial }}</div>
          <h3 class="side-card__title">{{ site.author_name }}</h3>
          <p class="side-card__list">{{ site.author_bio }}</p>
          <div class="side-card__facts">
            <div class="kv"><span>文章</span><strong>{{ stats.articles }}</strong></div>
            <div class="kv"><span>标签</span><strong>{{ stats.tags }}</strong></div>
            <div class="kv"><span>累计阅读</span><strong>{{ stats.views }}</strong></div>
          </div>
          <a v-if="site.email" class="btn btn--ghost btn--sm" :href="`mailto:${site.email}`">发邮件</a>
        </div>
      </div>

      <div class="about-hero">
        <PageState :loading="loading" :error="error">
          <div class="about-hero__main">
            <span class="hero__eyebrow">关于</span>
            <h1 class="page-head__title">{{ site.site_name }}</h1>
            <p class="hero__tagline">{{ site.tagline }}</p>
            <div v-if="avatarUrl" class="about-hero__links">
              <img class="about-hero__avatar" :src="avatarUrl" :alt="site.author_name" />
            </div>
            <MarkdownView :markdown="site.about_md" />
          </div>
        </PageState>
      </div>
    </div>
  </div>
</template>
