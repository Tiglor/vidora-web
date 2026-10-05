import request from '@/utils/request'

// 分区和热搜都是管理端能改的数据（content-service），前端只读。
// 这两个接口在网关的匿名 GET 清单里（PUBLIC_GET_PATHS），访客进首页就要用到，所以不要求登录。

// GET /api/categories/list -> Category[] 平铺的启用分类，按 sortOrder、id 升序
// 后端整份走 Redis 缓存，任何一次增改都整体失效
export function listCategories() {
  return request.get('/categories/list')
}

// GET /api/categories/tree -> CategoryNode[] 同一批数据的嵌套结构
// 父级被禁用时这一支会被提到根上而不是消失，所以树的条数可能比肉眼预期的多
export function getCategoryTree() {
  return request.get('/categories/tree')
}

// GET /api/hot-searches?date=YYYY-MM-DD -> HotSearch[] 当天的上线词，按 rank 升序
// 不传 date 就是今天；rank 由服务端重排算出，前端只负责按返回顺序展示
export function getHotSearches(date) {
  return request.get('/hot-searches', { params: date ? { date } : {} })
}
