<template>
  <div class="layout">
    <!-- 顶栏 -->
    <header class="topbar">
      <div class="topbar-inner container">
        <div class="brand" @click="goHome">
          <span class="logo">微</span>
          <span class="brand-name">微视频</span>
        </div>

        <nav class="top-nav">
          <router-link to="/" class="top-link" active-class="active">首页</router-link>
          <router-link to="/?cat=1" class="top-link">动画</router-link>
          <router-link to="/?cat=2" class="top-link">番剧</router-link>
          <router-link to="/?cat=3" class="top-link">音乐</router-link>
          <router-link to="/?cat=4" class="top-link">游戏</router-link>
          <router-link to="/?cat=5" class="top-link">科技</router-link>
        </nav>

        <div class="search-box">
          <el-input
            v-model="keyword"
            placeholder="搜索你感兴趣的视频"
            clearable
            @keyup.enter="doSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <el-button class="btn-pink search-btn" @click="doSearch">搜索</el-button>
        </div>

        <div class="actions">
          <el-button class="btn-pink upload-btn" @click="goUpload">
            <el-icon><UploadFilled /></el-icon> 投稿
          </el-button>
          <template v-if="userStore.isLoggedIn">
            <el-dropdown @command="onCommand">
              <span class="user-chip">
                <el-avatar :size="32" :src="userStore.avatarUrl">
                  {{ (userStore.nickname || 'U').charAt(0) }}
                </el-avatar>
                <span class="nickname">{{ userStore.nickname || '用户' }}</span>
              </span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="user">个人中心</el-dropdown-item>
                  <el-dropdown-item command="upload">投稿视频</el-dropdown-item>
                  <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
          <template v-else>
            <el-button text @click="goLogin">登录</el-button>
            <el-button text @click="goRegister">注册</el-button>
          </template>
        </div>
      </div>
    </header>

    <!-- 内容区 -->
    <main class="content container">
      <slot />
    </main>

    <footer class="footer">
      <div class="container">
        微视频 · 在线视频平台 Demo ｜ 后端：Spring Boot 4 + Spring Cloud Alibaba ｜ 前端：Vue 3
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/store/user'
import { ElMessageBox } from 'element-plus'

const router = useRouter()
const userStore = useUserStore()
const keyword = ref('')

function goHome() {
  router.push('/')
}
function doSearch() {
  const kw = keyword.value.trim()
  if (!kw) return
  router.push({ name: 'search', query: { keyword: kw } })
}
function goUpload() {
  router.push('/upload')
}
function goLogin() {
  router.push('/login')
}
function goRegister() {
  router.push('/register')
}
function onCommand(cmd) {
  if (cmd === 'logout') {
    ElMessageBox.confirm('确定退出登录？', '提示', { type: 'warning' })
      .then(() => {
        userStore.logout()
        router.push('/')
      })
      .catch(() => {})
  } else if (cmd === 'user') {
    router.push('/user')
  } else if (cmd === 'upload') {
    router.push('/upload')
  }
}
</script>

<style scoped>
.topbar {
  position: sticky;
  top: 0;
  z-index: 100;
  background: #fff;
  border-bottom: 1px solid var(--vp-border);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}
.topbar-inner {
  display: flex;
  align-items: center;
  height: 60px;
  gap: 20px;
}
.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  flex-shrink: 0;
}
.logo {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: var(--vp-pink);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 18px;
}
.brand-name {
  font-size: 18px;
  font-weight: 700;
  color: var(--vp-pink);
}
.top-nav {
  display: flex;
  gap: 18px;
  flex-shrink: 0;
}
.top-link {
  color: var(--vp-text-2);
  font-size: 15px;
  padding: 4px 2px;
}
.top-link.active,
.top-link:hover {
  color: var(--vp-pink);
}
.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  max-width: 420px;
}
.search-btn {
  color: #fff;
}
.actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}
.user-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  outline: none;
}
.nickname {
  color: var(--vp-text);
}
.content {
  min-height: calc(100vh - 60px - 50px);
  padding-top: 18px;
  padding-bottom: 30px;
}
.footer {
  border-top: 1px solid var(--vp-border);
  background: #fff;
  color: var(--vp-text-2);
  font-size: 13px;
  height: 50px;
  display: flex;
  align-items: center;
}
</style>
