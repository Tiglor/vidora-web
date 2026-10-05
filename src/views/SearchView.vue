<template>
  <div class="search">
    <div class="search-body">
      <section class="main">
        <div class="head">
          <h2>搜索：{{ keyword }}</h2>
          <span class="hint">共 {{ total }} 个结果</span>
        </div>
        <div v-loading="loading" class="grid">
          <VideoCard v-for="v in videos" :key="v.id" :video="v" />
          <div v-if="!loading && videos.length === 0" class="empty">没有找到相关视频</div>
        </div>
      </section>

      <!-- 热搜榜来自 content-service，运营在管理端加词/重排，这里只是消费。
           名次直接用返回顺序：board 已按 rank 升序，而没重排过的榜单 rank 全是 0，
           打 i+1 比打 h.rank 靠谱。 -->
      <aside v-if="hotSearches.length" class="hot-panel">
        <div class="hot-title">热搜榜</div>
        <ol>
          <li v-for="(h, i) in hotSearches" :key="h.id" @click="goKeyword(h.keyword)">
            <span class="rank" :class="{ top: i < 3 }">{{ i + 1 }}</span>
            <span class="word">{{ h.keyword }}</span>
            <span class="heat">{{ h.heatScore }}</span>
          </li>
        </ol>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import VideoCard from '@/components/VideoCard.vue'
import { listVideos } from '@/api/video'
import { recordSearch } from '@/api/search'
import { useUserStore } from '@/store/user'
import { useDictStore } from '@/store/dict'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const dict = useDictStore()
const keyword = ref(route.query.keyword || '')
const videos = ref([])
const total = ref(0)
const loading = ref(false)
const hotSearches = computed(() => dict.hotSearches.slice(0, 10))

function goKeyword(kw) {
  router.push({ name: 'search', query: { keyword: kw } })
}

async function fetchList() {
  loading.value = true
  try {
    const page = await listVideos({ current: 1, size: 24, keyword: keyword.value })
    videos.value = page.records || []
    total.value = page.total || 0
    report()
  } catch (e) {
    videos.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

// 检索本身还没接 ES，全站词频和我的搜索历史都靠调用方回报这一次结果。
// 这个接口要求登录，而匿名调用会拿到无 body 的 401、被拦截器直接踹去登录页，
// 所以未登录就静默跳过；回报失败也不该影响搜索结果的展示。
function report() {
  if (!userStore.isLoggedIn || !keyword.value) return
  recordSearch({ keyword: keyword.value, resultCount: total.value }).catch(() => {})
}

onMounted(() => {
  fetchList()
  // 榜单拉不到就整块不渲染（v-if 在 hot-panel 上），不占位、不报错第二次
  dict.loadHotSearches().catch(() => {})
})
watch(() => route.query.keyword, (v) => {
  keyword.value = v || ''
  fetchList()
})
</script>

<style scoped>
.search-body {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}
.main {
  flex: 1;
  min-width: 0;
}
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
.hot-panel {
  width: 240px;
  flex-shrink: 0;
  background: var(--vp-card);
  border-radius: 10px;
  padding: 12px 14px;
}
.hot-title {
  font-weight: 700;
  font-size: 15px;
  margin-bottom: 6px;
  color: var(--vp-text);
}
.hot-panel ol {
  list-style: none;
  margin: 0;
  padding: 0;
}
.hot-panel li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 0;
  cursor: pointer;
  font-size: 13px;
  color: var(--vp-text-2);
}
.hot-panel li:hover .word {
  color: var(--vp-primary);
}
.rank {
  width: 16px;
  text-align: center;
  font-weight: 700;
  color: var(--vp-text-2);
}
.rank.top {
  color: var(--vp-primary);
}
.word {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--vp-text);
}
.heat {
  font-size: 12px;
  color: var(--vp-text-2);
}
@media (max-width: 900px) {
  .hot-panel {
    display: none;
  }
}
</style>
