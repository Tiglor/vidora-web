import { defineStore } from 'pinia'
import { getCategoryTree, getHotSearches } from '@/api/content'

// 分区/热搜这类字典数据，首页、上传页、搜索页都要用。
// 每个页面各拉一次的话，进一次站要打三遍网关——后端虽然有 Redis 缓存，省的是库，网络往返一次都没省。
// 所以在这里拉一次、缓存一份，三个页面共用。
//
// 只缓存 tree：/categories/tree 返回的 CategoryNode 带着 list 的全部字段（name/iconUrl/sortOrder），
// 还多了 children，一次请求就能同时喂给侧边栏（要层级）和上传页选择器（要平铺）。
export const useDictStore = defineStore('dict', {
  state: () => ({
    tree: [],
    hotSearches: [],
    categoriesLoaded: false,
    hotLoaded: false,
    // 在途请求：两个页面同时 onMounted 时共用同一个 promise，不会各发一次
    _catPromise: null,
    _hotPromise: null
  }),
  getters: {
    // 侧边栏直接用 tree；选择器要平铺，按「父-子」顺序展开，和后台的层级语义一致
    flatCategories: (state) => {
      const out = []
      const walk = (nodes, depth) => {
        nodes.forEach((n) => {
          out.push({ id: n.id, name: n.name, iconUrl: n.iconUrl, depth })
          if (n.children && n.children.length) walk(n.children, depth + 1)
        })
      }
      walk(state.tree, 0)
      return out
    },
    categoryName: (state) => (id) => {
      let found = ''
      const walk = (nodes) => {
        nodes.forEach((n) => {
          if (String(n.id) === String(id) && !found) found = n.name
          if (n.children && n.children.length) walk(n.children)
        })
      }
      walk(state.tree)
      return found
    }
  },
  actions: {
    loadCategories(force = false) {
      if (this.categoriesLoaded && !force) return Promise.resolve(this.tree)
      if (!this._catPromise) {
        this._catPromise = getCategoryTree()
          .then((nodes) => {
            this.tree = nodes || []
            this.categoriesLoaded = true
            return this.tree
          })
          .finally(() => { this._catPromise = null })
      }
      return this._catPromise
    },
    loadHotSearches(force = false) {
      if (this.hotLoaded && !force) return Promise.resolve(this.hotSearches)
      if (!this._hotPromise) {
        this._hotPromise = getHotSearches()
          .then((rows) => {
            this.hotSearches = rows || []
            this.hotLoaded = true
            return this.hotSearches
          })
          .finally(() => { this._hotPromise = null })
      }
      return this._hotPromise
    }
  }
})
