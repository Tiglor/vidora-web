import request from '@/utils/request'

// GET /api/videos/page?current=&size=&categoryId=&keyword=
// -> IPage<VideoInfo>  { records:[...], total, current, size, pages }
export function listVideos(params) {
  return request.get('/videos/page', { params })
}

// GET /api/videos/mine?current=&size= -> 当前登录用户的投稿
export function listMyVideos(params) {
  return request.get('/videos/mine', { params })
}

// GET /api/videos/{id} -> VideoInfo
export function getVideo(id) {
  return request.get(`/videos/${id}`)
}

// POST /api/videos/batch  body: [id, ...] -> VideoInfo[]
// 服务端夹到 50 个、只回存在的行、顺序不保证，
// 所以调用方要自己按 id 建映射再按原顺序取，别按下标对齐。
export function listVideosByIds(ids) {
  return request.post('/videos/batch', ids)
}

// POST /api/videos/upload (multipart, 需 video:upload) -> VideoInfo
export function uploadVideo(formData) {
  return request.post('/videos/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

// POST /api/videos/{id}/transcode (需 video:transcode) -> taskId(String)
export function submitTranscode(id) {
  return request.post(`/videos/${id}/transcode`)
}

// GET /api/videos/{id}/transcode-task -> TranscodeTask {status:0/1/2/3, progress, ...}
// 后端 transcode.enabled=false 时没有任务记录，data 就是 null（不是 status=0），取属性前先判空
export function getTranscodeTask(id) {
  return request.get(`/videos/${id}/transcode-task`)
}

// GET /api/videos/{id}/play-url -> String(m3u8 或 源文件地址)
export function getPlayUrl(id) {
  return request.get(`/videos/${id}/play-url`)
}

// GET /api/videos/{id}/download -> String(预签名/下载地址)
export function getDownloadUrl(id) {
  return request.get(`/videos/${id}/download`)
}
