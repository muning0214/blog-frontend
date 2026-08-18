<template>
  <div class="article-manage">
    <div class="header-row">
      <h2 class="page-title">文章管理</h2>
      <a-button type="primary" @click="router.push('/admin/article/edit')">
        <template #icon><plus-outlined /></template>
        写文章
      </a-button>
    </div>

    <!-- Filter bar -->
    <div class="filter-bar">
      <a-input
        v-model:value="filters.title"
        placeholder="搜索标题"
        allow-clear
        style="width: 200px;"
        @pressEnter="search"
      />
      <a-select
        v-model:value="filters.categoryId"
        placeholder="分类"
        allow-clear
        style="width: 160px;"
        @change="search"
      >
        <a-select-option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</a-select-option>
      </a-select>
      <a-select
        v-model:value="filters.status"
        placeholder="状态"
        allow-clear
        style="width: 120px;"
        @change="search"
      >
        <a-select-option :value="1">已发布</a-select-option>
        <a-select-option :value="0">草稿</a-select-option>
      </a-select>
      <a-button type="primary" @click="search">查询</a-button>
      <a-button @click="resetSearch">重置</a-button>
    </div>

    <!-- Table -->
    <a-table
      :columns="columns"
      :data-source="articles"
      :pagination="pagination"
      :loading="loading"
      row-key="id"
      @change="handleTableChange"
      :scroll="{ x: 800 }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.dataIndex === 'title'">
          <span class="title-cell" @click="previewArticle(record.id)">{{ record.title }}</span>
        </template>
        <template v-if="column.dataIndex === 'status'">
          <a-tag :color="record.status === 1 ? 'green' : 'default'">
            {{ record.status === 1 ? '已发布' : '草稿' }}
          </a-tag>
        </template>
        <template v-if="column.dataIndex === 'isTop'">
          <a-tag :color="record.isTop === 1 ? 'red' : 'blue'">
            {{ record.isTop === 1 ? '置顶' : '普通' }}
          </a-tag>
        </template>
        <template v-if="column.dataIndex === 'createTime'">
          {{ formatDate(record.createTime) }}
        </template>
        <template v-if="column.dataIndex === 'action'">
          <a-button type="link" size="small" @click="editArticle(record.id)">编辑</a-button>
          <a-popconfirm title="确定删除这篇文章吗？" @confirm="handleDelete(record.id)">
            <a-button type="link" danger size="small">删除</a-button>
          </a-popconfirm>
        </template>
      </template>
    </a-table>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { getAdminArticles, deleteArticle } from '@/api/article'
import { getAdminCategories } from '@/api/category'

const router = useRouter()
const loading = ref(false)
const articles = ref([])
const categories = ref([])

const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showTotal: (t) => `共 ${t} 篇`
})

const filters = reactive({
  title: '',
  categoryId: undefined,
  status: undefined
})

const columns = [
  { title: '标题', dataIndex: 'title', width: 200, ellipsis: true },
  { title: '分类', dataIndex: 'categoryName', width: 120 },
  { title: '状态', dataIndex: 'status', width: 100 },
  { title: '置顶', dataIndex: 'isTop', width: 80 },
  { title: '浏览', dataIndex: 'viewCount', width: 80 },
  { title: '创建时间', dataIndex: 'createTime', width: 150 },
  { title: '操作', dataIndex: 'action', width: 140, fixed: 'right' }
]

function formatDate(d) {
  return d ? dayjs(d).format('YYYY-MM-DD HH:mm') : ''
}

async function loadArticles() {
  loading.value = true
  try {
    const res = await getAdminArticles({
      pageNum: pagination.current,
      pageSize: pagination.pageSize,
      title: filters.title || undefined,
      categoryId: filters.categoryId || undefined,
      status: filters.status ?? undefined
    })
    const page = res.data
    articles.value = page.records || []
    pagination.total = page.total || 0
  } finally {
    loading.value = false
  }
}

async function loadCategories() {
  const res = await getAdminCategories()
  categories.value = res.data || []
}

function search() {
  pagination.current = 1
  loadArticles()
}

function resetSearch() {
  filters.title = ''
  filters.categoryId = undefined
  filters.status = undefined
  pagination.current = 1
  loadArticles()
}

function handleTableChange(pag) {
  pagination.current = pag.current
  pagination.pageSize = pag.pageSize
  loadArticles()
}

function editArticle(id) {
  router.push(`/admin/article/edit/${id}`)
}

function previewArticle(id) {
  window.open(`/article/${id}`, '_blank')
}

async function handleDelete(id) {
  try {
    await deleteArticle(id)
    message.success('删除成功')
    loadArticles()
  } catch (e) {
    // handled by interceptor
  }
}

onMounted(() => {
  loadCategories()
  loadArticles()
})
</script>

<style scoped>
.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-title {
  font-size: 22px;
  font-weight: 700;
}

.filter-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.title-cell {
  color: #1677ff;
  cursor: pointer;
}

.title-cell:hover {
  text-decoration: underline;
}
</style>
