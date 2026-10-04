<template>
  <div class="home">
    <div class="home-body">
      <CategoryNav
        :categories="categories"
        v-model="activeCat"
        @change="onCatChange"
      />
      <section class="main">
        <div class="section-head">
          <h2>{{ currentCatName }}</h2>
          <span class="hint">共 {{ total }} 个视频</span>
        </div>

        <div v-loading="loading" class="grid">
          <VideoCard v-for="v in videos" :key="v.id" :video="v" />
          <div v-if="!loading && videos.length === 0" class="empty">
            该分区暂无视频，去 <router-link to="/upload">投稿</router-link> 第一个吧！
          </div>
        </div>

        <div class="pager" v-if="total > pageSize">
          <el-pagination
            background
            layout="prev, pager, next"
            :total="total"
            :page-size="pageSize"
            :current-page="current"
            @current-change="onPage"
          />
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CategoryNav from '@/components/CategoryNav.vue'
import VideoCard from '@/components/VideoCard.vue'
import { listVideos } from '@/api/video'

// 与后端 category_id 对齐（演示用分区，可按实际业务扩展）
const categories = [
  { id: '', name: '推荐' },
  { id: 1, name: '动画' },
  { id: 2, name: '番剧' },
  { id: 3, name: '音乐' },
  { id: 4, name: '游戏' },
  { id: 5, name: '科技' },
  { id: 6, name: '生活' },
  { id: 7, name: '影视' }
]

const route = useRoute()
const router = useRouter()

const activeCat = ref(route.query.cat || '')
const videos = ref([])
const total = ref(0)
const current = ref(1)
const pageSize = ref(12)
const loading = ref(false)

const currentCatName = computed(() => {
  const c = categories.find((x) => String(x.id) === String(activeCat.value))
  return c ? c.name : '推荐'
})

async function fetchList() {
  loading.value = true
  try {
    const params = { current: current.value, size: pageSize.value }
    if (activeCat.value !== '' && activeCat.value !== undefined) {
      params.categoryId = activeCat.value
    }
    const page = await listVideos(params)
    videos.value = page.records || []
    total.value = page.total || 0
  } catch (e) {
    // 接口异常（如未登录、网络错误）时不抛出未处理的 Promise rejection，
    // 由 request 拦截器统一提示；这里兜底清空列表
    videos.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function onCatChange(id) {
  current.value = 1
  router.replace({ path: '/', query: id ? { cat: id } : {} })
}
function onPage(p) {
  current.value = p
  fetchList()
}

onMounted(fetchList)
watch(() => route.query.cat, (v) => {
  activeCat.value = v || ''
  current.value = 1
  fetchList()
})
</script>

<style scoped>
.home-body {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}
.main {
  flex: 1;
  min-width: 0;
}
.section-head {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 14px;
}
.section-head h2 {
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
.pager {
  margin-top: 24px;
  display: flex;
  justify-content: center;
}
</style>
