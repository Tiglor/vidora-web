import request from '@/utils/request'

// GET /api/recommends/feed?scene=home|follow|topic&size= -> RecommendResult[]
// RecommendResult { id, userId, videoId, scene, score, algoType, isExposed, isClicked, createTime }
// 两个坑：取出的同时这些候选就被标记为已曝光（同一屏刷新两次会拿到不同的候选），
// 而且只返回 videoId，标题封面要另外查视频详情
export function getFeed(params) {
  return request.get('/recommends/feed', { params })
}

// POST /api/recommends/{id}/click -> Boolean，false 表示这条已经记过了（重复上报是幂等的，不算错误）
export function reportClick(id) {
  return request.post(`/recommends/${id}/click`)
}
