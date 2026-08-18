<template>
  <div class="tags-page">
    <h2 class="page-title">标签</h2>
    <a-card>
      <div v-if="loading" class="loading"><a-spin size="large" /></div>
      <a-empty v-else-if="tags.length === 0" description="暂无标签" />
      <div v-else class="tag-cloud">
        <a-tag
          v-for="tag in tags"
          :key="tag.id"
          :color="getTagColor(tag.id)"
          class="tag-item"
          :style="{ fontSize: getFontSize(tag.articleCount) }"
          @click="viewArticles(tag.id, tag.name)"
        >
          {{ tag.name }} ({{ tag.articleCount || 0 }})
        </a-tag>
      </div>
    </a-card>

    <!-- Articles in selected tag -->
    <a-modal
      v-model:open="modalVisible"
      :title="`${selectedTagName} - 文章列表`"
      :footer="null"
      width="700px"
    >
      <div v-if="modalLoading" class="loading"><a-spin /></div>
      <a-empty v-else-if="modalArticles.length === 0" description="该标签下暂无文章" />
      <div v-else class="modal-article-list">
        <div v-for="art in modalArticles" :key="art.id" class="modal-article" @click="goDetail(art.id)">
          <h4>{{ art.title }}</h4>
          <span>{{ formatDate(art.createTime) }}</span>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { getTags } from '@/api/tag'
import { getArticles } from '@/api/article'

const router = useRouter()
const loading = ref(false)
const tags = ref([])

const modalVisible = ref(false)
const modalLoading = ref(false)
const modalArticles = ref([])
const selectedTagName = ref('')

const tagColors = ['magenta', 'blue', 'green', 'orange', 'purple', 'cyan', 'geekblue', 'volcano', 'gold', 'lime']

function getTagColor(id) {
  return tagColors[id % tagColors.length]
}

function getFontSize(count) {
  const c = count || 0
  if (c > 10) return '20px'
  if (c > 5) return '18px'
  if (c > 2) return '16px'
  return '14px'
}

function formatDate(d) {
  return d ? dayjs(d).format('YYYY-MM-DD') : ''
}

async function loadTags() {
  loading.value = true
  try {
    const res = await getTags()
    tags.value = res.data || []
  } finally {
    loading.value = false
  }
}

async function viewArticles(tagId, tagName) {
  selectedTagName.value = tagName
  modalVisible.value = true
  modalLoading.value = true
  try {
    const res = await getArticles({ pageNum: 1, pageSize: 50, tagId })
    modalArticles.value = res.data?.records || []
  } finally {
    modalLoading.value = false
  }
}

function goDetail(id) {
  modalVisible.value = false
  router.push(`/article/${id}`)
}

onMounted(() => {
  loadTags()
})
</script>

<style scoped>
.page-title {
  font-size: 24px;
  margin-bottom: 20px;
  font-weight: 700;
}

.loading {
  text-align: center;
  padding: 60px 0;
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: center;
  padding: 20px 0;
}

.tag-item {
  cursor: pointer;
  padding: 6px 12px;
  transition: transform 0.2s;
}

.tag-item:hover {
  transform: scale(1.1);
}

.modal-article-list {
  max-height: 400px;
  overflow-y: auto;
}

.modal-article {
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
}

.modal-article:hover {
  color: #1677ff;
}

.modal-article h4 {
  font-size: 15px;
  margin-bottom: 4px;
}

.modal-article span {
  font-size: 13px;
  color: #999;
}
</style>
