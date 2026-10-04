import request from '@/utils/request'

// 搜索联想词（/api/search/suggests）已在网关匿名放行，访客可直接调用。

// POST /api/search/record  { keyword, resultCount } -> void
// 回报一次搜索：写我的历史 + 当天全站词频。resultCount 参与「搜的人多但结果常年为 0」的内容缺口分析。
// 检索本身还没接 ES，所以由调用方在拿到结果之后回报；ES 接上后这个对外入口会撤掉。
export function recordSearch(data) {
  return request.post('/search/record', data)
}

// GET /api/search/suggests?prefix=&limit= -> SearchSuggest[] { id, keyword, weight, source, status }
// prefix 为空返回按权重排的热门词（整份进 Redis），有前缀按前缀查库；limit 服务端会夹到上限
export function getSuggests(params) {
  return request.get('/search/suggests', { params })
}
