<template>
  <div class="upload">
    <div class="card">
      <h2>投稿视频</h2>
      <el-alert
        v-if="!userStore.hasPermission('video:upload')"
        type="warning"
        :closable="false"
        title="当前账号无上传权限（video:upload），请联系管理员在角色中分配。"
        style="margin-bottom: 16px"
      />

      <el-form :model="form" label-width="80px" :disabled="uploading">
        <el-form-item label="标题">
          <el-input v-model="form.title" placeholder="给视频起个标题" maxlength="80" />
        </el-form-item>
        <el-form-item label="简介">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="补充视频简介"
            maxlength="500"
          />
        </el-form-item>
        <el-form-item label="分区">
          <el-select v-model="form.categoryId" placeholder="选择分区" style="width: 200px">
            <el-option
              v-for="c in categories"
              :key="c.id"
              :label="(c.depth ? '　'.repeat(c.depth) : '') + c.name"
              :value="c.id"
            />
          </el-select>
          <span v-if="!categories.length && !catLoading" class="cat-hint">
            分区没拉到（content-service 未就绪）
            <a @click="loadCategories(true)">重试</a>
          </span>
        </el-form-item>
        <el-form-item label="视频文件">
          <el-upload
            drag
            :auto-upload="false"
            :show-file-list="true"
            :limit="1"
            accept="video/*"
            :on-change="onFileChange"
            :on-remove="onFileRemove"
          >
            <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
            <div class="el-upload__text">拖拽视频到此处，或 <em>点击选择</em></div>
            <template #tip>
              <div class="el-upload__tip">支持 mp4 / mov / mkv / webm 等，上传后会自动转码为多清晰度 HLS</div>
            </template>
          </el-upload>
        </el-form-item>
      </el-form>

      <div class="actions">
        <el-button
          type="primary"
          :loading="uploading"
          :disabled="!file || !userStore.hasPermission('video:upload')"
          @click="submit"
        >
          上传并投稿
        </el-button>
      </div>
    </div>

    <!-- 转码进度 -->
    <div v-if="task" class="card progress-card">
      <div class="progress-head">
        <span>{{ task.id ? `转码任务 #${task.id}` : '转码任务已提交' }}</span>
        <el-tag :type="statusTag.type">{{ statusTag.text }}</el-tag>
      </div>
      <el-progress
        :percentage="task.progress || 0"
        :status="task.status === 2 ? 'success' : task.status === 3 ? 'exception' : ''"
      />
      <p v-if="task.errorMsg" class="err">{{ task.errorMsg }}</p>
      <p v-if="pollNote" class="warn">{{ pollNote }}</p>
      <p v-if="task.status === 2" class="ok">
        转码完成！<router-link :to="`/video/${task.videoId}`">前往播放页 →</router-link>
      </p>
      <p v-else-if="task.status === null" class="ok">
        当前未开启转码，源文件可直接播放。<router-link :to="`/video/${task.videoId}`">前往播放页 →</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import { uploadVideo, getTranscodeTask } from '@/api/video'
import { useUserStore } from '@/store/user'
import { useDictStore } from '@/store/dict'

const router = useRouter()
const userStore = useUserStore()
const dict = useDictStore()

// 分区来自 content_category，写死的 1-7 早就和管理端可能改过的数据脱钩了。
// depth 用来在下拉里缩进，让子分区看得出归属。
const categories = computed(() => dict.flatCategories)

// 不预选 categoryId：默认值 1 是个假设，后台把 1 改名或删掉之后，
// 投稿会静默挂到一个不存在/不合适的分区上，而界面永远显示「动画」。
const form = reactive({ title: '', description: '', categoryId: null })
const file = ref(null)
const uploading = ref(false)
const task = ref(null)
/** 轮询放弃的原因（超时/连续查不到），空串表示还在轮询 */
const pollNote = ref('')
let timer = null

// 轮询的两个兜底：转码节点挂掉时任务会永远停在 status=1，网关不通时每次请求都失败，
// 两种情况都不该让一个开着的标签页每 3 秒打一次后端打到天荒地老。
const POLL_TIMEOUT_MS = 5 * 60 * 1000
const MAX_POLL_FAILURES = 3
let pollDeadline = 0
let pollFailures = 0

const statusTag = computed(() => {
  // video_transcode_task.status 只有 0-待处理 1-处理中 2-成功 3-失败（见 vidora-cloud SQL/vidora_cloud.sql 第三节的列注释），
  // 之前这里多写了一个 4，是照着 video_info.status 的档位串了台
  const map = {
    0: { text: '待处理', type: 'info' },
    1: { text: '转码中', type: 'warning' },
    2: { text: '成功', type: 'success' },
    3: { text: '失败', type: 'danger' }
  }
  // status 为 null 是前端自己标的终态：这次投稿没有转码任务（后端没开启转码）
  if (task.value?.status === null) return { text: '未转码', type: 'info' }
  return map[task.value?.status] || { text: '未知', type: 'info' }
})

function onFileChange(uploadFile) {
  file.value = uploadFile.raw
}
function onFileRemove() {
  file.value = null
}

async function submit() {
  if (!file.value) {
    ElMessage.warning('请先选择视频文件')
    return
  }
  if (!form.title) {
    ElMessage.warning('请填写标题')
    return
  }
  if (!form.categoryId) {
    ElMessage.warning('请选择分区')
    return
  }
  const fd = new FormData()
  fd.append('file', file.value)
  fd.append('title', form.title)
  fd.append('description', form.description || '')
  // 后端是 @RequestParam(required = false) Long categoryId：传字符串 "null" 会在类型转换上炸 400。
  // 上面已经把没选分区的情况挡掉了，所以这里 append 的永远是真实 id
  fd.append('categoryId', form.categoryId)

  uploading.value = true
  try {
    const v = await uploadVideo(fd)
    ElMessage.success('上传成功，开始转码')
    startPolling(v.id)
  } catch (e) {
    // 拦截器已提示
  } finally {
    uploading.value = false
  }
}

function startPolling(videoId) {
  task.value = { videoId, status: 0, progress: 0 }
  pollNote.value = ''
  pollDeadline = Date.now() + POLL_TIMEOUT_MS
  pollFailures = 0
  poll(videoId)
  timer = setInterval(() => poll(videoId), 3000)
}
function stopPolling() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

async function poll(videoId) {
  if (Date.now() > pollDeadline) {
    stopPolling()
    pollNote.value = '超过 5 分钟还没等到转码结果，可能是转码节点没起来。可以先离开这页，稍后到「我的」里看这条投稿。'
    return
  }
  try {
    const t = await getTranscodeTask(videoId)
    pollFailures = 0
    // 后端 transcode.enabled=false 时根本不会建任务，这个接口回的是 null data。
    // 不认出来就会每 3 秒空轮询到页面卸载，进度卡永远停在「未知」，
    // 而视频其实已经可以播了（play-url 在没有 m3u8 时直接回源文件地址）。
    if (!t) {
      stopPolling()
      task.value = { videoId, status: null, progress: 100 }
      return
    }
    task.value = { ...t, videoId }
    if (t.status === 2 || t.status === 3) {
      stopPolling()
    }
  } catch (e) {
    // 单次失败（网关抖动）等下一轮就行，连着失败就别再打了
    if (++pollFailures >= MAX_POLL_FAILURES) {
      stopPolling()
      pollNote.value = '连续几次都查不到转码状态，后端可能不可用。稍后到「我的」里看这条投稿的结果。'
    }
  }
}

const catLoading = ref(false)
function loadCategories(force = false) {
  catLoading.value = true
  return dict.loadCategories(force)
    .catch(() => {})
    .finally(() => { catLoading.value = false })
}

// 不 force：顶栏挂载时已经拉过一次，store 里有在途合并，这里只会命中缓存或复用同一次请求。
// 只有点「重试」才强制重新拉。
onMounted(() => loadCategories())

onBeforeUnmount(() => {
  stopPolling()
})
</script>

<style scoped>
.upload {
  max-width: 720px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.card {
  background: var(--vp-card);
  border-radius: 10px;
  padding: 20px;
}
.card h2 {
  margin: 0 0 16px;
}
.actions {
  text-align: right;
}
.progress-card {
  border: 1px solid var(--vp-border);
}
.progress-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-weight: 600;
}
.err {
  /* 错误提示必须恒为红色，不能跟着主题走，否则会丢掉「红=出错」的含义 */
  color: var(--el-color-danger);
  font-size: 13px;
  margin: 8px 0 0;
}
.warn {
  /* 轮询放弃不等于转码失败，用警示色而不是红：视频可能只是慢，红会让人以为投稿废了 */
  color: var(--el-color-warning);
  font-size: 13px;
  margin: 8px 0 0;
}
.ok {
  margin: 8px 0 0;
}
.cat-hint {
  margin-left: 10px;
  font-size: 12px;
  color: var(--vp-text-2);
}
.cat-hint a {
  color: var(--vp-primary);
  cursor: pointer;
  text-decoration: underline;
}
</style>
