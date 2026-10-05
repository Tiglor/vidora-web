<template>
  <div class="user-center">
    <div class="profile card">
      <el-avatar :size="72" :src="userStore.avatarUrl">
        {{ (userStore.nickname || 'U').charAt(0) }}
      </el-avatar>
      <div class="info">
        <div class="name">{{ userStore.nickname || '用户' }}</div>
        <div class="sub">ID: {{ userStore.userId }}</div>
        <div class="tags">
          <el-tag v-for="r in userStore.roles" :key="r" size="small" type="danger">{{ r }}</el-tag>
        </div>
      </div>
      <el-button @click="logout">退出登录</el-button>
    </div>

    <div class="appearance card">
      <div class="card-title">外观设置</div>
      <div class="themes">
        <button
          v-for="t in THEME_OPTIONS"
          :key="t.key"
          type="button"
          class="swatch"
          :class="{ active: themeStore.current === t.key }"
          :style="{ background: t.color }"
          :title="t.label"
          :aria-label="t.label"
          :disabled="saving"
          @click="pickTheme(t.key)"
        />
      </div>
      <div class="hint">主题跟随账号，换设备登录也会同步</div>
    </div>

    <div class="tabs card">
      <el-tabs v-model="tab">
        <el-tab-pane label="我的投稿" name="videos">
          <div v-loading="loading" class="grid">
            <VideoCard v-for="v in myVideos" :key="v.id" :video="v" />
            <div v-if="!loading && myVideos.length === 0" class="empty">
              还没有投稿，去 <router-link to="/upload">投稿</router-link>
            </div>
          </div>
        </el-tab-pane>
        <el-tab-pane label="权限清单" name="perms">
          <div class="perms">
            <el-tag v-for="p in userStore.permissions" :key="p" class="perm">{{ p }}</el-tag>
            <span v-if="userStore.permissions.length === 0" class="empty">无特殊权限</span>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import VideoCard from '@/components/VideoCard.vue'
import { listMyVideos } from '@/api/video'
import { useUserStore } from '@/store/user'
import { useThemeStore } from '@/store/theme'
import { THEME_OPTIONS } from '@/config/themes'

const router = useRouter()
const userStore = useUserStore()
const themeStore = useThemeStore()
const tab = ref('videos')
const myVideos = ref([])
const loading = ref(false)
const saving = ref(false)

async function pickTheme(key) {
  if (key === themeStore.current || saving.value) return
  saving.value = true
  try {
    await themeStore.setTheme(key)
    ElMessage.success('主题已更新')
  } catch {
    // 不弹错误提示：request.js 的响应拦截器已经统一弹过了，这里再弹就是两条重复 toast。
    // store 在请求失败时不会落地，界面本来就没变，只需要把 saving 复位
  } finally {
    saving.value = false
  }
}

async function fetchMine() {
  loading.value = true
  try {
    const page = await listMyVideos({ current: 1, size: 24 })
    myVideos.value = page.records || []
  } finally {
    loading.value = false
  }
}

function logout() {
  ElMessageBox.confirm('确定退出登录？', '提示', { type: 'warning' })
    .then(() => {
      userStore.logout()
      router.push('/')
    })
    .catch(() => {})
}

onMounted(fetchMine)
</script>

<style scoped>
.user-center {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.card {
  background: var(--vp-card);
  border-radius: 10px;
  padding: 18px;
}
.profile {
  display: flex;
  align-items: center;
  gap: 16px;
}
.info {
  flex: 1;
}
.name {
  font-size: 18px;
  font-weight: 700;
}
.sub {
  color: var(--vp-text-2);
  font-size: 13px;
  margin: 4px 0;
}
.tags {
  display: flex;
  gap: 6px;
}
.card-title {
  font-weight: 700;
  margin-bottom: 12px;
}
.themes {
  display: flex;
  gap: 12px;
}
.swatch {
  width: 32px;
  height: 32px;
  padding: 0;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: transform 0.15s;
}
.swatch:hover:not(:disabled) {
  transform: scale(1.12);
}
.swatch:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
.swatch.active {
  /* 外圈用正文色、内圈用卡片色留白：这样即使色块本身很浅也看得出选中态 */
  border-color: var(--vp-text);
  box-shadow: inset 0 0 0 2px var(--vp-card);
}
.hint {
  margin-top: 10px;
  color: var(--vp-text-2);
  font-size: 12px;
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
  padding: 30px 0;
}
.perms {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.perm {
  font-family: monospace;
}
</style>
