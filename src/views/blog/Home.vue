<template>
  <div class="home">
    <!-- Banner -->
    <div class="banner">
      <div class="banner-inner">
        <h1>欢迎来到我的博客</h1>
        <p>分享技术、记录生活、保持热爱</p>
      </div>
    </div>

    <a-row :gutter="24" class="content-row">
      <!-- Article list -->
      <a-col :xs="24" :sm="24" :md="17">
        <div v-if="loading" class="loading">
          <a-spin size="large" />
        </div>
        <template v-else>
          <a-empty v-if="articles.length === 0" description="暂无文章" />
          <div v-else class="article-list">
            <a-card
              v-for="article in articles"
              :key="article.id"
              class="article-card"
              hoverable
              @click="goDetail(article.id)"
            >
              <div class="article-item">
                <div v-if="article.cover" class="article-cover">
                  <img :src="article.cover" :alt="article.title" />
                </div>
                <div class="article-body">
                  <div class="article-title-row">
                    <h3 class="article-title">{{ article.title }}</h3>
                    <a-tag v-if="article.isTop" color="red">置顶</a-tag>
                  </div>
                  <p class="article-summary">{{ article.summary }}</p>
                  <div class="article-meta">
                    <span><calendar-outlined /> {{ formatDate(article.createTime) }}</span>
                    <span v-if="article.categoryName"><folder-outlined /> {{ article.categoryName }}</span>
                    <span><eye-outlined /> {{ article.viewCount }} 阅读</span>
                    <span v-if="article.tagNames">
                      <tags-outlined /> {{ article.tagNames }}
                    </span>
                  </div>
                </div>
              </div>
            </a-card>
          </div>

          <div class="pagination-wrap">
            <a-pagination
              v-model:current="pageNum"
              v-model:pageSize="pageSize"
              :total="total"
              :showTotal="(t) => `共 ${t} 篇`"
              show-size-changer
              @change="loadArticles"
            />
          </div>
        </template>
      </a-col>

      <!-- Sidebar -->
      <a-col :xs="24" :sm="24" :md="7">
        <div class="sidebar">
          <a-card title="分类" class="sidebar-card">
            <div class="category-list">
              <a-tag
                v-for="cat in categories"
                :key="cat.id"
                class="category-tag"
                @click="filterByCategory(cat.id)"
              >
                {{ cat.name }} ({{ cat.articleCount || 0 }})
              </a-tag>
            </div>
          </a-card>

          <a-card title="标签" class="sidebar-card">
            <div class="tag-cloud">
              <a-tag
                v-for="tag in tags"
                :key="tag.id"
                :color="getTagColor(tag.id)"
                class="tag-item"
                @click="filterByTag(tag.id)"
              >
                {{ tag.name }} ({{ tag.articleCount || 0 }})
              </a-tag>
            </div>
          </a-card>
        </div>
      </a-col>
    </a-row>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  CalendarOutlined,
  FolderOutlined,
  EyeOutlined,
  TagsOutlined
} from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { getArticles } from '@/api/article'
import { getCategories } from '@/api/category'
import { getTags } from '@/api/tag'

const router = useRouter()

const loading = ref(false)
const articles = ref([])
const total = ref(0)
const pageNum = ref(1)
const pageSize = ref(10)

const categories = ref([])
const tags = ref([])

const filterCategoryId = ref(null)
const filterTagId = ref(null)

const tagColors = ['magenta', 'blue', 'green', 'orange', 'purple', 'cyan', 'geekblue', 'volcano']

function getTagColor(id) {
  return tagColors[id % tagColors.length]
}

function formatDate(d) {
  return d ? dayjs(d).format('YYYY-MM-DD') : ''
}

async function loadArticles() {
  loading.value = true
  try {
    const res = await getArticles({
      pageNum: pageNum.value,
      pageSize: pageSize.value,
      categoryId: filterCategoryId.value,
      tagId: filterTagId.value
    })
    const page = res.data
    articles.value = page.records || []
    total.value = page.total || 0
  } finally {
    loading.value = false
  }
}

async function loadSidebar() {
  const [catRes, tagRes] = await Promise.all([getCategories(), getTags()])
  categories.value = catRes.data || []
  tags.value = tagRes.data || []
}

function goDetail(id) {
  router.push(`/article/${id}`)
}

function filterByCategory(id) {
  filterCategoryId.value = filterCategoryId.value === id ? null : id
  filterTagId.value = null
  pageNum.value = 1
  loadArticles()
}

function filterByTag(id) {
  filterTagId.value = filterTagId.value === id ? null : id
  filterCategoryId.value = null
  pageNum.value = 1
  loadArticles()
}

onMounted(() => {
  loadArticles()
  loadSidebar()
})
</script>

<style scoped>
.banner {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  padding: 60px 0;
  border-radius: 12px;
  margin-bottom: 24px;
  text-align: center;
}

.banner h1 {
  font-size: 32px;
  margin-bottom: 8px;
}

.banner p {
  font-size: 16px;
  opacity: 0.9;
}

.loading {
  text-align: center;
  padding: 80px 0;
}

.article-card {
  margin-bottom: 16px;
  cursor: pointer;
  transition: box-shadow 0.3s;
}

.article-item {
  display: flex;
  gap: 16px;
}

.article-cover {
  flex-shrink: 0;
  width: 200px;
  height: 130px;
  overflow: hidden;
  border-radius: 8px;
}

.article-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.article-body {
  flex: 1;
  min-width: 0;
}

.article-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.article-title {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.article-summary {
  color: #666;
  font-size: 14px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 12px;
}

.article-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  font-size: 13px;
  color: #999;
}

.article-meta span {
  display: flex;
  align-items: center;
  gap: 4px;
}

.pagination-wrap {
  text-align: center;
  margin-top: 24px;
}

.sidebar-card {
  margin-bottom: 16px;
}

.category-tag,
.tag-item {
  cursor: pointer;
  margin-bottom: 6px;
}

/* Mobile */
@media (max-width: 768px) {
  .article-cover {
    width: 100%;
    height: 180px;
    margin-bottom: 12px;
  }

  .article-item {
    flex-direction: column;
  }

  .article-meta {
    gap: 10px;
    font-size: 12px;
  }

  .banner {
    padding: 36px 0;
  }

  .banner h1 {
    font-size: 24px;
  }
}
</style>
