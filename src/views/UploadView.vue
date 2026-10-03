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
            <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
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
          class="btn-pink"
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
        <span>转码任务 #{{ task.id }}</span>
        <el-tag :type="statusTag.type">{{ statusTag.text }}</el-tag>
      </div>
      <el-progress
        :percentage="task.progress || 0"
        :status="task.status === 3 ? 'success' : task.status === 4 ? 'exception' : ''"
      />
      <p v-if="task.errorMsg" class="err">{{ task.errorMsg }}</p>
      <p v-if="task.status === 2" class="ok">
        转码完成！<router-link :to="`/video/${task.videoId}`">前往播放页 →</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import { uploadVideo, getTranscodeTask } from '@/api/video'
import { useUserStore } from '@/store/user'

const router = useRouter()
const userStore = useUserStore()

const categories = [
  { id: 1, name: '动画' },
  { id: 2, name: '番剧' },
  { id: 3, name: '音乐' },
  { id: 4, name: '游戏' },
  { id: 5, name: '科技' },
  { id: 6, name: '生活' },
  { id: 7, name: '影视' }
]

const form = reactive({ title: '', description: '', categoryId: 1 })
const file = ref(null)
const uploading = ref(false)
const task = ref(null)
let timer = null

const statusTag = computed(() => {
  const map = {
    0: { text: '待处理', type: 'info' },
    1: { text: '转码中', type: 'warning' },
    2: { text: '成功', type: 'success' },
    3: { text: '失败', type: 'danger' },
    4: { text: '失败', type: 'danger' }
  }
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
  const fd = new FormData()
  fd.append('file', file.value)
  fd.append('title', form.title)
  fd.append('description', form.description || '')
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
  poll(videoId)
  timer = setInterval(() => poll(videoId), 3000)
}
async function poll(videoId) {
  try {
    const t = await getTranscodeTask(videoId)
    task.value = { ...t, videoId }
    if (t.status === 2 || t.status === 3 || t.status === 4) {
      clearInterval(timer)
      timer = null
    }
  } catch (e) {}
}

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
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
  color: var(--vp-pink-dark);
  font-size: 13px;
  margin: 8px 0 0;
}
.ok {
  margin: 8px 0 0;
}
</style>
