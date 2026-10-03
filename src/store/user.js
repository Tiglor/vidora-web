import { defineStore } from 'pinia'
import { login as apiLogin, register as apiRegister } from '@/api/auth'

const TOKEN_KEY = 'vp_token'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: localStorage.getItem(TOKEN_KEY) || '',
    userId: Number(localStorage.getItem('vp_userId') || 0) || null,
    nickname: localStorage.getItem('vp_nickname') || '',
    avatarUrl: localStorage.getItem('vp_avatarUrl') || '',
    roles: JSON.parse(localStorage.getItem('vp_roles') || '[]'),
    permissions: JSON.parse(localStorage.getItem('vp_permissions') || '[]')
  }),
  getters: {
    isLoggedIn: (state) => !!state.token,
    hasPermission: (state) => (perm) => state.permissions.includes(perm)
  },
  actions: {
    async login(phone, password) {
      const vo = await apiLogin(phone, password)
      this._setSession(vo)
      return vo
    },
    async register(phone, password, nickname) {
      return await apiRegister(phone, password, nickname)
    },
    _setSession(vo) {
      this.token = vo.token
      this.userId = vo.userId
      this.nickname = vo.nickname
      this.avatarUrl = vo.avatarUrl
      this.roles = vo.roles || []
      this.permissions = vo.permissions || []
      localStorage.setItem(TOKEN_KEY, vo.token)
      localStorage.setItem('vp_userId', vo.userId)
      localStorage.setItem('vp_nickname', vo.nickname || '')
      localStorage.setItem('vp_avatarUrl', vo.avatarUrl || '')
      localStorage.setItem('vp_roles', JSON.stringify(this.roles))
      localStorage.setItem('vp_permissions', JSON.stringify(this.permissions))
    },
    logout() {
      this.token = ''
      this.userId = null
      this.nickname = ''
      this.avatarUrl = ''
      this.roles = []
      this.permissions = []
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem('vp_userId')
      localStorage.removeItem('vp_nickname')
      localStorage.removeItem('vp_avatarUrl')
      localStorage.removeItem('vp_roles')
      localStorage.removeItem('vp_permissions')
    }
  }
})
