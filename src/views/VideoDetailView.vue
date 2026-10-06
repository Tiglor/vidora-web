<template>
  <div class="detail" v-loading="loading">
    <div class="top">
      <!-- 播放器 -->
      <div class="player-col">
        <VideoPlayer :src="playUrl" :poster="video.coverUrl" />
        <div v-if="!playUrl" class="no-source">
          <el-alert
            :title="sourceTip"
            type="info"
            :closable="false"
            show-icon
          />
        </div>
        <h1 class="v-title">{{ video.title }}</h1>
        <div class="v-meta">
          <span>{{ playCount }} 播放</span>
          <span>发布于 {{ publishText }}</span>
        </div>
        <div class="v-actions">
          <el-button :type="counts.liked ? 'primary' : 'default'" @click="toggleLike">
            <el-icon><Pointer /></el-icon> 点赞 {{ counts.likeCount || 0 }}
          </el-button>
          <el-button :type="counts.favorited ? 'primary' : 'default'" @click="toggleFavorite">
            <el-icon><Star /></el-icon> 收藏 {{ counts.favoriteCount || 0 }}
          </el-button>
          <el-button @click="onShare">
            <el-icon><Share /></el-icon> 分享 {{ counts.shareCount || 0 }}
          </el-button>
          <el-button v-if="playUrl" @click="download">
            <el-icon><Download /></el-icon> 下载
          </el-button>
        </div>
      </div>

      <!-- 侧栏推荐：优先 recommend-service 的候选，空则退回同分区最新视频 -->
      <aside class="side">
        <div class="side-title">相关推荐</div>
        <div v-for="r in recommends" :key="r.id" class="rec-item" @click="go(r)">
          <img :src="r.coverUrl || '/default-cover.svg'" />
          <div class="rec-info">
            <div class="rec-name text-ellipsis">{{ r.title }}</div>
            <div class="rec-meta">{{ r.playCount || 0 }} 播放</div>
          </div>
        </div>
        <div v-if="!loading && recommends.length === 0" class="rec-empty">暂无相关推荐</div>
      </aside>
    </div>

    <!-- 简介 -->
    <div class="desc card">
      <div class="desc-title">简介</div>
      <p>{{ video.description || '作者很懒，没有写简介~' }}</p>
    </div>

    <!-- 评论 -->
    <div class="comments card">
      <CommentList
        :comments="comments"
        :total="commentPage.total"
        :has-more="hasMoreComments"
        :loading="commentLoading"
        :nickname="userStore.nickname"
        :avatar-url="userStore.avatarUrl"
        @submit="onComment"
        @load-more="loadMoreComments"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import VideoPlayer from '@/components/VideoPlayer.vue'
import CommentList from '@/components/CommentList.vue'
import {
  getVideo,
  getPlayUrl,
  getDownloadUrl,
  listVideos,
  listVideosByIds
} from '@/api/video'
import { listComments, createComment } from '@/api/comment'
import { setActive, getActionCounts, reportPlay, getPlayTotals } from '@/api/interact'
import { getFeed, reportClick } from '@/api/recommend'
import { useUserStore } from '@/store/user'

// 互动动作类型，对应后端 ActionType 枚举
const ACTION_LIKE = 1
const ACTION_FAVORITE = 2
const ACTION_SHARE = 3

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const video = ref({})
const playUrl = ref('')
const loading = ref(false)
const recommends = ref([])
const comments = ref([])
const playCount = ref(0)
// 计数以 interact-service 为准：video_info 上的 play_count / like_count / share_count
// 没有跨服务事件回写（ARCHITECTURE 待完成项），只在上传时初始化过一次，长期是失真的。
// 未登录时拿不到 interact 的数据（网关白名单只放行 /api/auth/**），退回展示 VideoInfo 里的初始值。
const counts = ref({ likeCount: 0, favoriteCount: 0, shareCount: 0, liked: null, favorited: null })

const publishText = computed(() => {
  const t = video.value.publishTime
  return t ? String(t).replace('T', ' ').slice(0, 16) : '未知'
})
const sourceTip = computed(() =>
  video.value.status === 3
    ? '该视频暂无可播放地址'
    : '视频正在转码中，请稍后刷新重试'
)

async function load(id) {
  loading.value = true
  try {
    const v = await getVideo(id)
    video.value = v
    playCount.value = v.playCount || 0
    counts.value = {
      likeCount: v.likeCount || 0,
      favoriteCount: 0,
      shareCount: v.shareCount || 0,
      liked: null,
      favorited: null
    }
    playUrl.value = v.status === 3 ? await getPlayUrl(id) : ''
    await Promise.all([loadComments(id), loadInteract(id), loadRecommends(v)])
  } catch (e) {
    // 错误已由拦截器提示
  } finally {
    loading.value = false
  }
}

// 评论分页状态：只拉一页的话第 N 条评论永远看不到，所以这里维护页码并支持往下追加。
// size 取 20 而不是原来的 50：后端每条顶层评论还会预取 3 条回复（CommentServiceImpl.PREVIEW_REPLIES），
// 首屏 50 条等于一次拖回两百多条记录，而绝大多数视频根本翻不到第二页
const COMMENT_PAGE_SIZE = 20
const commentPage = ref({ current: 1, total: 0 })
const commentLoading = ref(false)
const hasMoreComments = computed(() => comments.value.length < commentPage.value.total)

async function loadComments(videoId, { append = false } = {}) {
  if (commentLoading.value) return
  commentLoading.value = true
  try {
    const next = append ? commentPage.value.current + 1 : 1
    const page = await listComments(videoId, { current: next, size: COMMENT_PAGE_SIZE })
    // 直接存 CommentView：昵称头像不在返回里（CommentView.java 类注释），展示名由组件按 userId 现算
    const records = page?.records || []
    comments.value = append ? comments.value.concat(records) : records
    commentPage.value = { current: next, total: page?.total || 0 }
  } finally {
    commentLoading.value = false
  }
}

function loadMoreComments() {
  loadComments(route.params.id, { append: true })
}

async function loadInteract(id) {
  if (!userStore.isLoggedIn) return
  try {
    // 有可播地址才算一次播放；后端有去重窗口，重复刷新不会重复计数
    if (playUrl.value) reportPlay(id).catch(() => {})
    const [totals, action] = await Promise.all([
      getPlayTotals(id),
      getActionCounts('video', id)
    ])
    if (totals) playCount.value = totals.playCount || 0
    if (action) counts.value = action
  } catch (e) {
    // 拿不到就继续用 VideoInfo 里的初始值
  }
}

// recommend_result 只由离线算法任务通过 POST /recommends/batch 写入，那个任务还没落地，
// 所以 feed 常态是空的——空则退回同分区的最新视频，别让侧栏一直白着。
async function loadRecommends(v) {
  try {
    let list = []
    if (userStore.isLoggedIn) {
      try {
        // scene 只有 home / follow / topic 三种取值，详情页侧栏归到 topic
        const feed = (await getFeed({ scene: 'topic', size: 6 })) || []
        const candidates = feed.filter((r) => r.videoId !== v.id)
        const ids = candidates.map((r) => r.videoId)
        // feed 只给 videoId，标题封面靠一次 POST /videos/batch 补齐。
        // batch 只回存在的行、顺序也不保证，所以按 id 建映射再按 feed 原顺序取，别按下标对齐。
        const details = ids.length ? (await listVideosByIds(ids)) || [] : []
        const byId = new Map(details.map((x) => [x.id, x]))
        // 记住「视频 → 推荐记录 id」，点击上报时才有东西可传给推荐服务
        const recIdByVideo = new Map(candidates.map((r) => [r.videoId, r.id]))
        list = ids
          .map((id) => byId.get(id))
          .filter(Boolean)
          .map((x) => ({ ...x, recId: recIdByVideo.get(x.id) }))
      } catch (e) {
        // feed 或批量补详情挂了也别让侧栏直接空着，落回下面同分区的最新视频
      }
    }
    if (list.length === 0) {
      const params = { current: 1, size: 7 }
      if (v.categoryId) params.categoryId = v.categoryId
      const page = await listVideos(params)
      list = (page.records || []).filter((x) => x.id !== v.id).slice(0, 6)
    }
    recommends.value = list
  } catch (e) {
    recommends.value = []
  }
}

function requireLogin() {
  if (userStore.isLoggedIn) return true
  ElMessage.warning('请先登录后再操作')
  return false
}

async function setAction(actionType, active) {
  const next = await setActive({
    targetType: 'video',
    targetId: Number(route.params.id),
    actionType,
    active
  })
  // 后端返回的是重算后的完整计数，直接覆盖，不在前端自己加减
  if (next) counts.value = next
}

async function toggleLike() {
  if (!requireLogin()) return
  try {
    await setAction(ACTION_LIKE, !counts.value.liked)
  } catch (e) {}
}
async function toggleFavorite() {
  if (!requireLogin()) return
  try {
    await setAction(ACTION_FAVORITE, !counts.value.favorited)
  } catch (e) {}
}
async function onShare() {
  if (!requireLogin()) return
  try {
    // 分享不支持取消，active 恒为 true；重复分享后端是幂等的
    await setAction(ACTION_SHARE, true)
  } catch (e) {
    return
  }
  // 复制失败不该把「这次分享已经记上了」一起吞掉
  try {
    await navigator.clipboard.writeText(window.location.href)
    ElMessage.success('分享链接已复制')
  } catch (e) {
    ElMessage.info('已记录分享，请手动复制地址栏链接')
  }
}
async function download() {
  try {
    const url = await getDownloadUrl(route.params.id)
    window.open(url, '_blank')
  } catch (e) {}
}
async function onComment(text) {
  if (!userStore.isLoggedIn) {
    ElMessage.warning('请先登录后发表评论')
    return
  }
  try {
    await createComment({ videoId: Number(route.params.id), content: text })
    // 刻意回到第一页而不是追加下一页：列表按 id 倒序，刚发的这条就在首位，
    // 追加加载反而看不见自己的评论
    await loadComments(route.params.id)
    ElMessage.success('评论已发布')
  } catch (e) {
    // 请求拦截器负责统一提示
  }
}
function go(item) {
  // 点击上报必须在跳转之前发出：路由切走后当前组件就卸载了
  if (item.recId) reportClick(item.recId).catch(() => {})
  router.push(`/video/${item.id}`)
}

onMounted(() => load(route.params.id))
watch(() => route.params.id, (id) => {
  if (id) {
    playUrl.value = ''
    comments.value = []
    commentPage.value = { current: 1, total: 0 }
    recommends.value = []
    load(id)
  }
})
</script>

<style scoped>
.detail {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.top {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}
.player-col {
  flex: 1;
  min-width: 0;
}
.v-title {
  font-size: 18px;
  margin: 12px 0 6px;
}
.v-meta {
  color: var(--vp-text-2);
  font-size: 13px;
  display: flex;
  gap: 16px;
}
.v-actions {
  margin: 12px 0 4px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.no-source {
  margin-top: 8px;
}
.side {
  width: 320px;
  flex-shrink: 0;
}
.side-title {
  font-weight: 700;
  margin-bottom: 10px;
}
.rec-item {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
  cursor: pointer;
}
.rec-item img {
  width: 120px;
  height: 68px;
  object-fit: cover;
  border-radius: 6px;
  background: #e9ebed;
}
.rec-info {
  flex: 1;
  min-width: 0;
}
.rec-name {
  font-size: 14px;
  line-height: 1.4;
}
.rec-meta {
  color: var(--vp-text-2);
  font-size: 12px;
  margin-top: 4px;
}
.rec-empty {
  color: var(--vp-text-2);
  font-size: 13px;
  padding: 20px 0;
  text-align: center;
}
.card {
  background: var(--vp-card);
  border-radius: 10px;
  padding: 16px;
}
.desc-title,
.desc p {
  margin: 0 0 8px;
}
.desc-title {
  font-weight: 700;
}
.desc p {
  color: var(--vp-text-2);
  line-height: 1.6;
}
</style>
