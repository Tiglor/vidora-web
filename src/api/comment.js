import request from '@/utils/request'

// GET /api/comments/video/{videoId}
export function listComments(videoId, params = {}) {
  return request.get(`/comments/video/${videoId}`, { params })
}

// POST /api/comments
export function createComment(data) {
  return request.post('/comments', data)
}
