<template>
  <div class="search">
    <div class="head">
      <h2>搜索：{{ keyword }}</h2>
      <span class="hint">共 {{ total }} 个结果</span>
    </div>
    <div v-loading="loading" class="grid">
      <VideoCard v-for="v in videos" :key="v.id" :video="v" />
      <div v-if="!loading && videos.length === 0" class="empty">没有找到相关视频</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import VideoCard from '@/components/VideoCard.vue'
import { listVideos } from '@/api/video'

const route = useRoute()
const keyword = ref(route.query.keyword || '')
const videos = ref([])
const total = ref(0)
const loading = ref(false)

async function fetchList() {
  loading.value = true
  try {
    const page = await listVideos({ current: 1, size: 24, keyword: keyword.value })
    videos.value = page.records || []
    total.value = page.total || 0
  } finally {
    loading.value = false
  }
}

onMounted(fetchList)
watch(() => route.query.keyword, (v) => {
  keyword.value = v || ''
  fetchList()
})
</script>

<style scoped>
.head {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 14px;
}
.head h2 {
  margin: 0;
  font-size: 20px;
}
.hint {
  color: var(--vp-text-2);
  font-size: 13px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}
.empty {
  grid-column: 1 / -1;
  text-align: center;
  color: var(--vp-text-2);
  padding: 40px 0;
}
</style>
