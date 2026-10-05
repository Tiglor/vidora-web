import { defineStore } from 'pinia'
import { DEFAULT_THEME, normalizeThemeKey } from '@/config/themes'
import { updateTheme as apiUpdateTheme } from '@/api/profile'

const THEME_KEY = 'vp_theme'

/**
 * 只管「当前是哪个主题」以及把它落到 <html data-theme>。
 * 色值全在 CSS 里（main.css 的 :root + themes.css 的 [data-theme] 块），
 * 这里不做任何颜色计算，所以切换是零成本的。
 */
export const useThemeStore = defineStore('theme', {
  state: () => ({
    current: normalizeThemeKey(localStorage.getItem(THEME_KEY) || DEFAULT_THEME)
  }),
  actions: {
    _apply(key) {
      this.current = key
      localStorage.setItem(THEME_KEY, key)
      document.documentElement.dataset.theme = key
    },
    /**
     * 用户在界面上点的：先写服务端，成功了才落地。
     * 反过来的顺序（先变再存）在请求失败时会留下「界面是粉的、账号里是蓝的」，
     * 下次登录又被拽回去，看起来像主题丢了。
     */
    async setTheme(key) {
      const next = normalizeThemeKey(key)
      await apiUpdateTheme(next)
      this._apply(next)
    },
    /** 登录返回的主题。token 刚拿到，不需要也不应该再 PUT 一次 */
    adoptFromServer(key) {
      this._apply(normalizeThemeKey(key || DEFAULT_THEME))
    },
    /**
     * 退出登录：主题跟着账号走，账号没了就回默认。
     *
     * _apply 里会把刚 removeItem 的键又写回默认值，这是有意的 ——
     * 缓存和 data-theme 必须同步，否则下一个人在这台机器上打开页面时
     * 会先看到上一个人的主题，直到登录才被纠正。
     */
    reset() {
      localStorage.removeItem(THEME_KEY)
      this._apply(DEFAULT_THEME)
    }
  }
})
