import request from '@/utils/request'

// GET /api/comments/video/{videoId} -> 分页 CommentView
// CommentView 只有 userId，昵称头像后端刻意不给（CommentView.java 类注释：补全要一次批量查询）
export function listComments(videoId, params = {}) {
  return request.get(`/comments/video/${videoId}`, { params })
}

// POST /api/comments
export function createComment(data) {
  return request.post('/comments', data)
}
