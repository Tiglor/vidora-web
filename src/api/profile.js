import request from '@/utils/request'

// PUT /api/profile/theme {themeKey} -> void
// userId 由后端从 token 里取，前端不传，也没法替别人改
export function updateTheme(themeKey) {
  return request.put('/profile/theme', { themeKey })
}
