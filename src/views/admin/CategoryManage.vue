<template>
  <div class="category-manage">
    <div class="header-row">
      <h2 class="page-title">分类管理</h2>
      <a-button type="primary" @click="openCreate">
        <template #icon><plus-outlined /></template>
        新建分类
      </a-button>
    </div>

    <a-table
      :columns="columns"
      :data-source="categories"
      :loading="loading"
      row-key="id"
      :pagination="false"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.dataIndex === 'action'">
          <a-button type="link" size="small" @click="openEdit(record)">编辑</a-button>
          <a-popconfirm title="确定删除该分类吗？" @confirm="handleDelete(record.id)">
            <a-button type="link" danger size="small">删除</a-button>
          </a-popconfirm>
        </template>
      </template>
    </a-table>

    <!-- Create / Edit modal -->
    <a-modal
      v-model:open="modalVisible"
      :title="editingId ? '编辑分类' : '新建分类'"
      @ok="handleSubmit"
      :confirm-loading="submitting"
    >
      <a-form layout="vertical" :model="form">
        <a-form-item label="分类名称" required>
          <a-input v-model:value="form.name" placeholder="请输入分类名称" />
        </a-form-item>
        <a-form-item label="排序">
          <a-input-number v-model:value="form.sort" :min="0" style="width: 100%;" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import {
  getAdminCategories,
  createCategory,
  updateCategory,
  deleteCategory
} from '@/api/category'

const loading = ref(false)
const categories = ref([])

const modalVisible = ref(false)
const submitting = ref(false)
const editingId = ref(null)

const form = reactive({
  name: '',
  sort: 0
})

const columns = [
  { title: 'ID', dataIndex: 'id', width: 80 },
  { title: '分类名称', dataIndex: 'name' },
  { title: '排序', dataIndex: 'sort', width: 100 },
  { title: '创建时间', dataIndex: 'createTime', width: 180 },
  { title: '操作', dataIndex: 'action', width: 160 }
]

async function loadCategories() {
  loading.value = true
  try {
    const res = await getAdminCategories()
    categories.value = res.data || []
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editingId.value = null
  form.name = ''
  form.sort = 0
  modalVisible.value = true
}

function openEdit(record) {
  editingId.value = record.id
  form.name = record.name
  form.sort = record.sort
  modalVisible.value = true
}

async function handleSubmit() {
  if (!form.name.trim()) {
    message.warning('请输入分类名称')
    return
  }
  submitting.value = true
  try {
    if (editingId.value) {
      await updateCategory(editingId.value, { ...form })
      message.success('更新成功')
    } else {
      await createCategory({ ...form })
      message.success('创建成功')
    }
    modalVisible.value = false
    loadCategories()
  } catch (e) {
    // handled by interceptor
  } finally {
    submitting.value = false
  }
}

async function handleDelete(id) {
  try {
    await deleteCategory(id)
    message.success('删除成功')
    loadCategories()
  } catch (e) {
    // handled by interceptor
  }
}

onMounted(() => {
  loadCategories()
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
</style>
