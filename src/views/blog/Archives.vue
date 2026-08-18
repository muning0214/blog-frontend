<template>
  <div class="archives-page">
    <h2 class="page-title">归档</h2>
    <a-card>
      <div v-if="loading" class="loading"><a-spin /></div>
      <a-empty v-else-if="groups.length === 0" description="暂无文章" />
      <div v-else>
        <div v-for="group in groups" :key="group.label" class="archive-group">
          <h3 class="group-title">{{ group.label }} <span class="count">({{ group.items.length }} 篇)</span></h3>
          <ul class="archive-list">
            <li v-for="item in group.items" :key="item.id" @click="goDetail(item.id)">
              <span class="date">{{ formatDate(item.createTime) }}</span>
              <span class="title">{{ item.title }}</span>
            </li>
          </ul>
        </div>
      </div>
      <div class="pagination-wrap" v-if="total > pageSize">
        <a-pagination
          v-model:current="pageNum"
          :total="total"
          :pageSize="pageSize"
          @change="loadArchives"
        />
      </div>
    </a-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { getArchives } from '@/api/article'

const router = useRouter()
const loading = ref(false)
const pageNum = ref(1)
const pageSize = ref(100)
const total = ref(0)
const groups = ref([])

function formatDate(d) {
  return d ? dayjs(d).format('MM-DD') : ''
}

async function loadArchives() {
  loading.value = true
  try {
    const res = await getArchives({ pageNum: pageNum.value, pageSize: pageSize.value })
    const page = res.data
    const records = page.records || []
    total.value = page.total || 0
    // Group by year-month
    const map = {}
    for (const r of records) {
      const label = dayjs(r.createTime).format('YYYY年MM月')
      if (!map[label]) map[label] = []
      map[label].push(r)
    }
    groups.value = Object.keys(map).sort((a, b) => b.localeCompare(a)).map(label => ({ label, items: map[label] }))
  } finally {
    loading.value = false
  }
}

function goDetail(id) {
  router.push(`/article/${id}`)
}

onMounted(() => {
  loadArchives()
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
  padding: 40px 0;
}

.archive-group {
  margin-bottom: 28px;
}

.group-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 12px;
  padding-left: 12px;
  border-left: 4px solid #1677ff;
}

.count {
  font-size: 14px;
  color: #999;
  font-weight: 400;
}

.archive-list {
  list-style: none;
  padding: 0;
}

.archive-list li {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 8px;
  cursor: pointer;
  border-radius: 6px;
  transition: background 0.2s;
}

.archive-list li:hover {
  background: #f5f5f5;
}

.date {
  color: #999;
  font-size: 14px;
  flex-shrink: 0;
  width: 50px;
}

.title {
  color: #333;
  font-size: 15px;
}

.pagination-wrap {
  text-align: center;
  margin-top: 24px;
}

@media (max-width: 768px) {
  .archive-list li {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .date {
    width: auto;
    font-size: 12px;
  }
}
</style>
