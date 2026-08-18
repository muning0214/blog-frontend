<template>
  <div class="comment-manage">
    <div class="header-row">
      <h2 class="page-title">评论审核</h2>
    </div>

    <!-- Filter -->
    <div class="filter-bar">
      <a-radio-group v-model:value="filterStatus" @change="onFilterChange">
        <a-radio-button :value="undefined">全部</a-radio-button>
        <a-radio-button :value="0">待审核</a-radio-button>
        <a-radio-button :value="1">已通过</a-radio-button>
        <a-radio-button :value="2">已拒绝</a-radio-button>
      </a-radio-group>
    </div>

    <a-table
      :columns="columns"
      :data-source="comments"
      :loading="loading"
      row-key="id"
      :pagination="pagination"
      @change="handleTableChange"
      :scroll="{ x: 800 }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.dataIndex === 'content'">
          <a-tooltip :title="record.content">
            <span class="content-cell">{{ record.content }}</span>
          </a-tooltip>
        </template>
        <template v-if="column.dataIndex === 'status'">
          <a-tag :color="statusColor(record.status)">
            {{ statusText(record.status) }}
          </a-tag>
        </template>
        <template v-if="column.dataIndex === 'createTime'">
          {{ formatDate(record.createTime) }}
        </template>
        <template v-if="column.dataIndex === 'action'">
          <template v-if="record.status === 0">
            <a-button type="link" size="small" @click="handleApprove(record.id)">通过</a-button>
            <a-button type="link" danger size="small" @click="handleReject(record.id)">拒绝</a-button>
          </template>
          <a-popconfirm title="确定删除该评论吗？" @confirm="handleDelete(record.id)">
            <a-button type="link" danger size="small">删除</a-button>
          </a-popconfirm>
        </template>
      </template>
    </a-table>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import {
  getAdminComments,
  updateCommentStatus,
  deleteComment
} from '@/api/comment'

const loading = ref(false)
const comments = ref([])
const filterStatus = ref(undefined)

const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showTotal: (t) => `共 ${t} 条`
})

const columns = [
  { title: 'ID', dataIndex: 'id', width: 70 },
  { title: '文章ID', dataIndex: 'articleId', width: 80 },
  { title: '昵称', dataIndex: 'nickname', width: 100 },
  { title: '邮箱', dataIndex: 'email', width: 160, ellipsis: true },
  { title: '评论内容', dataIndex: 'content', width: 250, ellipsis: true },
  { title: '状态', dataIndex: 'status', width: 100 },
  { title: '时间', dataIndex: 'createTime', width: 150 },
  { title: '操作', dataIndex: 'action', width: 180, fixed: 'right' }
]

function formatDate(d) {
  return d ? dayjs(d).format('YYYY-MM-DD HH:mm') : ''
}

function statusText(s) {
  return s === 0 ? '待审核' : s === 1 ? '已通过' : '已拒绝'
}

function statusColor(s) {
  return s === 0 ? 'orange' : s === 1 ? 'green' : 'red'
}

async function loadComments() {
  loading.value = true
  try {
    const res = await getAdminComments({
      pageNum: pagination.current,
      pageSize: pagination.pageSize,
      status: filterStatus.value ?? undefined
    })
    const page = res.data
    comments.value = page.records || []
    pagination.total = page.total || 0
  } finally {
    loading.value = false
  }
}

function onFilterChange() {
  pagination.current = 1
  loadComments()
}

function handleTableChange(pag) {
  pagination.current = pag.current
  pagination.pageSize = pag.pageSize
  loadComments()
}

async function handleApprove(id) {
  try {
    await updateCommentStatus(id, 1)
    message.success('已通过')
    loadComments()
  } catch (e) {
    // handled by interceptor
  }
}

async function handleReject(id) {
  try {
    await updateCommentStatus(id, 2)
    message.success('已拒绝')
    loadComments()
  } catch (e) {
    // handled by interceptor
  }
}

async function handleDelete(id) {
  try {
    await deleteComment(id)
    message.success('删除成功')
    loadComments()
  } catch (e) {
    // handled by interceptor
  }
}

onMounted(() => {
  loadComments()
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
  margin-bottom: 16px;
}

.content-cell {
  display: inline-block;
  max-width: 250px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
