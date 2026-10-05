import axios from 'axios'
import { ElMessage } from 'element-plus'
import router from '@/router'
import { useUserStore } from '@/store/user'

const baseURL = import.meta.env.VITE_API_BASE || '/api'

const request = axios.create({
  baseURL,
  timeout: 15000
})

// 请求拦截：注入 JWT
request.interceptors.request.use((config) => {
  const token = localStorage.getItem('vp_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 同一条错误在 1.5s 内只弹一次：首页一进来就并发拉列表和分区，后端没起时会叠出两三条一样的 toast
let lastMsg = ''
let lastAt = 0
function notifyError(message) {
  const now = Date.now()
  if (message === lastMsg && now - lastAt < 1500) return
  lastMsg = message
  lastAt = now
  ElMessage.error(message)
}

// 响应拦截：统一拆 ApiResult（{code,message,data}），code=200 为成功
request.interceptors.response.use(
  (resp) => {
    const body = resp.data
    // 兼容直接返回纯数据（如 string URL）的情况
    if (body && typeof body === 'object' && 'code' in body) {
      if (body.code !== 200) {
        notifyError(body.message || '请求失败')
        return Promise.reject(new Error(body.message || '业务错误'))
      }
      return body.data
    }
    return body
  },
  (error) => {
    const status = error.response?.status
    const msg = error.response?.data?.message || error.message
    if (status === 401) {
      const userStore = useUserStore()
      userStore.logout()
      notifyError('登录已失效，请重新登录')
      router.replace({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } })
    } else if (status === 403) {
      notifyError(msg || '无权限访问（请联系管理员分配权限）')
    } else {
      notifyError(msg || '网络错误')
    }
    return Promise.reject(error)
  }
)

export default request
