import request from '@/utils/request'

// PUT /api/actions  { targetType:'video'|'comment', targetId, actionType:1点赞|2收藏|3分享, active }
// -> ActionCounts { targetType, targetId, likeCount, favoriteCount, shareCount, liked, favorited }
// 语义是「设置成某个状态」而非「切换」，所以天然幂等；分享不支持 active=false
export function setActive(data) {
  return request.put('/actions', data)
}

// GET /api/actions/counts?targetType=&targetId= -> ActionCounts
// 未登录时 liked / favorited 是 null 而不是 false：前者点下去要先跳登录，后者是取消
export function getActionCounts(targetType, targetId) {
  return request.get('/actions/counts', { params: { targetType, targetId } })
}

// POST /api/play-counts/{videoId} -> Boolean，false 表示落在去重窗口内、本次未计数
export function reportPlay(videoId) {
  return request.post(`/play-counts/${videoId}`)
}

// GET /api/play-counts/{videoId} -> VideoTotals { videoId, playCount, likeCount, commentCount, shareCount }
// 跨天汇总的累计值，准实时（最多 60 秒缓存延迟）
export function getPlayTotals(videoId) {
  return request.get(`/play-counts/${videoId}`)
}
