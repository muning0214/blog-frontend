<template>
  <div class="categories-page">
    <h2 class="page-title">分类</h2>
    <div v-if="loading" class="loading"><a-spin size="large" /></div>
    <a-empty v-else-if="categories.length === 0" description="暂无分类" />
    <div v-else class="category-grid">
      <a-card
        v-for="cat in categories"
        :key="cat.id"
        class="category-card"
        hoverable
        @click="viewArticles(cat.id)"
      >
        <div class="category-content">
          <folder-outlined class="cat-icon" />
          <h3 class="cat-name">{{ cat.name }}</h3>
          <p class="cat-count">{{ cat.articleCount || 0 }} 篇文章</p>
        </div>
      </a-card>
    </div>

    <!-- Articles in selected category -->
    <a-modal
      v-model:open="modalVisible"
      :title="`${selectedCategoryName} - 文章列表`"
      :footer="null"
      width="700px"
    >
      <div v-if="modalLoading" class="loading"><a-spin /></div>
      <a-empty v-else-if="modalArticles.length === 0" description="该分类下暂无文章" />
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
import { FolderOutlined } from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { getCategories } from '@/api/category'
import { getArticles } from '@/api/article'

const router = useRouter()
const loading = ref(false)
const categories = ref([])

const modalVisible = ref(false)
const modalLoading = ref(false)
const modalArticles = ref([])
const selectedCategoryName = ref('')

function formatDate(d) {
  return d ? dayjs(d).format('YYYY-MM-DD') : ''
}

async function loadCategories() {
  loading.value = true
  try {
    const res = await getCategories()
    categories.value = res.data || []
  } finally {
    loading.value = false
  }
}

async function viewArticles(categoryId) {
  const cat = categories.value.find(c => c.id === categoryId)
  selectedCategoryName.value = cat?.name || ''
  modalVisible.value = true
  modalLoading.value = true
  try {
    const res = await getArticles({ pageNum: 1, pageSize: 50, categoryId })
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
  loadCategories()
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

.category-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}

.category-card {
  text-align: center;
  cursor: pointer;
}

.category-content {
  padding: 8px 0;
}

.cat-icon {
  font-size: 36px;
  color: #1677ff;
  margin-bottom: 12px;
}

.cat-name {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 6px;
}

.cat-count {
  color: #999;
  font-size: 14px;
  margin: 0;
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

@media (max-width: 768px) {
  .category-grid {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
