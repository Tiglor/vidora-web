import request from '@/utils/request'

// POST /api/auth/login  {phone,password} -> LoginVO
export function login(phone, password) {
  return request.post('/auth/login', { phone, password })
}

// POST /api/auth/register {phone,password,nickname} -> Long(userId)
export function register(phone, password, nickname) {
  return request.post('/auth/register', { phone, password, nickname })
}
