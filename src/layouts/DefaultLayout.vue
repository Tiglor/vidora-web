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
          <router-link
            to="/"
            class="top-link"
            :class="{ active: route.path === '/' && !route.query.cat }"
          >首页</router-link>
          <router-link
            v-for="c in topCategories"
            :key="c.id"
            :to="{ path: '/', query: { cat: c.id } }"
            class="top-link"
            :class="{ active: isCatActive(c.id) }"
          >{{ c.name }}</router-link>
        </nav>

        <div class="search-box">
          <el-autocomplete
            v-model="keyword"
            class="search-input"
            placeholder="搜索你感兴趣的视频"
            clearable
            value-key="keyword"
            :fetch-suggestions="querySuggests"
            @keyup.enter="doSearch"
            @select="onSelectSuggest"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-autocomplete>
          <el-button type="primary" class="search-btn" @click="doSearch">搜索</el-button>
        </div>

        <div class="actions">
          <el-button type="primary" class="upload-btn" @click="goUpload">
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
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/store/user'
import { useDictStore } from '@/store/dict'
import { getSuggests } from '@/api/search'
import { ElMessageBox } from 'element-plus'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const dict = useDictStore()
const keyword = ref('')

// 顶栏只放一级分区：子分区在首页侧边栏（CategoryNav）里已经按层级展开了，
// 顶栏是横排、放不下第二层，塞满反而会把搜索框挤没。
// 最多 8 个是留给「投稿/登录」那排按钮的横向空间上限，后台新建的分类超出 8 个时
// 仍然能在侧边栏里点到，不会失联。
const topCategories = computed(() => dict.flatCategories.filter((c) => c.depth === 0).slice(0, 8))

function isCatActive(id) {
  // query 里永远是字符串，后端回来的 id 是数字，两边都转字符串比（和侧边栏同一处坑）
  return route.path === '/' && String(route.query.cat ?? '') === String(id)
}

// 在布局这一层拉一次字典：首页、搜索页、上传页共用同一份数据，
// store 里对同一请求做了在途合并，一次进站只会打网关一遍。
onMounted(() => {
  dict.loadCategories().catch(() => {})
})

// 搜索联想词接口已在网关匿名放行，访客也能使用
async function querySuggests(queryString, cb) {
  try {
    // 空前缀走后端「热门词」那一路（整份进 Redis），有前缀才查库
    const list = await getSuggests({ prefix: queryString || undefined, limit: 10 })
    cb(list || [])
  } catch (e) {
    cb([])
  }
}

function onSelectSuggest(item) {
  keyword.value = item.keyword
  doSearch()
}

// 搜索页自己没有输入框，用的就是这个顶栏框。热搜榜点进去、或者别人分享的
// ?keyword=xxx 链接打开时，结果换了而框里还是空的，看着像搜索坏了，也没法改词重搜。
// 只在带 keyword 的时候回填：离开搜索页时不清空，用户打的字留着。
watch(
  () => route.query.keyword,
  (v) => {
    if (typeof v === 'string') keyword.value = v
  },
  { immediate: true }
)

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
  background: var(--vp-card);
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
  background: var(--vp-primary);
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
  color: var(--vp-primary);
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
  color: var(--vp-primary);
}
.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  max-width: 420px;
}
/* el-autocomplete 的根是 inline-block，不像 el-input 自带 width:100%，得自己撑开 */
.search-input {
  flex: 1;
  min-width: 0;
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
  background: var(--vp-card);
  color: var(--vp-text-2);
  font-size: 13px;
  height: 50px;
  display: flex;
  align-items: center;
}
</style>
